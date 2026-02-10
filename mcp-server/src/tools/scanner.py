"""Scanner MCP tools - OCR processing for stockpile screenshots."""

import json
import uuid
import base64
from datetime import datetime
from typing import TYPE_CHECKING, Any

import httpx
from sqlalchemy import select

from ..config import settings
from ..db.session import get_session
from ..db.models import Stockpile, StockpileItem, StockpileScan, StockpileScanItem
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

                image_base64 = base64.b64encode(image_response.content).decode("utf-8")

                # Send to scanner service
                scan_response = await client.post(
                    f"{settings.scanner_url}/scan",
                    json={
                        "image": image_base64,
                        "faction": faction,
                    },
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

            # Upsert stockpile items (replace existing quantities)
            for item in items:
                item_code = item["itemCode"]
                crated = item.get("crated", False)

                # Check if item exists
                existing_result = await session.execute(
                    select(StockpileItem)
                    .where(StockpileItem.stockpileId == stockpile_id)
                    .where(StockpileItem.itemCode == item_code)
                    .where(StockpileItem.crated == crated)
                )
                existing = existing_result.scalar()

                if existing:
                    existing.quantity = item["quantity"]
                    existing.confidence = item.get("confidence", 0) / 100 if item.get("confidence") else None
                else:
                    new_item = StockpileItem(
                        id=str(uuid.uuid4()),
                        stockpileId=stockpile_id,
                        itemCode=item_code,
                        quantity=item["quantity"],
                        crated=crated,
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
