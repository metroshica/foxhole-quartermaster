"""Production MCP tools - list, get, create, and update production orders."""

import json
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..db.session import get_session
from ..db.models import (
    ProductionOrder,
    ProductionOrderItem,
    ProductionOrderTargetStockpile,
    ProductionContribution,
    Stockpile,
    User,
)
from ..foxhole.items import get_item_display_name
from ..foxhole.formatters import format_relative_time, get_priority_label, format_duration

if TYPE_CHECKING:
    from ..server import McpServer


def register_production_tools(server: "McpServer") -> None:
    """Register production-related MCP tools."""

    async def list_production_orders(args: dict[str, Any]) -> dict[str, Any]:
        """List production orders, optionally filtered by status."""
        regiment_id = args["regimentId"]
        status = args.get("status")
        is_mpf = args.get("isMpf")
        is_standing_order = args.get("isStandingOrder")
        limit = args.get("limit", 20)

        async with get_session() as session:
            query = (
                select(ProductionOrder)
                .options(
                    selectinload(ProductionOrder.items),
                    selectinload(ProductionOrder.createdBy),
                    selectinload(ProductionOrder.targetStockpiles).selectinload(
                        ProductionOrderTargetStockpile.stockpile
                    ),
                )
                .where(ProductionOrder.regimentId == regiment_id)
                .where(ProductionOrder.archivedAt == None)
                .order_by(ProductionOrder.priority.desc(), ProductionOrder.createdAt.desc())
                .limit(limit)
            )

            if status:
                query = query.where(ProductionOrder.status == status)
            if is_mpf is not None:
                query = query.where(ProductionOrder.isMpf == is_mpf)
            if is_standing_order is not None:
                query = query.where(ProductionOrder.isStandingOrder == is_standing_order)

            orders_result = await session.execute(query)
            orders = orders_result.scalars().all()

        result = []
        for order in orders:
            # Calculate progress
            total_required = sum(item.quantityRequired for item in order.items)
            total_produced = sum(item.quantityProduced for item in order.items)
            progress_percent = round((total_produced / total_required) * 100) if total_required > 0 else 0

            # MPF timer info
            mpf_status = None
            time_remaining = None
            if order.isMpf and order.mpfReadyAt:
                now = datetime.utcnow()
                if order.mpfReadyAt > now:
                    mpf_status = "in_production"
                    time_remaining = format_duration(int((order.mpfReadyAt - now).total_seconds() * 1000))
                else:
                    mpf_status = "ready"

            result.append({
                "id": order.id,
                "shortId": order.shortId,
                "name": order.name,
                "description": order.description,
                "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                "priority": order.priority,
                "priorityLabel": get_priority_label(order.priority),
                "isMpf": order.isMpf,
                "isStandingOrder": order.isStandingOrder,
                "warNumber": order.warNumber,
                "mpfStatus": mpf_status,
                "mpfReadyAt": order.mpfReadyAt.isoformat() if order.mpfReadyAt else None,
                "timeRemaining": time_remaining,
                "createdBy": order.createdBy.name if order.createdBy else "Unknown",
                "createdAt": order.createdAt.isoformat(),
                "createdRelative": format_relative_time(order.createdAt),
                "totalRequired": total_required,
                "totalProduced": total_produced,
                "progressPercent": progress_percent,
                "itemCount": len(order.items),
                "targetStockpiles": [
                    {
                        "id": ts.stockpile.name,
                        "location": f"{ts.stockpile.hex} - {ts.stockpile.name}",
                    }
                    for ts in order.targetStockpiles
                ],
            })

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "orderCount": len(result),
                        "orders": result,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "list_production_orders",
        "List production orders, optionally filtered by status. Excludes archived orders by default.",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "status": {
                "type": "string",
                "description": "Filter by status: PENDING, IN_PROGRESS, READY_FOR_PICKUP, COMPLETED, CANCELLED, FULFILLED",
            },
            "isMpf": {
                "type": "boolean",
                "description": "Filter for MPF orders only",
            },
            "isStandingOrder": {
                "type": "boolean",
                "description": "Filter for standing orders (stockpile minimums) only",
            },
            "limit": {
                "type": "integer",
                "description": "Max orders to return",
                "default": 20,
            },
        },
        list_production_orders,
    )

    async def get_production_order(args: dict[str, Any]) -> dict[str, Any]:
        """Get detailed production order with all items and progress."""
        regiment_id = args["regimentId"]
        order_id = args.get("orderId")
        short_id = args.get("shortId")

        if not order_id and not short_id:
            return {
                "content": [
                    {"type": "text", "text": json.dumps({"error": "Either orderId or shortId is required"})},
                ],
                "isError": True,
            }

        async with get_session() as session:
            query = (
                select(ProductionOrder)
                .options(
                    selectinload(ProductionOrder.items),
                    selectinload(ProductionOrder.createdBy),
                    selectinload(ProductionOrder.targetStockpiles).selectinload(
                        ProductionOrderTargetStockpile.stockpile
                    ),
                    selectinload(ProductionOrder.deliveryStockpile),
                    selectinload(ProductionOrder.linkedStockpile),
                )
                .where(ProductionOrder.regimentId == regiment_id)
            )

            if order_id:
                query = query.where(ProductionOrder.id == order_id)
            if short_id:
                query = query.where(ProductionOrder.shortId == short_id)

            order_result = await session.execute(query.limit(1))
            order = order_result.scalar()

            if not order:
                return {
                    "content": [
                        {"type": "text", "text": json.dumps({"error": "Production order not found"})},
                    ],
                    "isError": True,
                }

        items = sorted(order.items, key=lambda x: x.quantityRequired, reverse=True)
        items_data = [
            {
                "itemCode": item.itemCode,
                "displayName": get_item_display_name(item.itemCode),
                "quantityRequired": item.quantityRequired,
                "quantityProduced": item.quantityProduced,
                "remaining": item.quantityRequired - item.quantityProduced,
                "progressPercent": round((item.quantityProduced / item.quantityRequired) * 100),
            }
            for item in items
        ]

        total_required = sum(item.quantityRequired for item in items)
        total_produced = sum(item.quantityProduced for item in items)

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "id": order.id,
                        "shortId": order.shortId,
                        "name": order.name,
                        "description": order.description,
                        "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                        "priority": order.priority,
                        "priorityLabel": get_priority_label(order.priority),
                        "isMpf": order.isMpf,
                        "isStandingOrder": order.isStandingOrder,
                        "warNumber": order.warNumber,
                        "linkedStockpileId": order.linkedStockpileId,
                        "linkedStockpile": (
                            {
                                "id": order.linkedStockpile.id,
                                "name": order.linkedStockpile.name,
                                "location": f"{order.linkedStockpile.hex} - {order.linkedStockpile.name}",
                            }
                            if order.linkedStockpile
                            else None
                        ),
                        "mpfSubmittedAt": order.mpfSubmittedAt.isoformat() if order.mpfSubmittedAt else None,
                        "mpfReadyAt": order.mpfReadyAt.isoformat() if order.mpfReadyAt else None,
                        "createdBy": order.createdBy.name if order.createdBy else "Unknown",
                        "createdAt": order.createdAt.isoformat(),
                        "completedAt": order.completedAt.isoformat() if order.completedAt else None,
                        "deliveredAt": order.deliveredAt.isoformat() if order.deliveredAt else None,
                        "deliveryStockpile": (
                            f"{order.deliveryStockpile.hex} - {order.deliveryStockpile.name}"
                            if order.deliveryStockpile
                            else None
                        ),
                        "totalRequired": total_required,
                        "totalProduced": total_produced,
                        "progressPercent": round((total_produced / total_required) * 100) if total_required > 0 else 0,
                        "items": items_data,
                        "targetStockpiles": [
                            {
                                "id": ts.stockpile.id,
                                "name": ts.stockpile.name,
                                "location": f"{ts.stockpile.hex} - {ts.stockpile.name}",
                            }
                            for ts in order.targetStockpiles
                        ],
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "get_production_order",
        "Get detailed production order with all items and progress",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "orderId": {
                "type": "string",
                "description": "Production order ID",
            },
            "shortId": {
                "type": "string",
                "description": "Short ID for the order",
            },
        },
        get_production_order,
    )

    async def create_production_order(args: dict[str, Any]) -> dict[str, Any]:
        """Create a new production order."""
        regiment_id = args["regimentId"]
        user_id = args["userId"]
        name = args["name"]
        description = args.get("description")
        priority = args.get("priority", 1)
        is_mpf = args.get("isMpf", False)
        items = args["items"]
        target_stockpile_ids = args.get("targetStockpileIds", [])

        async with get_session() as session:
            # Verify user exists
            user_result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar()
            if not user:
                return {
                    "content": [
                        {"type": "text", "text": json.dumps({"error": "User not found"})},
                    ],
                    "isError": True,
                }

            # Create order
            order = ProductionOrder(
                id=str(uuid.uuid4()),
                regimentId=regiment_id,
                name=name,
                description=description,
                priority=priority,
                isMpf=is_mpf,
                createdById=user_id,
            )
            session.add(order)

            # Create items
            for item in items:
                order_item = ProductionOrderItem(
                    id=str(uuid.uuid4()),
                    orderId=order.id,
                    itemCode=item["itemCode"],
                    quantityRequired=item["quantity"],
                )
                session.add(order_item)

            # Create target stockpile links
            for stockpile_id in target_stockpile_ids:
                target = ProductionOrderTargetStockpile(
                    id=str(uuid.uuid4()),
                    orderId=order.id,
                    stockpileId=stockpile_id,
                )
                session.add(target)

            await session.commit()

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "success": True,
                        "orderId": order.id,
                        "shortId": order.shortId,
                        "name": order.name,
                        "itemCount": len(items),
                        "totalQuantity": sum(item["quantity"] for item in items),
                        "isMpf": order.isMpf,
                        "targetStockpiles": target_stockpile_ids,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "create_production_order",
        "Create a new production order",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "userId": {
                "type": "string",
                "description": "User ID creating the order",
                "required": True,
            },
            "name": {
                "type": "string",
                "description": "Order name",
                "required": True,
            },
            "description": {
                "type": "string",
                "description": "Order description",
            },
            "priority": {
                "type": "integer",
                "description": "0=Low, 1=Medium, 2=High, 3=Critical",
                "default": 1,
            },
            "isMpf": {
                "type": "boolean",
                "description": "Whether this is an MPF order",
                "default": False,
            },
            "items": {
                "type": "array",
                "description": "Items to produce",
                "required": True,
            },
            "targetStockpileIds": {
                "type": "array",
                "description": "Target stockpile IDs",
            },
        },
        create_production_order,
    )

    async def update_production_progress(args: dict[str, Any]) -> dict[str, Any]:
        """Update quantity produced for items in an order."""
        regiment_id = args["regimentId"]
        order_id = args["orderId"]
        user_id = args["userId"]
        items = args["items"]

        async with get_session() as session:
            # Verify order belongs to regiment
            order_result = await session.execute(
                select(ProductionOrder)
                .options(selectinload(ProductionOrder.items))
                .where(ProductionOrder.id == order_id)
                .where(ProductionOrder.regimentId == regiment_id)
            )
            order = order_result.scalar()

            if not order:
                return {
                    "content": [
                        {"type": "text", "text": json.dumps({"error": "Order not found"})},
                    ],
                    "isError": True,
                }

            # Update each item
            for update in items:
                item_code = update["itemCode"]
                new_quantity = update["quantityProduced"]

                order_item = next(
                    (i for i in order.items if i.itemCode == item_code),
                    None,
                )
                if order_item:
                    previous_quantity = order_item.quantityProduced
                    delta = new_quantity - previous_quantity

                    order_item.quantityProduced = new_quantity

                    # Record contribution if positive delta
                    if delta > 0:
                        contribution = ProductionContribution(
                            id=str(uuid.uuid4()),
                            orderId=order_id,
                            itemCode=item_code,
                            userId=user_id,
                            quantity=delta,
                            warNumber=0,  # Would need to track current war number
                        )
                        session.add(contribution)

            # Check if order is complete and update status
            await session.flush()

            all_complete = all(
                item.quantityProduced >= item.quantityRequired
                for item in order.items
            )
            any_started = any(
                item.quantityProduced > 0
                for item in order.items
            )

            new_status = order.status
            if all_complete and not order.isMpf:
                order.status = "COMPLETED"
                order.completedAt = datetime.utcnow()
            elif any_started and str(order.status) == "PENDING":
                order.status = "IN_PROGRESS"

            await session.commit()

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "success": True,
                        "orderId": order_id,
                        "updatedItems": len(items),
                        "newStatus": str(order.status.value if hasattr(order.status, 'value') else order.status),
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "update_production_progress",
        "Update quantity produced for items in an order",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "orderId": {
                "type": "string",
                "description": "Production order ID",
                "required": True,
            },
            "userId": {
                "type": "string",
                "description": "User ID making the update",
                "required": True,
            },
            "items": {
                "type": "array",
                "description": "Items with updated quantities",
                "required": True,
            },
        },
        update_production_progress,
    )
