"""Inventory MCP tools - search and item locations."""

import json
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from ..db.session import get_session
from ..db.models import Stockpile, StockpileItem
from ..foxhole.items import get_item_display_name, get_item_codes_by_tag, is_vehicle

if TYPE_CHECKING:
    from ..server import McpServer


def register_inventory_tools(server: "McpServer") -> None:
    """Register inventory-related MCP tools."""

    async def search_inventory(args: dict[str, Any]) -> dict[str, Any]:
        """Search regiment inventory for items."""
        regiment_id = args["regimentId"]
        query = args.get("query")
        category = args.get("category")
        limit = int(args.get("limit", 20))

        async with get_session() as session:
            # Get all stockpile items for this regiment
            items_result = await session.execute(
                select(
                    StockpileItem.itemCode,
                    StockpileItem.quantity,
                    StockpileItem.crated,
                    StockpileItem.stockpileId,
                )
                .join(Stockpile, StockpileItem.stockpileId == Stockpile.id)
                .where(Stockpile.regimentId == regiment_id)
            )
            items = items_result.all()

        # Aggregate by itemCode
        aggregate_map: dict[str, dict[str, Any]] = {}

        for item in items:
            item_code = item.itemCode
            display_name = get_item_display_name(item_code)

            if item_code not in aggregate_map:
                aggregate_map[item_code] = {
                    "itemCode": item_code,
                    "displayName": display_name,
                    "totalQuantity": 0,
                    "cratedQuantity": 0,
                    "looseQuantity": 0,
                    "stockpileIds": set(),
                }

            entry = aggregate_map[item_code]
            if item.crated:
                entry["cratedQuantity"] += item.quantity
            else:
                entry["looseQuantity"] += item.quantity
            entry["totalQuantity"] += item.quantity
            entry["stockpileIds"].add(item.stockpileId)

        # Convert to list
        aggregated = [
            {
                "itemCode": v["itemCode"],
                "displayName": v["displayName"],
                "totalQuantity": v["totalQuantity"],
                "cratedQuantity": v["cratedQuantity"],
                "looseQuantity": v["looseQuantity"],
                "stockpileCount": len(v["stockpileIds"]),
                "matchedTag": None,
            }
            for v in aggregate_map.values()
        ]

        # Filter by category
        if category == "vehicles":
            aggregated = [item for item in aggregated if is_vehicle(item["itemCode"])]

        # Filter by search term
        if query:
            search_lower = query.lower()
            tag_matched_codes = set(get_item_codes_by_tag(search_lower))

            filtered = []
            for item in aggregated:
                if (
                    search_lower in item["displayName"].lower()
                    or search_lower in item["itemCode"].lower()
                    or item["itemCode"] in tag_matched_codes
                ):
                    if item["itemCode"] in tag_matched_codes:
                        item["matchedTag"] = query.upper()
                    filtered.append(item)
            aggregated = filtered

        # Sort by total quantity descending
        aggregated.sort(key=lambda x: x["totalQuantity"], reverse=True)

        # Apply limit
        aggregated = aggregated[:limit]

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "query": query,
                        "category": category or "all",
                        "resultCount": len(aggregated),
                        "totalUniqueItems": len(aggregate_map),
                        "items": aggregated,
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "search_inventory",
        "Search regiment inventory for items by name, code, or slang (e.g., '12.7', 'mammon', 'bmat')",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "query": {
                "type": "string",
                "description": "Search term (item name, code, or slang)",
            },
            "category": {
                "type": "string",
                "description": "Filter by category: vehicles, weapons, ammo, resources, all",
            },
            "limit": {
                "type": "integer",
                "description": "Max items to return",
                "default": 20,
            },
        },
        search_inventory,
    )

    async def get_item_locations(args: dict[str, Any]) -> dict[str, Any]:
        """Get list of stockpiles containing a specific item with quantities."""
        regiment_id = args["regimentId"]
        item_code = args["itemCode"]

        async with get_session() as session:
            # Get all stockpiles that have this item
            items_result = await session.execute(
                select(
                    StockpileItem.quantity,
                    StockpileItem.crated,
                    Stockpile.id,
                    Stockpile.name,
                    Stockpile.type,
                    Stockpile.hex,
                    Stockpile.locationName,
                    Stockpile.updatedAt,
                )
                .join(Stockpile, StockpileItem.stockpileId == Stockpile.id)
                .where(Stockpile.regimentId == regiment_id)
                .where(StockpileItem.itemCode == item_code)
                .order_by(StockpileItem.quantity.desc())
            )
            stockpile_items = items_result.all()

        # Group by stockpile (separate entries for crated/loose)
        stockpile_map: dict[str, dict[str, Any]] = {}

        for item in stockpile_items:
            stockpile_id = item.id

            if stockpile_id not in stockpile_map:
                stockpile_map[stockpile_id] = {
                    "id": stockpile_id,
                    "name": item.name,
                    "type": item.type.value if hasattr(item.type, 'value') else str(item.type),
                    "hex": item.hex,
                    "locationName": item.locationName,
                    "updatedAt": item.updatedAt.isoformat() if item.updatedAt else None,
                    "looseQuantity": 0,
                    "cratedQuantity": 0,
                    "totalQuantity": 0,
                }

            entry = stockpile_map[stockpile_id]
            if item.crated:
                entry["cratedQuantity"] += item.quantity
            else:
                entry["looseQuantity"] += item.quantity
            entry["totalQuantity"] += item.quantity

        stockpiles = sorted(
            stockpile_map.values(),
            key=lambda x: x["totalQuantity"],
            reverse=True,
        )

        # Calculate totals
        total_quantity = sum(s["totalQuantity"] for s in stockpiles)
        total_crated = sum(s["cratedQuantity"] for s in stockpiles)
        total_loose = sum(s["looseQuantity"] for s in stockpiles)

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "itemCode": item_code,
                        "displayName": get_item_display_name(item_code),
                        "totalQuantity": total_quantity,
                        "totalCrated": total_crated,
                        "totalLoose": total_loose,
                        "stockpileCount": len(stockpiles),
                        "stockpiles": [
                            {
                                **s,
                                "location": f"{s['hex']} - {s['locationName']}",
                            }
                            for s in stockpiles
                        ],
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "get_item_locations",
        "Get list of stockpiles containing a specific item with quantities",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "itemCode": {
                "type": "string",
                "description": "Item code to search for (e.g., 'RifleC', 'HEGrenade')",
                "required": True,
            },
        },
        get_item_locations,
    )
