"""Main entry point for the MCP server."""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .utils.logger import logger
from .db.engine import engine
from .server import mcp_server, handle_mcp_request


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    logger.info("Starting MCP server...")
    logger.info(f"Debug mode: {settings.debug}")

    # Test database connection
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

    yield

    # Cleanup
    logger.info("Shutting down MCP server...")
    await engine.dispose()


app = FastAPI(
    title="Foxhole Quartermaster MCP Server",
    version="1.0.0",
    description="Model Context Protocol server for Foxhole regiment logistics data",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "foxhole-quartermaster-mcp",
        "version": "1.0.0",
    }


@app.post("/mcp")
async def mcp_endpoint(request: Request) -> Response:
    """MCP HTTP transport endpoint.

    Handles MCP requests via HTTP POST.
    """
    return await handle_mcp_request(request)


@app.get("/mcp/tools")
async def list_tools() -> dict:
    """List available MCP tools."""
    return {
        "tools": mcp_server.list_tools(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
