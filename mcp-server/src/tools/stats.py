"""Stats MCP tools - dashboard stats and leaderboard."""

import json
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select

from ..db.session import get_session
from ..db.models import (
    Stockpile,
    StockpileItem,
    StockpileScan,
    StockpileRefresh,
    Operation,
    ProductionOrder,
    ProductionContribution,
    User,
)
from ..foxhole.formatters import format_relative_time

if TYPE_CHECKING:
    from ..server import McpServer


def register_stats_tools(server: "McpServer") -> None:
    """Register stats-related MCP tools."""

    async def get_dashboard_stats(args: dict[str, Any]) -> dict[str, Any]:
        """Get regiment overview statistics."""
        regiment_id = args["regimentId"]

        async with get_session() as session:
            # Count stockpiles
            stockpile_count_result = await session.execute(
                select(func.count(Stockpile.id)).where(Stockpile.regimentId == regiment_id)
            )
            stockpile_count = stockpile_count_result.scalar() or 0

            # Sum all item quantities
            total_items_result = await session.execute(
                select(func.sum(StockpileItem.quantity))
                .join(Stockpile, StockpileItem.stockpileId == Stockpile.id)
                .where(Stockpile.regimentId == regiment_id)
            )
            total_items = total_items_result.scalar() or 0

            # Count active operations
            active_ops_result = await session.execute(
                select(func.count(Operation.id))
                .where(Operation.regimentId == regiment_id)
                .where(Operation.status.in_(["PLANNING", "ACTIVE"]))
            )
            active_operation_count = active_ops_result.scalar() or 0

            # Count pending/in-progress production orders
            pending_prod_result = await session.execute(
                select(func.count(ProductionOrder.id))
                .where(ProductionOrder.regimentId == regiment_id)
                .where(ProductionOrder.status.in_(["PENDING", "IN_PROGRESS", "READY_FOR_PICKUP"]))
            )
            pending_production_count = pending_prod_result.scalar() or 0

            # Get most recently updated stockpile
            last_stockpile_result = await session.execute(
                select(Stockpile.updatedAt, Stockpile.name, Stockpile.hex)
                .where(Stockpile.regimentId == regiment_id)
                .order_by(Stockpile.updatedAt.desc())
                .limit(1)
            )
            last_stockpile = last_stockpile_result.first()

            # Count scans in last 24 hours
            yesterday = datetime.utcnow() - timedelta(hours=24)
            recent_scans_result = await session.execute(
                select(func.count(StockpileScan.id))
                .join(Stockpile, StockpileScan.stockpileId == Stockpile.id)
                .where(Stockpile.regimentId == regiment_id)
                .where(StockpileScan.createdAt >= yesterday)
            )
            scans_last_24_hours = recent_scans_result.scalar() or 0

        last_updated = (
            format_relative_time(last_stockpile.updatedAt)
            if last_stockpile
            else None
        )

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "stockpileCount": stockpile_count,
                        "totalItems": total_items,
                        "activeOperationCount": active_operation_count,
                        "pendingProductionCount": pending_production_count,
                        "lastUpdated": last_updated,
                        "lastUpdatedStockpile": (
                            f"{last_stockpile.hex} - {last_stockpile.name}"
                            if last_stockpile
                            else None
                        ),
                        "scansLast24Hours": scans_last_24_hours,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "get_dashboard_stats",
        "Get regiment overview: stockpile count, total items, active operations, production orders",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
        },
        get_dashboard_stats,
    )

    async def get_leaderboard(args: dict[str, Any]) -> dict[str, Any]:
        """Get contributor leaderboard for scans and production."""
        regiment_id = args["regimentId"]
        period = args.get("period")
        limit = args.get("limit", 10)

        # Calculate date range based on period
        start_date = None
        if period == "weekly":
            start_date = datetime.utcnow() - timedelta(days=7)
        elif period == "monthly":
            start_date = datetime.utcnow() - timedelta(days=30)
        # For "war" period, we'd need war number tracking - skip date filter

        async with get_session() as session:
            # Get scan contributions
            scan_query = (
                select(
                    StockpileScan.scannedById,
                    func.count(StockpileScan.id).label("scan_count"),
                    func.sum(StockpileScan.itemCount).label("items_scanned"),
                )
                .join(Stockpile, StockpileScan.stockpileId == Stockpile.id)
                .where(Stockpile.regimentId == regiment_id)
                .group_by(StockpileScan.scannedById)
                .order_by(func.count(StockpileScan.id).desc())
                .limit(limit)
            )
            if start_date:
                scan_query = scan_query.where(StockpileScan.createdAt >= start_date)

            scan_result = await session.execute(scan_query)
            scan_leaders = scan_result.all()

            # Get user details for scan leaders
            if scan_leaders:
                scan_user_ids = [s.scannedById for s in scan_leaders]
                users_result = await session.execute(
                    select(User.id, User.name, User.discordId)
                    .where(User.id.in_(scan_user_ids))
                )
                scan_users = {u.id: u for u in users_result.all()}
            else:
                scan_users = {}

            scan_leaderboard = [
                {
                    "userId": leader.scannedById,
                    "userName": scan_users.get(leader.scannedById, type("", (), {"name": "Unknown"}))().name if leader.scannedById in scan_users else "Unknown",
                    "discordId": scan_users.get(leader.scannedById, type("", (), {"discordId": None}))().discordId if leader.scannedById in scan_users else None,
                    "scanCount": leader.scan_count,
                    "itemsScanned": leader.items_scanned or 0,
                }
                for leader in scan_leaders
            ]

            # Get production contributions
            prod_query = (
                select(
                    ProductionContribution.userId,
                    func.sum(ProductionContribution.quantity).label("items_produced"),
                    func.count(ProductionContribution.id).label("contribution_count"),
                )
                .join(ProductionOrder, ProductionContribution.orderId == ProductionOrder.id)
                .where(ProductionOrder.regimentId == regiment_id)
                .group_by(ProductionContribution.userId)
                .order_by(func.sum(ProductionContribution.quantity).desc())
                .limit(limit)
            )
            if start_date:
                prod_query = prod_query.where(ProductionContribution.createdAt >= start_date)

            prod_result = await session.execute(prod_query)
            prod_leaders = prod_result.all()

            # Get user details for production leaders
            if prod_leaders:
                prod_user_ids = [p.userId for p in prod_leaders]
                prod_users_result = await session.execute(
                    select(User.id, User.name, User.discordId)
                    .where(User.id.in_(prod_user_ids))
                )
                prod_users = {u.id: u for u in prod_users_result.all()}
            else:
                prod_users = {}

            production_leaderboard = [
                {
                    "userId": leader.userId,
                    "userName": prod_users.get(leader.userId, type("", (), {"name": "Unknown"}))().name if leader.userId in prod_users else "Unknown",
                    "discordId": prod_users.get(leader.userId, type("", (), {"discordId": None}))().discordId if leader.userId in prod_users else None,
                    "contributionCount": leader.contribution_count,
                    "itemsProduced": leader.items_produced or 0,
                }
                for leader in prod_leaders
            ]

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "period": period or "all-time",
                        "scanLeaderboard": scan_leaderboard,
                        "productionLeaderboard": production_leaderboard,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "get_leaderboard",
        "Get contributor leaderboard for scans and production",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "period": {
                "type": "string",
                "description": "Time period for leaderboard: weekly, monthly, war",
            },
            "limit": {
                "type": "integer",
                "description": "Max number of contributors to return",
                "default": 10,
            },
        },
        get_leaderboard,
    )
