"""Operations MCP tools - list, get, deficit, and create operations."""

import json
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from ..db.session import get_session
from ..db.models import Operation, OperationRequirement, Stockpile, StockpileItem, User
from ..foxhole.items import get_item_display_name
from ..foxhole.formatters import format_relative_time, get_priority_label, format_date

if TYPE_CHECKING:
    from ..server import McpServer


def register_operation_tools(server: "McpServer") -> None:
    """Register operation-related MCP tools."""

    async def list_operations(args: dict[str, Any]) -> dict[str, Any]:
        """List operations, optionally filtered by status."""
        regiment_id = args["regimentId"]
        status = args.get("status")
        limit = args.get("limit", 20)

        async with get_session() as session:
            query = (
                select(Operation)
                .options(
                    selectinload(Operation.createdBy),
                    selectinload(Operation.requirements),
                    selectinload(Operation.destinationStockpile),
                )
                .where(Operation.regimentId == regiment_id)
                .order_by(Operation.scheduledFor.asc(), Operation.createdAt.desc())
                .limit(limit)
            )

            if status:
                query = query.where(Operation.status == status)

            operations_result = await session.execute(query)
            operations = operations_result.scalars().all()

        result = []
        for op in operations:
            total_requirements = sum(req.quantity for req in op.requirements)

            result.append({
                "id": op.id,
                "name": op.name,
                "description": op.description,
                "status": op.status.value if hasattr(op.status, 'value') else str(op.status),
                "location": op.location,
                "scheduledFor": op.scheduledFor.isoformat() if op.scheduledFor else None,
                "scheduledForDisplay": format_date(op.scheduledFor) if op.scheduledFor else None,
                "scheduledEndAt": op.scheduledEndAt.isoformat() if op.scheduledEndAt else None,
                "createdBy": op.createdBy.name if op.createdBy else "Unknown",
                "createdAt": op.createdAt.isoformat(),
                "createdRelative": format_relative_time(op.createdAt),
                "requirementCount": len(op.requirements),
                "totalRequiredItems": total_requirements,
                "destinationStockpile": (
                    f"{op.destinationStockpile.hex} - {op.destinationStockpile.name}"
                    if op.destinationStockpile
                    else None
                ),
            })

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "operationCount": len(result),
                        "operations": result,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "list_operations",
        "List operations, optionally filtered by status",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "status": {
                "type": "string",
                "description": "Filter by status: PLANNING, ACTIVE, COMPLETED, CANCELLED",
            },
            "limit": {
                "type": "integer",
                "description": "Max operations to return",
                "default": 20,
            },
        },
        list_operations,
    )

    async def get_operation(args: dict[str, Any]) -> dict[str, Any]:
        """Get detailed operation information including requirements."""
        regiment_id = args["regimentId"]
        operation_id = args["operationId"]

        async with get_session() as session:
            query = (
                select(Operation)
                .options(
                    selectinload(Operation.createdBy),
                    selectinload(Operation.requirements),
                    selectinload(Operation.destinationStockpile),
                )
                .where(Operation.id == operation_id)
                .where(Operation.regimentId == regiment_id)
            )

            operation_result = await session.execute(query)
            operation = operation_result.scalar()

            if not operation:
                return {
                    "content": [
                        {"type": "text", "text": json.dumps({"error": "Operation not found"})},
                    ],
                    "isError": True,
                }

        requirements = sorted(operation.requirements, key=lambda x: x.priority, reverse=True)
        requirements_data = [
            {
                "itemCode": req.itemCode,
                "displayName": get_item_display_name(req.itemCode),
                "quantity": req.quantity,
                "priority": req.priority,
                "priorityLabel": get_priority_label(req.priority),
            }
            for req in requirements
        ]

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "id": operation.id,
                        "name": operation.name,
                        "description": operation.description,
                        "status": operation.status.value if hasattr(operation.status, 'value') else str(operation.status),
                        "location": operation.location,
                        "scheduledFor": operation.scheduledFor.isoformat() if operation.scheduledFor else None,
                        "scheduledEndAt": operation.scheduledEndAt.isoformat() if operation.scheduledEndAt else None,
                        "createdBy": operation.createdBy.name if operation.createdBy else "Unknown",
                        "createdAt": operation.createdAt.isoformat(),
                        "destinationStockpile": (
                            {
                                "id": operation.destinationStockpile.id,
                                "name": operation.destinationStockpile.name,
                                "location": f"{operation.destinationStockpile.hex} - {operation.destinationStockpile.locationName}",
                            }
                            if operation.destinationStockpile
                            else None
                        ),
                        "requirements": requirements_data,
                        "totalRequiredItems": sum(req.quantity for req in requirements),
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "get_operation",
        "Get detailed operation information including requirements",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "operationId": {
                "type": "string",
                "description": "Operation ID",
                "required": True,
            },
        },
        get_operation,
    )

    async def get_operation_deficit(args: dict[str, Any]) -> dict[str, Any]:
        """Get operation requirements compared against current inventory to show deficits."""
        regiment_id = args["regimentId"]
        operation_id = args["operationId"]

        async with get_session() as session:
            # Get operation with requirements
            query = (
                select(Operation)
                .options(selectinload(Operation.requirements))
                .where(Operation.id == operation_id)
                .where(Operation.regimentId == regiment_id)
            )

            operation_result = await session.execute(query)
            operation = operation_result.scalar()

            if not operation:
                return {
                    "content": [
                        {"type": "text", "text": json.dumps({"error": "Operation not found"})},
                    ],
                    "isError": True,
                }

            # Get aggregate inventory for required items
            required_item_codes = [r.itemCode for r in operation.requirements]

            inventory_result = await session.execute(
                select(
                    StockpileItem.itemCode,
                    func.sum(StockpileItem.quantity).label("total"),
                )
                .join(Stockpile, StockpileItem.stockpileId == Stockpile.id)
                .where(Stockpile.regimentId == regiment_id)
                .where(StockpileItem.itemCode.in_(required_item_codes))
                .group_by(StockpileItem.itemCode)
            )
            inventory_map = {row.itemCode: row.total for row in inventory_result.all()}

        requirements = sorted(operation.requirements, key=lambda x: x.priority, reverse=True)
        deficit_analysis = []

        for req in requirements:
            available = inventory_map.get(req.itemCode, 0)
            deficit = max(0, req.quantity - available)
            fulfillment_percent = (
                min(100, round((available / req.quantity) * 100))
                if req.quantity > 0
                else 100
            )

            if deficit == 0:
                status = "fulfilled"
            elif fulfillment_percent >= 50:
                status = "partial"
            else:
                status = "critical"

            deficit_analysis.append({
                "itemCode": req.itemCode,
                "displayName": get_item_display_name(req.itemCode),
                "required": req.quantity,
                "available": available,
                "deficit": deficit,
                "fulfillmentPercent": fulfillment_percent,
                "priority": req.priority,
                "priorityLabel": get_priority_label(req.priority),
                "status": status,
            })

        # Sort by deficit status (critical first) then by priority
        status_order = {"critical": 0, "partial": 1, "fulfilled": 2}
        deficit_analysis.sort(key=lambda x: (status_order[x["status"]], -x["priority"]))

        total_required = sum(item["required"] for item in deficit_analysis)
        total_available = sum(min(item["available"], item["required"]) for item in deficit_analysis)
        total_deficit = sum(item["deficit"] for item in deficit_analysis)
        critical_count = sum(1 for item in deficit_analysis if item["status"] == "critical")
        partial_count = sum(1 for item in deficit_analysis if item["status"] == "partial")
        fulfilled_count = sum(1 for item in deficit_analysis if item["status"] == "fulfilled")

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "operationId": operation.id,
                        "operationName": operation.name,
                        "status": operation.status.value if hasattr(operation.status, 'value') else str(operation.status),
                        "summary": {
                            "totalRequired": total_required,
                            "totalAvailable": total_available,
                            "totalDeficit": total_deficit,
                            "overallFulfillment": (
                                round((total_available / total_required) * 100)
                                if total_required > 0
                                else 100
                            ),
                            "criticalCount": critical_count,
                            "partialCount": partial_count,
                            "fulfilledCount": fulfilled_count,
                        },
                        "items": deficit_analysis,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "get_operation_deficit",
        "Get operation requirements compared against current inventory to show deficits",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "operationId": {
                "type": "string",
                "description": "Operation ID",
                "required": True,
            },
        },
        get_operation_deficit,
    )

    async def create_operation(args: dict[str, Any]) -> dict[str, Any]:
        """Create a new operation with equipment requirements."""
        regiment_id = args["regimentId"]
        user_id = args["userId"]
        name = args["name"]
        description = args.get("description")
        location = args.get("location")
        scheduled_for = args.get("scheduledFor")
        scheduled_end_at = args.get("scheduledEndAt")
        destination_stockpile_id = args.get("destinationStockpileId")
        requirements = args.get("requirements", [])

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

            # Create operation
            operation = Operation(
                id=str(uuid.uuid4()),
                regimentId=regiment_id,
                name=name,
                description=description,
                location=location,
                scheduledFor=datetime.fromisoformat(scheduled_for) if scheduled_for else None,
                scheduledEndAt=datetime.fromisoformat(scheduled_end_at) if scheduled_end_at else None,
                destinationStockpileId=destination_stockpile_id,
                createdById=user_id,
            )
            session.add(operation)

            # Create requirements
            for req in requirements:
                requirement = OperationRequirement(
                    id=str(uuid.uuid4()),
                    operationId=operation.id,
                    itemCode=req["itemCode"],
                    quantity=req["quantity"],
                    priority=req.get("priority", 1),
                )
                session.add(requirement)

            await session.commit()

            # Get destination stockpile name if set
            dest_name = None
            if destination_stockpile_id:
                stockpile_result = await session.execute(
                    select(Stockpile.name, Stockpile.hex)
                    .where(Stockpile.id == destination_stockpile_id)
                )
                dest = stockpile_result.first()
                if dest:
                    dest_name = f"{dest.hex} - {dest.name}"

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "success": True,
                        "operationId": operation.id,
                        "name": operation.name,
                        "status": "PLANNING",
                        "requirementCount": len(requirements),
                        "destinationStockpile": dest_name,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "create_operation",
        "Create a new operation with equipment requirements",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "userId": {
                "type": "string",
                "description": "User ID creating the operation",
                "required": True,
            },
            "name": {
                "type": "string",
                "description": "Operation name",
                "required": True,
            },
            "description": {
                "type": "string",
                "description": "Operation description",
            },
            "location": {
                "type": "string",
                "description": "Target hex/location",
            },
            "scheduledFor": {
                "type": "string",
                "description": "ISO datetime when operation starts",
            },
            "scheduledEndAt": {
                "type": "string",
                "description": "ISO datetime when operation ends",
            },
            "destinationStockpileId": {
                "type": "string",
                "description": "Destination stockpile ID",
            },
            "requirements": {
                "type": "array",
                "description": "Equipment requirements",
            },
        },
        create_operation,
    )
