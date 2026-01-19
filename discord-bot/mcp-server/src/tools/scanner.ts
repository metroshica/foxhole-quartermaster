import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../db.js";
import { getItemDisplayName } from "../utils/items.js";

const SCANNER_URL = process.env.SCANNER_URL || "http://localhost:8001";

interface ScannerResult {
  items: Array<{
    code: string;
    quantity: number;
    crated: boolean;
    confidence: number;
  }>;
  faction?: string;
  error?: string;
}

export function registerScannerTools(server: McpServer): void {
  // scan_screenshot - Process a stockpile screenshot via OCR
  server.tool(
    "scan_screenshot",
    "Process a stockpile screenshot via OCR to extract item inventory",
    {
      imageUrl: z.string().url().describe("URL of the screenshot to process"),
      faction: z.enum(["colonials", "wardens", "all"]).optional().default("all"),
    },
    async ({ imageUrl, faction }) => {
      try {
        // Download the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          return {
            content: [
              { type: "text" as const, text: JSON.stringify({ error: "Failed to download image" }) },
            ],
            isError: true,
          };
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString("base64");

        // Send to scanner service
        const scanResponse = await fetch(`${SCANNER_URL}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageBase64,
            faction: faction || "all",
          }),
        });

        if (!scanResponse.ok) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "Scanner service error",
                  status: scanResponse.status,
                }),
              },
            ],
            isError: true,
          };
        }

        const result: ScannerResult = await scanResponse.json();

        if (result.error) {
          return {
            content: [
              { type: "text" as const, text: JSON.stringify({ error: result.error }) },
            ],
            isError: true,
          };
        }

        // Format results with display names
        const items = result.items.map((item) => ({
          itemCode: item.code,
          displayName: getItemDisplayName(item.code),
          quantity: item.quantity,
          crated: item.crated,
          confidence: Math.round(item.confidence * 100),
        }));

        // Sort by quantity descending
        items.sort((a, b) => b.quantity - a.quantity);

        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const avgConfidence = items.length > 0
          ? Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length)
          : 0;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                itemCount: items.length,
                totalQuantity: totalItems,
                averageConfidence: avgConfidence,
                faction: result.faction || faction,
                items,
                note: "Use save_scan_results to save these items to a stockpile",
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Failed to process screenshot",
                details: error instanceof Error ? error.message : "Unknown error",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // save_scan_results - Save scanned items to a stockpile
  server.tool(
    "save_scan_results",
    "Save OCR scan results to a stockpile",
    {
      regimentId: z.string().describe("Discord guild ID of the regiment"),
      userId: z.string().describe("User ID saving the scan"),
      stockpileId: z.string().describe("Stockpile ID to save items to"),
      items: z.array(z.object({
        itemCode: z.string(),
        quantity: z.number().min(0),
        crated: z.boolean().optional().default(false),
        confidence: z.number().min(0).max(100).optional(),
      })).min(1),
    },
    async ({ regimentId, userId, stockpileId, items }) => {
      // Verify stockpile belongs to regiment
      const stockpile = await prisma.stockpile.findFirst({
        where: { id: stockpileId, regimentId },
      });

      if (!stockpile) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ error: "Stockpile not found" }) },
          ],
          isError: true,
        };
      }

      // Create scan record and upsert items in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create scan record
        const scan = await tx.stockpileScan.create({
          data: {
            stockpileId,
            scannedById: userId,
            itemCount: items.length,
            ocrConfidence: items.reduce((sum, i) => sum + (i.confidence || 0), 0) / items.length / 100,
          },
        });

        // Create scan items for history
        await tx.stockpileScanItem.createMany({
          data: items.map((item) => ({
            scanId: scan.id,
            itemCode: item.itemCode,
            quantity: item.quantity,
            crated: item.crated || false,
            confidence: item.confidence ? item.confidence / 100 : null,
          })),
        });

        // Upsert stockpile items (replace existing quantities)
        for (const item of items) {
          await tx.stockpileItem.upsert({
            where: {
              stockpileId_itemCode_crated: {
                stockpileId,
                itemCode: item.itemCode,
                crated: item.crated || false,
              },
            },
            create: {
              stockpileId,
              itemCode: item.itemCode,
              quantity: item.quantity,
              crated: item.crated || false,
              confidence: item.confidence ? item.confidence / 100 : null,
            },
            update: {
              quantity: item.quantity,
              confidence: item.confidence ? item.confidence / 100 : null,
            },
          });
        }

        // Update stockpile timestamp
        await tx.stockpile.update({
          where: { id: stockpileId },
          data: { updatedAt: new Date() },
        });

        return scan;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              scanId: result.id,
              stockpileId,
              stockpileName: stockpile.name,
              itemsSaved: items.length,
              totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
            }, null, 2),
          },
        ],
      };
    }
  );
}
