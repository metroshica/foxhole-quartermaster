/**
 * Tests for GET /api/inventory/aggregate
 *
 * Strategy: Mock auth and prisma, then dynamically import the route handler.
 */
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

// --- Mock factories ---

// Use Promise<any> so mockImplementationOnce can return null or session objects flexibly
const mockAuth = mock((): Promise<any> =>
  Promise.resolve({
    user: {
      id: "user1",
      permissions: ["stockpile.view"],
    },
  })
);

const mockUserFindUnique = mock((): Promise<any> =>
  Promise.resolve({ selectedRegimentId: "regiment1" })
);

const mockStockpileItemFindMany = mock((): Promise<any[]> => Promise.resolve([]));

// --- Module mocks ---

mock.module("@/lib/auth/auth", () => ({
  auth: mockAuth,
}));

mock.module("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    stockpileItem: {
      findMany: mockStockpileItemFindMany,
    },
  },
}));

mock.module("@/lib/telemetry/tracing", () => ({
  withSpan: async (_name: string, fn: () => unknown) => fn(),
  addSpanAttributes: () => {},
}));

// Dynamic import AFTER mocks
const { GET } = await import("../route");

// --- Reset mocks between tests ---
beforeEach(() => {
  mockAuth.mockReset();
  mockAuth.mockImplementation(() =>
    Promise.resolve({
      user: { id: "user1", permissions: ["stockpile.view"] },
    })
  );

  mockUserFindUnique.mockReset();
  mockUserFindUnique.mockImplementation(() =>
    Promise.resolve({ selectedRegimentId: "regiment1" })
  );

  mockStockpileItemFindMany.mockReset();
  mockStockpileItemFindMany.mockImplementation(() => Promise.resolve([]));
});

// --- Tests ---

describe("GET /api/inventory/aggregate", () => {
  test("returns 401 when not authenticated", async () => {
    mockAuth.mockImplementationOnce(() => Promise.resolve(null));

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate"
    );
    const response = await GET(request as never);
    expect(response.status).toBe(401);
  });

  test("returns 400 when no regiment is selected", async () => {
    mockUserFindUnique.mockImplementationOnce(() =>
      Promise.resolve({ selectedRegimentId: null })
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate"
    );
    const response = await GET(request as never);
    expect(response.status).toBe(400);
  });

  test("returns empty result when user lacks stockpile.view permission", async () => {
    mockAuth.mockImplementationOnce(() =>
      Promise.resolve({
        user: { id: "user1", permissions: [] }, // no view permission
      })
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate"
    );
    const response = await GET(request as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toEqual([]);
    expect(data.totalUniqueItems).toBe(0);
  });

  test("returns 200 with aggregated items", async () => {
    mockStockpileItemFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        { itemCode: "Cloth", quantity: 100, crated: false, stockpileId: "sp-1" },
        { itemCode: "Cloth", quantity: 50, crated: true, stockpileId: "sp-2" },
        { itemCode: "Components", quantity: 30, crated: false, stockpileId: "sp-1" },
      ])
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate"
    );
    const response = await GET(request as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalUniqueItems).toBe(2); // Cloth and Components
    expect(data.items.length).toBe(2);
  });

  test("aggregates quantities for same item across stockpiles", async () => {
    mockStockpileItemFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        { itemCode: "Cloth", quantity: 100, crated: false, stockpileId: "sp-1" },
        { itemCode: "Cloth", quantity: 200, crated: false, stockpileId: "sp-2" },
      ])
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate"
    );
    const response = await GET(request as never);
    const data = await response.json();
    const clothItem = data.items.find((i: { itemCode: string }) => i.itemCode === "Cloth");
    expect(clothItem).toBeDefined();
    expect(clothItem.totalQuantity).toBe(300);
    expect(clothItem.stockpileCount).toBe(2);
  });

  test("separates crated and loose quantities", async () => {
    mockStockpileItemFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        { itemCode: "RifleC", quantity: 50, crated: true, stockpileId: "sp-1" },
        { itemCode: "RifleC", quantity: 10, crated: false, stockpileId: "sp-1" },
      ])
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate"
    );
    const response = await GET(request as never);
    const data = await response.json();
    const rifleItem = data.items.find((i: { itemCode: string }) => i.itemCode === "RifleC");
    expect(rifleItem).toBeDefined();
    expect(rifleItem.cratedQuantity).toBe(50);
    expect(rifleItem.looseQuantity).toBe(10);
    expect(rifleItem.totalQuantity).toBe(60);
  });

  test("filters by search term (display name match)", async () => {
    mockStockpileItemFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        { itemCode: "Cloth", quantity: 100, crated: false, stockpileId: "sp-1" },
        { itemCode: "Components", quantity: 50, crated: false, stockpileId: "sp-1" },
      ])
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate?search=basic+materials"
    );
    const response = await GET(request as never);
    const data = await response.json();
    // Only "Cloth" (Basic Materials) should match
    expect(data.items.length).toBe(1);
    expect(data.items[0].itemCode).toBe("Cloth");
  });

  test("filters by tag/abbreviation (bmat -> Cloth)", async () => {
    mockStockpileItemFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        { itemCode: "Cloth", quantity: 100, crated: false, stockpileId: "sp-1" },
        { itemCode: "Components", quantity: 50, crated: false, stockpileId: "sp-1" },
      ])
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate?search=bmat"
    );
    const response = await GET(request as never);
    const data = await response.json();
    expect(data.items.length).toBe(1);
    expect(data.items[0].itemCode).toBe("Cloth");
    expect(data.items[0].matchedTag).toBe("BMAT");
  });

  test("filters by category=vehicles returns only vehicle items", async () => {
    mockStockpileItemFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        { itemCode: "TruckC", quantity: 5, crated: false, stockpileId: "sp-1" },
        { itemCode: "Cloth", quantity: 100, crated: false, stockpileId: "sp-1" },
        { itemCode: "LightTankC", quantity: 2, crated: false, stockpileId: "sp-1" },
      ])
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate?category=vehicles"
    );
    const response = await GET(request as never);
    const data = await response.json();
    // Only TruckC and LightTankC should be returned
    expect(data.items.length).toBe(2);
    const codes = data.items.map((i: { itemCode: string }) => i.itemCode);
    expect(codes).toContain("TruckC");
    expect(codes).toContain("LightTankC");
    expect(codes).not.toContain("Cloth");
  });

  test("respects limit parameter", async () => {
    const manyItems = Array.from({ length: 100 }, (_, i) => ({
      itemCode: `Item${i}`,
      quantity: i + 1,
      crated: false,
      stockpileId: "sp-1",
    }));
    mockStockpileItemFindMany.mockImplementationOnce(() =>
      Promise.resolve(manyItems)
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate?limit=10"
    );
    const response = await GET(request as never);
    const data = await response.json();
    expect(data.items.length).toBeLessThanOrEqual(10);
  });

  test("returns items sorted by total quantity descending", async () => {
    mockStockpileItemFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        { itemCode: "Cloth", quantity: 10, crated: false, stockpileId: "sp-1" },
        { itemCode: "Components", quantity: 500, crated: false, stockpileId: "sp-1" },
        { itemCode: "RifleAmmo", quantity: 100, crated: false, stockpileId: "sp-1" },
      ])
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate"
    );
    const response = await GET(request as never);
    const data = await response.json();
    const quantities = data.items.map((i: { totalQuantity: number }) => i.totalQuantity);
    expect(quantities[0]).toBeGreaterThanOrEqual(quantities[1]);
    expect(quantities[1]).toBeGreaterThanOrEqual(quantities[2]);
  });

  test("includes display name for each item", async () => {
    mockStockpileItemFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        { itemCode: "Cloth", quantity: 100, crated: false, stockpileId: "sp-1" },
      ])
    );

    const request = new NextRequest(
      "http://localhost/api/inventory/aggregate"
    );
    const response = await GET(request as never);
    const data = await response.json();
    expect(data.items[0].displayName).toBe("Basic Materials");
  });
});
