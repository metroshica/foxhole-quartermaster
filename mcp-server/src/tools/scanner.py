"""Scanner MCP tools - OCR processing for stockpile screenshots."""

import json
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

import httpx
from sqlalchemy import delete, select

from ..config import settings
from ..db.session import get_session
from ..db.models import Stockpile, StockpileItem, StockpileScan, StockpileScanItem
from ..db.models.regiment import Regiment
from ..db.models.user import User
from ..foxhole.items import get_item_display_name
from ..utils.logger import logger

if TYPE_CHECKING:
    from ..server import McpServer


def register_scanner_tools(server: "McpServer") -> None:
    """Register scanner-related MCP tools."""

    async def scan_screenshot(args: dict[str, Any]) -> dict[str, Any]:
        """Process a stockpile screenshot via OCR to extract item inventory."""
        image_url = args["imageUrl"]
        faction = args.get("faction", "all")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Download the image
                image_response = await client.get(image_url)
                if image_response.status_code != 200:
                    return {
                        "content": [
                            {"type": "text", "text": json.dumps({"error": "Failed to download image"})},
                        ],
                        "isError": True,
                    }

                # Send to scanner service using multipart form (matches web app)
                files = {"image": ("screenshot.png", image_response.content, "image/png")}
                data = {"faction": faction}
                scan_response = await client.post(
                    f"{settings.scanner_url}/ocr/scan_image",
                    files=files,
                    data=data,
                )

                if scan_response.status_code != 200:
                    return {
                        "content": [
                            {
                                "type": "text",
                                "text": json.dumps({
                                    "error": "Scanner service error",
                                    "status": scan_response.status_code,
                                }),
                            },
                        ],
                        "isError": True,
                    }

                result = scan_response.json()

                if result.get("error"):
                    return {
                        "content": [
                            {"type": "text", "text": json.dumps({"error": result["error"]})},
                        ],
                        "isError": True,
                    }

                # Extract detected stockpile name from scanner response
                detected_name = (
                    result.get("stockpileName")
                    or result.get("stockpile_name")
                    or result.get("name")
                )
                detected_type = result.get("stockpileType") or result.get("stockpile_type")

                # Format results with display names
                items = [
                    {
                        "itemCode": item["code"],
                        "displayName": get_item_display_name(item["code"]),
                        "quantity": item["quantity"],
                        "crated": item["crated"],
                        "confidence": round(item["confidence"] * 100),
                    }
                    for item in result.get("items", [])
                ]

                # Sort by quantity descending
                items.sort(key=lambda x: x["quantity"], reverse=True)

                total_items = sum(item["quantity"] for item in items)
                avg_confidence = (
                    round(sum(item["confidence"] for item in items) / len(items))
                    if items
                    else 0
                )

                return {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps({
                                "success": True,
                                "itemCount": len(items),
                                "totalQuantity": total_items,
                                "averageConfidence": avg_confidence,
                                "faction": result.get("faction", faction),
                                "detectedName": detected_name,
                                "detectedType": detected_type,
                                "items": items,
                                "note": "Use save_scan_results to save these items to a stockpile",
                            }, indent=2),
                        },
                    ],
                }

        except httpx.TimeoutException:
            return {
                "content": [
                    {"type": "text", "text": json.dumps({"error": "Scanner service timeout"})},
                ],
                "isError": True,
            }
        except Exception as e:
            logger.error(f"Scanner error: {e}")
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps({
                            "error": "Failed to process screenshot",
                            "details": str(e),
                        }),
                    },
                ],
                "isError": True,
            }

    server.tool(
        "scan_screenshot",
        "Process a stockpile screenshot via OCR to extract item inventory",
        {
            "imageUrl": {
                "type": "string",
                "description": "URL of the screenshot to process",
                "required": True,
            },
            "faction": {
                "type": "string",
                "description": "Faction filter: colonials, wardens, all",
                "default": "all",
            },
        },
        scan_screenshot,
    )

    async def save_scan_results(args: dict[str, Any]) -> dict[str, Any]:
        """Save OCR scan results to a stockpile."""
        regiment_id = args["regimentId"]
        user_id = args["userId"]
        stockpile_id = args["stockpileId"]
        items = args["items"]

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
                        {"type": "text", "text": json.dumps({"error": "Stockpile not found"})},
                    ],
                    "isError": True,
                }

            # Calculate average confidence
            avg_confidence = (
                sum(item.get("confidence", 0) for item in items) / len(items) / 100
                if items
                else 0
            )

            # Create scan record
            scan = StockpileScan(
                id=str(uuid.uuid4()),
                stockpileId=stockpile_id,
                scannedById=user_id,
                itemCount=len(items),
                ocrConfidence=avg_confidence,
            )
            session.add(scan)

            # Create scan items for history
            for item in items:
                scan_item = StockpileScanItem(
                    id=str(uuid.uuid4()),
                    scanId=scan.id,
                    itemCode=item["itemCode"],
                    quantity=item["quantity"],
                    crated=item.get("crated", False),
                    confidence=item.get("confidence", 0) / 100 if item.get("confidence") else None,
                )
                session.add(scan_item)

            # Delete all existing items then create new ones (matches web app behavior)
            await session.execute(
                delete(StockpileItem)
                .where(StockpileItem.stockpileId == stockpile_id)
            )

            # Create new items from scan
            for item in items:
                new_item = StockpileItem(
                    id=str(uuid.uuid4()),
                    stockpileId=stockpile_id,
                    itemCode=item["itemCode"],
                    quantity=item["quantity"],
                    crated=item.get("crated", False),
                    confidence=item.get("confidence", 0) / 100 if item.get("confidence") else None,
                )
                session.add(new_item)

            # Update stockpile timestamp
            stockpile.updatedAt = datetime.utcnow()

            await session.commit()

        return {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps({
                        "success": True,
                        "scanId": scan.id,
                        "stockpileId": stockpile_id,
                        "stockpileName": stockpile.name,
                        "itemsSaved": len(items),
                        "totalQuantity": sum(item["quantity"] for item in items),
                    }, indent=2),
                },
            ],
        }

    server.tool(
        "save_scan_results",
        "Save OCR scan results to a stockpile",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
            "userId": {
                "type": "string",
                "description": "User ID saving the scan",
                "required": True,
            },
            "stockpileId": {
                "type": "string",
                "description": "Stockpile ID to save items to",
                "required": True,
            },
            "items": {
                "type": "array",
                "description": "Items to save",
                "required": True,
            },
        },
        save_scan_results,
    )

    async def get_scanner_channel(args: dict[str, Any]) -> dict[str, Any]:
        """Get the configured scanner channel for a regiment."""
        regiment_id = args["regimentId"]

        async with get_session() as session:
            result = await session.execute(
                select(Regiment.scannerChannelId)
                .where(Regiment.discordId == regiment_id)
            )
            row = result.scalar()

            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps({
                            "scannerChannelId": row,
                        }),
                    },
                ],
            }

    server.tool(
        "get_scanner_channel",
        "Get the configured scanner channel ID for a regiment",
        {
            "regimentId": {
                "type": "string",
                "description": "Discord guild ID of the regiment",
                "required": True,
            },
        },
        get_scanner_channel,
    )

    async def resolve_discord_user(args: dict[str, Any]) -> dict[str, Any]:
        """Resolve a Discord user ID to an internal user ID."""
        discord_id = args["discordId"]

        async with get_session() as session:
            result = await session.execute(
                select(User.id)
                .where(User.discordId == discord_id)
            )
            user_id = result.scalar()

            if not user_id:
                return {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps({
                                "error": "User not found",
                                "message": "This Discord user has not signed in to Foxhole Quartermaster yet.",
                            }),
                        },
                    ],
                    "isError": True,
                }

            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps({
                            "userId": user_id,
                        }),
                    },
                ],
            }

    server.tool(
        "resolve_discord_user",
        "Resolve a Discord user ID to an internal user ID",
        {
            "discordId": {
                "type": "string",
                "description": "Discord user ID to look up",
                "required": True,
            },
        },
        resolve_discord_user,
    )
