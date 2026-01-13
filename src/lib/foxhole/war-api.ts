/**
 * Foxhole War API Client
 *
 * Fetches current war information from the official Foxhole War API.
 * Documentation: https://github.com/clapfoot/warapi
 *
 * API Endpoint: https://war-service-live.foxholeservices.com/api/worldconquest/war
 */

export interface WarState {
  warId: string;
  warNumber: number;
  winner: "NONE" | "WARDENS" | "COLONIALS";
  conquestStartTime: number | null;
  resistanceStartTime: number | null;
  requiredVictoryTowns: number;
}

// Simple in-memory cache
let cachedWarState: WarState | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const WAR_API_URL =
  "https://war-service-live.foxholeservices.com/api/worldconquest/war";

/**
 * Fetch current war state from Foxhole API
 * Results are cached for 5 minutes to avoid rate limiting
 */
export async function getCurrentWar(): Promise<WarState> {
  const now = Date.now();

  // Return cached result if still valid
  if (cachedWarState && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedWarState;
  }

  try {
    const response = await fetch(WAR_API_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`War API returned ${response.status}`);
    }

    const data = await response.json();

    cachedWarState = {
      warId: data.warId,
      warNumber: data.warNumber,
      winner: data.winner,
      conquestStartTime: data.conquestStartTime,
      resistanceStartTime: data.resistanceStartTime,
      requiredVictoryTowns: data.requiredVictoryTowns,
    };
    cacheTimestamp = now;

    return cachedWarState;
  } catch (error) {
    // If we have a cached value, return it even if expired
    if (cachedWarState) {
      console.warn("War API fetch failed, returning stale cache:", error);
      return cachedWarState;
    }
    throw error;
  }
}

/**
 * Calculate the current war day from conquest start time
 * Returns null if war hasn't started yet
 */
export function getWarDay(conquestStartTime: number | null): number | null {
  if (!conquestStartTime) return null;

  const now = Date.now();
  // API returns timestamp in milliseconds
  const elapsedMs = now - conquestStartTime;
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.floor(elapsedMs / dayMs) + 1; // Day 1 is the first day
}

/**
 * Get war status display info
 */
export async function getWarStatus(): Promise<{
  warNumber: number;
  warDay: number | null;
  winner: "NONE" | "WARDENS" | "COLONIALS";
  isActive: boolean;
}> {
  const war = await getCurrentWar();
  const warDay = getWarDay(war.conquestStartTime);

  return {
    warNumber: war.warNumber,
    warDay,
    winner: war.winner,
    isActive: war.winner === "NONE" && war.conquestStartTime !== null,
  };
}

/**
 * Force refresh the cache (useful after war ends)
 */
export function invalidateWarCache(): void {
  cachedWarState = null;
  cacheTimestamp = 0;
}
