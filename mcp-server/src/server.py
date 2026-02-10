"""MCP server setup and HTTP transport handler."""

import json
from typing import Any

from fastapi import Request, Response
from mcp.server import Server
from mcp.types import Tool, TextContent

from .config import settings
from .utils.logger import logger
from .tools import (
    register_stats_tools,
    register_inventory_tools,
    register_stockpile_tools,
    register_production_tools,
    register_operation_tools,
    register_scanner_tools,
)


class McpServer:
    """MCP Server wrapper with tool registration and HTTP handling."""

    def __init__(self) -> None:
        """Initialize the MCP server."""
        self.server = Server("foxhole-quartermaster")
        self._tools: dict[str, dict[str, Any]] = {}

        # Register all tool modules
        self._register_tools()

    def _register_tools(self) -> None:
        """Register all MCP tools."""
        register_stats_tools(self)
        register_inventory_tools(self)
        register_stockpile_tools(self)
        register_production_tools(self)
        register_operation_tools(self)
        register_scanner_tools(self)

        logger.info(f"Registered {len(self._tools)} MCP tools")

    def tool(
        self,
        name: str,
        description: str,
        parameters: dict[str, Any],
        handler: Any,
    ) -> None:
        """Register a tool with the server.

        Args:
            name: Tool name
            description: Tool description
            parameters: JSON schema for parameters
            handler: Async function to handle tool calls
        """
        self._tools[name] = {
            "name": name,
            "description": description,
            "parameters": parameters,
            "handler": handler,
        }

    def list_tools(self) -> list[dict[str, Any]]:
        """List all registered tools."""
        return [
            {
                "name": tool["name"],
                "description": tool["description"],
                "inputSchema": {
                    "type": "object",
                    "properties": tool["parameters"],
                    "required": [
                        k for k, v in tool["parameters"].items()
                        if v.get("required", False)
                    ],
                },
            }
            for tool in self._tools.values()
        ]

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Call a tool by name.

        Args:
            name: Tool name
            arguments: Tool arguments

        Returns:
            Tool result
        """
        if name not in self._tools:
            return {
                "content": [{"type": "text", "text": json.dumps({"error": f"Unknown tool: {name}"})}],
                "isError": True,
            }

        tool = self._tools[name]
        try:
            result = await tool["handler"](arguments)
            return result
        except Exception as e:
            logger.error(f"Error executing tool {name}: {e}")
            return {
                "content": [{"type": "text", "text": json.dumps({"error": str(e)})}],
                "isError": True,
            }


# Global MCP server instance
mcp_server = McpServer()


def verify_auth_token(request: Request) -> bool:
    """Verify the authorization token.

    Args:
        request: FastAPI request

    Returns:
        True if authorized, False otherwise
    """
    if not settings.mcp_auth_token:
        # No auth configured, allow all
        return True

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        return token == settings.mcp_auth_token

    return False


async def handle_mcp_request(request: Request) -> Response:
    """Handle an MCP HTTP request.

    Implements a simple HTTP-based MCP transport.

    Args:
        request: FastAPI request

    Returns:
        JSON response with tool result
    """
    # Verify authorization
    if not verify_auth_token(request):
        return Response(
            content=json.dumps({"error": "Unauthorized"}),
            status_code=401,
            media_type="application/json",
        )

    try:
        body = await request.json()
    except json.JSONDecodeError:
        return Response(
            content=json.dumps({"error": "Invalid JSON"}),
            status_code=400,
            media_type="application/json",
        )

    # Handle different MCP methods
    method = body.get("method")
    params = body.get("params", {})

    if method == "tools/list":
        return Response(
            content=json.dumps({"tools": mcp_server.list_tools()}),
            status_code=200,
            media_type="application/json",
        )

    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        if not tool_name:
            return Response(
                content=json.dumps({"error": "Missing tool name"}),
                status_code=400,
                media_type="application/json",
            )

        result = await mcp_server.call_tool(tool_name, arguments)
        return Response(
            content=json.dumps(result),
            status_code=200,
            media_type="application/json",
        )

    else:
        return Response(
            content=json.dumps({"error": f"Unknown method: {method}"}),
            status_code=400,
            media_type="application/json",
        )
