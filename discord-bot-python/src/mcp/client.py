"""MCP HTTP client for communicating with the MCP server."""

from typing import Any

import httpx

from ..config import settings
from ..utils.logger import logger


class McpClient:
    """HTTP client for the MCP server."""

    def __init__(self, base_url: str, auth_token: str = "") -> None:
        """Initialize the MCP client.

        Args:
            base_url: Base URL of the MCP server
            auth_token: Optional authentication token
        """
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token

    def _get_headers(self) -> dict[str, str]:
        """Get request headers."""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Call an MCP tool.

        Args:
            name: Tool name
            arguments: Tool arguments

        Returns:
            Tool result
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/mcp",
                    json={
                        "method": "tools/call",
                        "params": {
                            "name": name,
                            "arguments": arguments,
                        },
                    },
                    headers=self._get_headers(),
                )

                if response.status_code == 401:
                    logger.error("mcp", "Unauthorized - check MCP_AUTH_TOKEN")
                    return {"error": "Unauthorized"}

                if response.status_code != 200:
                    logger.error("mcp", f"MCP server error: {response.status_code}")
                    return {"error": f"Server error: {response.status_code}"}

                return response.json()

            except httpx.TimeoutException:
                logger.error("mcp", f"Timeout calling tool: {name}")
                return {"error": "Request timeout"}
            except httpx.RequestError as e:
                logger.error("mcp", f"Request error: {e}")
                return {"error": str(e)}

    async def list_tools(self) -> list[dict[str, Any]]:
        """List available MCP tools.

        Returns:
            List of tool definitions
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/mcp",
                    json={"method": "tools/list"},
                    headers=self._get_headers(),
                )

                if response.status_code != 200:
                    return []

                data = response.json()
                return data.get("tools", [])

            except Exception as e:
                logger.error("mcp", f"Error listing tools: {e}")
                return []

    async def health_check(self) -> bool:
        """Check if MCP server is healthy.

        Returns:
            True if healthy, False otherwise
        """
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(f"{self.base_url}/health")
                return response.status_code == 200
            except Exception:
                return False


# Global MCP client instance
mcp_client = McpClient(
    base_url=settings.mcp_server_url,
    auth_token=settings.mcp_auth_token,
)
