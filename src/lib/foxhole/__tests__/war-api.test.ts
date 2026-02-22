import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  getWarDay,
  getCurrentWar,
  getWarStatus,
  invalidateWarCache,
  type WarState,
} from "@/lib/foxhole/war-api";

const mockWarData: WarState = {
  warId: "war-120",
  warNumber: 120,
  winner: "NONE",
  conquestStartTime: 1700000000000,
  resistanceStartTime: null,
  requiredVictoryTowns: 32,
};

// Save original fetch
const originalFetch = globalThis.fetch;

/**
 * Type-safe helper to mock globalThis.fetch in tests.
 * Bun's fetch type includes `preconnect` which simple mock fns don't have,
 * so we cast through unknown.
 */
function setFetchMock(
  fn: (url: string | URL | Request, init?: RequestInit) => Promise<Response>
): void {
  (globalThis as unknown as { fetch: typeof fn }).fetch = fn;
}

beforeEach(() => {
  // Clear the module-level cache before each test
  invalidateWarCache();
});

afterEach(() => {
  // Restore original fetch
  globalThis.fetch = originalFetch;
  invalidateWarCache();
});

describe("getWarDay", () => {
  test("returns null for null conquestStartTime", () => {
    expect(getWarDay(null)).toBeNull();
  });

  test("returns 1 when war just started (current time)", () => {
    const result = getWarDay(Date.now());
    expect(result).toBe(1);
  });

  test("returns 2 when war started over 1 day ago", () => {
    // 25 hours ago = day 2
    const oneDayAndAnHourAgo = Date.now() - 25 * 60 * 60 * 1000;
    expect(getWarDay(oneDayAndAnHourAgo)).toBe(2);
  });

  test("returns 4 when war started 3 days ago", () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000 - 1000;
    expect(getWarDay(threeDaysAgo)).toBe(4);
  });

  test("returns 8 when war started 7 days ago", () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000;
    expect(getWarDay(sevenDaysAgo)).toBe(8);
  });
});

describe("getCurrentWar", () => {
  test("fetches and returns war state from API", async () => {
    setFetchMock(async () =>
      new Response(JSON.stringify(mockWarData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const war = await getCurrentWar();
    expect(war.warNumber).toBe(120);
    expect(war.winner).toBe("NONE");
    expect(war.warId).toBe("war-120");
    expect(war.requiredVictoryTowns).toBe(32);
  });

  test("caches results and avoids redundant fetches", async () => {
    let callCount = 0;
    setFetchMock(async () => {
      callCount++;
      return new Response(JSON.stringify(mockWarData), { status: 200 });
    });

    await getCurrentWar();
    await getCurrentWar();
    await getCurrentWar();

    // Only one actual fetch should have occurred due to caching
    expect(callCount).toBe(1);
  });

  test("throws when API returns error and no cache exists", async () => {
    setFetchMock(async () => new Response("", { status: 503 }));

    await expect(getCurrentWar()).rejects.toThrow();
  });

  test("returns stale cache when API fails after first successful fetch", async () => {
    // First call succeeds and populates cache
    setFetchMock(async () =>
      new Response(JSON.stringify(mockWarData), { status: 200 })
    );
    await getCurrentWar();

    // Second call fails - should return stale cache
    setFetchMock(async () => {
      throw new Error("Network error");
    });

    const war = await getCurrentWar();
    expect(war.warNumber).toBe(120);
  });
});

describe("invalidateWarCache", () => {
  test("forces a fresh fetch after cache is cleared", async () => {
    let callCount = 0;
    setFetchMock(async () => {
      callCount++;
      return new Response(JSON.stringify(mockWarData), { status: 200 });
    });

    await getCurrentWar(); // First fetch
    expect(callCount).toBe(1);

    invalidateWarCache(); // Clear cache

    await getCurrentWar(); // Should fetch again
    expect(callCount).toBe(2);
  });

  test("allows different war data after cache clear", async () => {
    setFetchMock(async () =>
      new Response(JSON.stringify(mockWarData), { status: 200 })
    );
    await getCurrentWar();

    const updatedWarData = { ...mockWarData, warNumber: 121 };
    setFetchMock(async () =>
      new Response(JSON.stringify(updatedWarData), { status: 200 })
    );

    invalidateWarCache();
    const war = await getCurrentWar();
    expect(war.warNumber).toBe(121);
  });
});

describe("getWarStatus", () => {
  test("returns status with warNumber, warDay, winner, and isActive", async () => {
    const activeWarData: WarState = {
      ...mockWarData,
      conquestStartTime: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    };

    setFetchMock(async () =>
      new Response(JSON.stringify(activeWarData), { status: 200 })
    );

    const status = await getWarStatus();
    expect(status.warNumber).toBe(120);
    expect(status.winner).toBe("NONE");
    expect(status.isActive).toBe(true);
    expect(status.warDay).toBeGreaterThan(0);
  });

  test("isActive is false when war has a winner", async () => {
    const completedWarData: WarState = {
      ...mockWarData,
      winner: "WARDENS",
    };

    setFetchMock(async () =>
      new Response(JSON.stringify(completedWarData), { status: 200 })
    );

    const status = await getWarStatus();
    expect(status.isActive).toBe(false);
    expect(status.winner).toBe("WARDENS");
  });

  test("warDay is null when conquest has not started", async () => {
    const preWarData: WarState = {
      ...mockWarData,
      conquestStartTime: null,
    };

    setFetchMock(async () =>
      new Response(JSON.stringify(preWarData), { status: 200 })
    );

    const status = await getWarStatus();
    expect(status.warDay).toBeNull();
    expect(status.isActive).toBe(false);
  });
});
