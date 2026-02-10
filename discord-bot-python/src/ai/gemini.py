"""Gemini AI configuration and function declarations."""

import json
from typing import Any

import google.generativeai as genai

from ..config import settings
from ..mcp.client import mcp_client
from ..utils.logger import logger

# Configure Gemini
genai.configure(api_key=settings.google_api_key)

# Define function declarations for Gemini based on MCP tools
FUNCTION_DECLARATIONS = [
    genai.protos.FunctionDeclaration(
        name="get_dashboard_stats",
        description="Get regiment overview: stockpile count, total items, active operations, production orders",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
            },
            required=["regimentId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="search_inventory",
        description="Search regiment inventory for items by name, code, or slang (e.g., '12.7', 'mammon', 'bmat')",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "query": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Search term (item name, code, or slang)",
                ),
                "category": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Optional category filter: 'vehicles', 'weapons', 'ammo', 'resources', 'all'",
                ),
                "limit": genai.protos.Schema(
                    type=genai.protos.Type.NUMBER,
                    description="Max items to return (default 20)",
                ),
            },
            required=["regimentId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="get_item_locations",
        description="Get list of stockpiles containing a specific item with quantities",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "itemCode": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Item code to search for (e.g., 'RifleC', 'HEGrenade', 'MGAmmo')",
                ),
            },
            required=["regimentId", "itemCode"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="list_stockpiles",
        description="List all stockpiles with last scan times, item counts, and freshness status",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "hex": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Filter by hex/region name",
                ),
            },
            required=["regimentId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="get_stockpile",
        description="Get detailed stockpile information including full inventory",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "stockpileId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Stockpile ID",
                ),
                "stockpileName": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Stockpile name (partial match)",
                ),
            },
            required=["regimentId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="get_stockpile_minimums",
        description="Check standing order minimums for a stockpile — shows which items are below target quantity",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "stockpileId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Stockpile ID to check minimums for",
                ),
                "stockpileName": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Stockpile name (partial match)",
                ),
            },
            required=["regimentId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="list_production_orders",
        description="List production orders, optionally filtered by status. Excludes archived orders by default.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "status": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Filter by status: PENDING, IN_PROGRESS, READY_FOR_PICKUP, COMPLETED, CANCELLED, FULFILLED",
                ),
                "isMpf": genai.protos.Schema(
                    type=genai.protos.Type.BOOLEAN,
                    description="Filter for MPF orders only",
                ),
                "isStandingOrder": genai.protos.Schema(
                    type=genai.protos.Type.BOOLEAN,
                    description="Filter for standing orders (stockpile minimums) only",
                ),
                "limit": genai.protos.Schema(
                    type=genai.protos.Type.NUMBER,
                    description="Max orders to return (default 20)",
                ),
            },
            required=["regimentId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="get_production_order",
        description="Get detailed production order with all items and progress",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "orderId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Production order ID",
                ),
                "shortId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Short ID for the order",
                ),
            },
            required=["regimentId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="list_operations",
        description="List operations, optionally filtered by status",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "status": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Filter by status: PLANNING, ACTIVE, COMPLETED, CANCELLED",
                ),
                "limit": genai.protos.Schema(
                    type=genai.protos.Type.NUMBER,
                    description="Max operations to return (default 20)",
                ),
            },
            required=["regimentId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="get_operation",
        description="Get detailed operation information including requirements",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "operationId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Operation ID",
                ),
            },
            required=["regimentId", "operationId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="get_operation_deficit",
        description="Get operation requirements compared against current inventory to show deficits",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "operationId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Operation ID",
                ),
            },
            required=["regimentId", "operationId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="refresh_stockpile",
        description="Record a stockpile refresh (resets the 50-hour expiration timer). Use when a user says they refreshed a stockpile.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "stockpileId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Stockpile ID to refresh",
                ),
                "userId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord user ID of the person who refreshed",
                ),
            },
            required=["regimentId", "stockpileId", "userId"],
        ),
    ),
    genai.protos.FunctionDeclaration(
        name="get_leaderboard",
        description="Get contributor leaderboard for scans and production",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "regimentId": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Discord guild ID of the regiment",
                ),
                "period": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Time period: weekly, monthly, war",
                ),
                "limit": genai.protos.Schema(
                    type=genai.protos.Type.NUMBER,
                    description="Max contributors to return (default 10)",
                ),
            },
            required=["regimentId"],
        ),
    ),
]


def get_gemini_model() -> genai.GenerativeModel:
    """Get the configured Gemini model with function calling.

    Returns:
        Configured GenerativeModel
    """
    return genai.GenerativeModel(
        "gemini-2.0-flash",
        tools=[genai.protos.Tool(function_declarations=FUNCTION_DECLARATIONS)],
    )


async def execute_function_call(name: str, args: dict[str, Any]) -> str:
    """Execute an MCP function call.

    Args:
        name: Function name
        args: Function arguments

    Returns:
        JSON string result
    """
    try:
        result = await mcp_client.call_tool(name, args)

        # Extract text content from MCP response
        content = result.get("content", [])
        if content and isinstance(content, list) and len(content) > 0:
            first_content = content[0]
            if first_content.get("type") == "text":
                return first_content.get("text", json.dumps(result))

        return json.dumps(result)

    except Exception as e:
        logger.error("gemini", f"Error executing function {name}", {"error": str(e)})
        return json.dumps({"error": f"Failed to execute {name}: {e}"})
