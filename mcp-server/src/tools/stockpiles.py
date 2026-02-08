"""Stockpile MCP tools - list, get, and refresh stockpiles."""

import json
import uuid
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from sqlalchemy import select, func

from ..db.session import get_session
from ..db.models import Stockpile, StockpileItem, StockpileScan, StockpileRefresh, User
from ..foxhole.items import get_item_display_name
from ..foxhole.formatters import format_relative_time, format_stockpile_type

if TYPE_CHECKING:
    from ..server import McpServer


def register_stockpile_tools(server: "McpServer") -> None:
    """Register stockpile-related MCP tools."""

    async def list_stockpiles(args: dict[str, Any]) -> dict[str, Any]:
        """List all stockpiles with scan info and freshness."""
        regiment_id = args["regimentId"]
        hex_filter = args.get("hex")

        async with get_session() as session:
            # Build query
            query = (
                select(Stockpile)
                .where(Stockpile.regimentId == regiment_id)
                .order_by(Stockpile.updatedAt.desc())
            )
            if hex_filter:
                query = query.where(Stockpile.hex.ilike(f"%{hex_filter}%"))

            stockpiles_result = await session.execute(query)
            stockpiles = stockpiles_result.scalars().all()

            result = []
            for stockpile in stockpiles:
                # Get total items
                items_result = await session.execute(
                    select(func.sum(StockpileItem.quantity))
                    .where(StockpileItem.stockpileId == stockpile.id)
                )
                total_items = items_result.scalar() or 0

                # Get unique item count
                unique_result = await session.execute(
                    select(func.count(StockpileItem.id))
                    .where(StockpileItem.stockpileId == stockpile.id)
                )
                unique_count = unique_result.scalar() or 0

                # Get last scan
                scan_result = await session.execute(
                    select(StockpileScan.createdAt, User.name)
                    .join(User, StockpileScan.scannedById == User.id)
                    .where(StockpileScan.stockpileId == stockpile.id)
                    .order_by(StockpileScan.createdAt.desc())
                    .limit(1)
                )
                last_scan = scan_result.first()

                # Calculate freshness (based on 50-hour expiration)
                freshness_status = "unknown"
                hours_until_expiry = None
                if stockpile.lastRefreshedAt:
                    hours_since_refresh = (
                        datetime.utcnow() - stockpile.lastRefreshedAt
                    ).total_seconds() / 3600
                    hours_until_expiry = max(0, 50 - hours_since_refresh)
                    if hours_until_expiry > 24:
                        freshness_status = "fresh"
                    elif hours_until_expiry > 6:
                        freshness_status = "aging"
                    elif hours_until_expiry > 0:
                        freshness_status = "expiring_soon"
                    else:
                        freshness_status = "expired"

                result.append({
                    "id": stockpile.id,
                    "name": stockpile.name,
                    "type": format_stockpile_type(stockpile.type.value if hasattr(stockpile.type, 'value') else str(stockpile.type)),
                    "hex": stockpile.hex,
                    "locationName": stockpile.locationName,
                    "location": f"{stockpile.hex} - {stockpile.locationName}",
                    "totalItems": total_items,
                    "uniqueItemCount": unique_count,
                    "lastScanTime": last_scan.createdAt.isoformat() if last_scan else None,
                    "lastScanRelative": format_relative_time(last_scan.createdAt) if last_scan else "Never",
                    "lastScannedBy": last_scan.name if last_scan else None,
                    "lastRefreshedAt": stockpile.lastRefreshedAt.isoformat() if stockpile.lastRefreshedAt else None,
                    "freshnessStatus": freshness_status,
                    "hoursUntilExpiry": round(hours_until_expiry, 1) if hours_until_expiry is not None else None,
                    "hasCode": bool(stockpile.code),
                })

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "stockpileCount": len(result),
                        "stockpiles": result,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "list_stockpiles",
        "List all stockpiles with last scan times, item counts, and freshness status",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "hex": {
                "type": "string",
                "description": "Filter by hex/region name",
            },
        },
        list_stockpiles,
    )

    async def get_stockpile(args: dict[str, Any]) -> dict[str, Any]:
        """Get detailed stockpile info with inventory."""
        regiment_id = args["regimentId"]
        stockpile_id = args.get("stockpileId")
        stockpile_name = args.get("stockpileName")

        if not stockpile_id and not stockpile_name:
            return {
                "content": [
                    {"type": "text", "text": json.dumps({"error": "Either stockpileId or stockpileName is required"})},
                ],
                "isError": True,
            }

        async with get_session() as session:
            # Build query
            query = select(Stockpile).where(Stockpile.regimentId == regiment_id)
            if stockpile_id:
                query = query.where(Stockpile.id == stockpile_id)
            if stockpile_name:
                query = query.where(Stockpile.name.ilike(f"%{stockpile_name}%"))

            stockpile_result = await session.execute(query.limit(1))
            stockpile = stockpile_result.scalar()

            if not stockpile:
                return {
                    "content": [
                        {"type": "text", "text": json.dumps({"error": "Stockpile not found"})},
                    ],
                    "isError": True,
                }

            # Get items
            items_result = await session.execute(
                select(StockpileItem)
                .where(StockpileItem.stockpileId == stockpile.id)
                .order_by(StockpileItem.quantity.desc())
            )
            items = items_result.scalars().all()

            inventory = [
                {
                    "itemCode": item.itemCode,
                    "displayName": get_item_display_name(item.itemCode),
                    "quantity": item.quantity,
                    "crated": item.crated,
                }
                for item in items
            ]

            total_items = sum(item.quantity for item in items)

            # Get recent scans
            scans_result = await session.execute(
                select(StockpileScan.id, StockpileScan.createdAt, StockpileScan.itemCount, User.name)
                .join(User, StockpileScan.scannedById == User.id)
                .where(StockpileScan.stockpileId == stockpile.id)
                .order_by(StockpileScan.createdAt.desc())
                .limit(5)
            )
            scans = scans_result.all()

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "id": stockpile.id,
                        "name": stockpile.name,
                        "type": format_stockpile_type(stockpile.type.value if hasattr(stockpile.type, 'value') else str(stockpile.type)),
                        "hex": stockpile.hex,
                        "locationName": stockpile.locationName,
                        "location": f"{stockpile.hex} - {stockpile.locationName}",
                        "code": "[REDACTED]" if stockpile.code else None,
                        "lastRefreshedAt": stockpile.lastRefreshedAt.isoformat() if stockpile.lastRefreshedAt else None,
                        "updatedAt": stockpile.updatedAt.isoformat(),
                        "totalItems": total_items,
                        "uniqueItemCount": len(inventory),
                        "inventory": inventory,
                        "recentScans": [
                            {
                                "id": scan.id,
                                "createdAt": scan.createdAt.isoformat(),
                                "relativeTime": format_relative_time(scan.createdAt),
                                "itemCount": scan.itemCount,
                                "scannedBy": scan.name or "Unknown",
                            }
                            for scan in scans
                        ],
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "get_stockpile",
        "Get detailed stockpile information including full inventory",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "stockpileId": {
                "type": "string",
                "description": "Stockpile ID",
            },
            "stockpileName": {
                "type": "string",
                "description": "Stockpile name (partial match)",
            },
        },
        get_stockpile,
    )

    async def refresh_stockpile(args: dict[str, Any]) -> dict[str, Any]:
        """Record a stockpile refresh (resets 50-hour expiration timer)."""
        regiment_id = args["regimentId"]
        stockpile_id = args["stockpileId"]
        user_id = args["userId"]

        async with get_session() as session:
            # Verify stockpile belongs to regiment
            stockpile_result = await session.execute(
                select(Stockpile)
                .where(Stockpile.id == stockpile_id)
                .where(Stockpile.regimentId == regiment_id)
            )
            stockpile = stockpile_result.scalar()

            if not stockpile:
                return {
                    "content": [
                        {"type": "text", "text": json.dumps({"error": "Stockpile not found or does not belong to this regiment"})},
                    ],
                    "isError": True,
                }

            # Update stockpile and create refresh record
            now = datetime.utcnow()
            stockpile.lastRefreshedAt = now

            refresh = StockpileRefresh(
                id=str(uuid.uuid4()),
                stockpileId=stockpile_id,
                refreshedById=user_id,
            )
            session.add(refresh)

            await session.commit()

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "success": True,
                        "stockpileId": stockpile_id,
                        "stockpileName": stockpile.name,
                        "refreshedAt": now.isoformat(),
                        "expiresAt": (now + timedelta(hours=50)).isoformat(),
                        "refreshId": refresh.id,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "refresh_stockpile",
        "Record a stockpile refresh (resets 50-hour expiration timer)",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "stockpileId": {
                "type": "string",
                "description": "Stockpile ID to refresh",
                "required": True,
            },
            "userId": {
                "type": "string",
                "description": "User ID recording the refresh",
                "required": True,
            },
        },
        refresh_stockpile,
    )
