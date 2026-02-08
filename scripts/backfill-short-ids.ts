/**
 * Backfill script to generate shortIds for existing production orders
 *
 * Usage: bun run scripts/backfill-short-ids.ts
 */

import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function generateUniqueShortId(): Promise<string> {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    const shortId = nanoid(4);
    const existing = await prisma.productionOrder.findUnique({
      where: { shortId },
      select: { id: true },
    });
    if (!existing) return shortId;
  }
  // Fall back to longer ID if we hit unlikely collision streak
  return nanoid(8);
}

async function main() {
  console.log("Starting shortId backfill for production orders...\n");

  // Find all orders without a shortId
  const ordersWithoutShortId = await prisma.productionOrder.findMany({
    where: { shortId: null },
    select: { id: true, name: true },
  });

  console.log(`Found ${ordersWithoutShortId.length} orders without shortId\n`);

  if (ordersWithoutShortId.length === 0) {
    console.log("No orders to update. Done!");
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const order of ordersWithoutShortId) {
    try {
      const shortId = await generateUniqueShortId();
      await prisma.productionOrder.update({
        where: { id: order.id },
        data: { shortId },
      });
      console.log(`  ✓ ${order.name} -> ${shortId}`);
      updated++;
    } catch (error) {
      console.error(`  ✗ Failed to update ${order.name}:`, error);
      failed++;
    }
  }

  console.log(`\nBackfill complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
}

main()
  .catch((e) => {
    console.error("Backfill script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
