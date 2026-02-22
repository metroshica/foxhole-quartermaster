/**
 * Tests for GET /api/stockpiles and POST /api/stockpiles
 *
 * Strategy: Mock all external dependencies (auth, prisma, telemetry) then
 * dynamically import the route handler so the mocks are applied first.
 */
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { NextResponse } from "next/server";

// --- Mock factories (defined before mock.module so they can be reconfigured) ---

// Use Promise<any> so mockImplementationOnce can return NextResponse or AuthContext
const mockRequireAuth = mock(
  (): Promise<any> =>
    Promise.resolve({
      session: {
        user: { id: "user1", permissions: ["stockpile.view", "stockpile.create"] },
      },
      userId: "user1",
      regimentId: "regiment1",
    })
);

const mockRequirePermission = mock(
  (): Promise<any> =>
    Promise.resolve({
      session: {
        user: {
          id: "user1",
          permissions: ["stockpile.view", "stockpile.create"],
        },
      },
      userId: "user1",
      regimentId: "regiment1",
    })
);

const mockHasPermission = mock(() => true);

const mockStockpileFindMany = mock((): Promise<any[]> => Promise.resolve([]));

const mockTransaction = mock(async (fn: (tx: Record<string, unknown>) => unknown) => {
  const mockTx = {
    stockpile: {
      create: mock(() =>
        Promise.resolve({
          id: "sp-new",
          name: "Test Stockpile",
          type: "SEAPORT",
          hex: "Westgate",
          locationName: "The Gallows",
          code: null,
          regimentId: "regiment1",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastRefreshedAt: null,
        })
      ),
      findUnique: mock(() =>
        Promise.resolve({
          id: "sp-new",
          name: "Test Stockpile",
          type: "SEAPORT",
          hex: "Westgate",
          locationName: "The Gallows",
          code: null,
          items: [],
        })
      ),
    },
    stockpileItem: {
      createMany: mock(() => Promise.resolve({ count: 0 })),
    },
    stockpileScan: {
      create: mock(() => Promise.resolve({ id: "scan-1" })),
    },
  };
  return fn(mockTx);
});

// --- Module mocks (must be called before dynamic import of the route) ---

mock.module("@/lib/auth/check-permission", () => ({
  requireAuth: mockRequireAuth,
  requirePermission: mockRequirePermission,
  hasPermission: mockHasPermission,
}));

mock.module("@/lib/db/prisma", () => ({
  prisma: {
    stockpile: {
      findMany: mockStockpileFindMany,
    },
    $transaction: mockTransaction,
  },
}));

mock.module("@/lib/telemetry/tracing", () => ({
  withSpan: async (_name: string, fn: () => unknown) => fn(),
  addSpanAttributes: () => {},
}));

mock.module("@/lib/foxhole/war-api", () => ({
  getCurrentWar: mock(() => Promise.resolve({ warNumber: 120 })),
}));

// Dynamic import AFTER mocks are registered
const { GET, POST } = await import("../route");

// --- Helper to reset mock implementations between tests ---
beforeEach(() => {
  mockRequireAuth.mockReset();
  mockRequireAuth.mockImplementation(() =>
    Promise.resolve({
      session: {
        user: {
          id: "user1",
          permissions: ["stockpile.view", "stockpile.create"],
        },
      },
      userId: "user1",
      regimentId: "regiment1",
    })
  );

  mockRequirePermission.mockReset();
  mockRequirePermission.mockImplementation(() =>
    Promise.resolve({
      session: {
        user: {
          id: "user1",
          permissions: ["stockpile.view", "stockpile.create"],
        },
      },
      userId: "user1",
      regimentId: "regiment1",
    })
  );

  mockHasPermission.mockReset();
  mockHasPermission.mockImplementation(() => true);

  mockStockpileFindMany.mockReset();
  mockStockpileFindMany.mockImplementation(() => Promise.resolve([]));
});

// --- GET /api/stockpiles ---

describe("GET /api/stockpiles", () => {
  test("returns 200 with empty array when no stockpiles exist", async () => {
    const request = new Request("http://localhost/api/stockpiles");
    const response = await GET(request as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  test("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockImplementationOnce(() =>
      Promise.resolve(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );

    const request = new Request("http://localhost/api/stockpiles");
    const response = await GET(request as never);
    expect(response.status).toBe(401);
  });

  test("returns empty array when user lacks stockpile.view permission", async () => {
    mockHasPermission.mockImplementationOnce(() => false);

    const request = new Request("http://localhost/api/stockpiles");
    const response = await GET(request as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  test("returns 200 with stockpile data when stockpiles exist", async () => {
    const mockStockpiles = [
      {
        id: "sp-1",
        name: "Main Store",
        type: "SEAPORT",
        hex: "Westgate",
        locationName: "The Gallows",
        regimentId: "regiment1",
        code: null,
        lastRefreshedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [{ quantity: 50 }],
        scans: [
          {
            createdAt: new Date(),
            scannedBy: { id: "user1", name: "Test User", image: null },
          },
        ],
        _count: { items: 1 },
      },
    ];

    mockStockpileFindMany.mockImplementationOnce(() =>
      Promise.resolve(mockStockpiles)
    );

    const request = new Request("http://localhost/api/stockpiles");
    const response = await GET(request as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].id).toBe("sp-1");
    expect(data[0].name).toBe("Main Store");
  });

  test("includes lastScan and totalCrates in response", async () => {
    const scanDate = new Date();
    mockStockpileFindMany.mockImplementationOnce(() =>
      Promise.resolve([
        {
          id: "sp-1",
          name: "Alpha",
          type: "SEAPORT",
          hex: "Westgate",
          locationName: "The Gallows",
          regimentId: "regiment1",
          code: null,
          lastRefreshedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [{ quantity: 10 }, { quantity: 20 }],
          scans: [
            {
              createdAt: scanDate,
              scannedBy: { id: "u1", name: "Alpha", image: null },
            },
          ],
          _count: { items: 2 },
        },
      ])
    );

    const request = new Request("http://localhost/api/stockpiles");
    const response = await GET(request as never);
    const data = await response.json();
    expect(data[0].totalCrates).toBe(30); // 10 + 20
    expect(data[0].lastScan).toBeDefined();
  });
});

// --- POST /api/stockpiles ---

describe("POST /api/stockpiles", () => {
  const validBody = {
    name: "Test Stockpile",
    type: "SEAPORT",
    hex: "Westgate",
    locationName: "The Gallows",
    items: [],
  };

  test("returns 201 when creating a valid stockpile", async () => {
    const request = new Request("http://localhost/api/stockpiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(201);
  });

  test("returns 401 when not authenticated", async () => {
    mockRequirePermission.mockImplementationOnce(() =>
      Promise.resolve(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );

    const request = new Request("http://localhost/api/stockpiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(401);
  });

  test("returns 403 when user lacks stockpile.create permission", async () => {
    mockRequirePermission.mockImplementationOnce(() =>
      Promise.resolve(
        NextResponse.json(
          { error: "You don't have permission to perform this action" },
          { status: 403 }
        )
      )
    );

    const request = new Request("http://localhost/api/stockpiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(403);
  });

  test("returns 400 for missing required fields", async () => {
    const invalidBody = { name: "", type: "SEAPORT" }; // missing hex, locationName
    const request = new Request("http://localhost/api/stockpiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidBody),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
  });

  test("returns 400 for invalid stockpile type", async () => {
    const invalidBody = {
      ...validBody,
      type: "INVALID_TYPE",
    };
    const request = new Request("http://localhost/api/stockpiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidBody),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
  });

  test("returns 409 when stockpile name already exists", async () => {
    mockTransaction.mockImplementationOnce(() => {
      const error = Object.assign(new Error("Unique constraint"), {
        code: "P2002",
      });
      throw error;
    });

    const request = new Request("http://localhost/api/stockpiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(409);
  });

  test("accepts optional code field", async () => {
    const bodyWithCode = { ...validBody, code: "ABC123" };
    const request = new Request("http://localhost/api/stockpiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyWithCode),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(201);
  });

  test("accepts items array with valid items", async () => {
    const bodyWithItems = {
      ...validBody,
      items: [
        { code: "RifleC", quantity: 100, crated: true, confidence: 0.95 },
        { code: "Cloth", quantity: 50, crated: false },
      ],
    };
    const request = new Request("http://localhost/api/stockpiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyWithItems),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(201);
  });
});
