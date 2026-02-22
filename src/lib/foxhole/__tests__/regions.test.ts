import { describe, test, expect } from "bun:test";
import {
  getHexNames,
  getLocationsForHex,
  getHexLocationMap,
  FOXHOLE_REGIONS,
} from "@/lib/foxhole/regions";

describe("getHexNames", () => {
  test("returns a non-empty array of strings", () => {
    const names = getHexNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(0);
    expect(typeof names[0]).toBe("string");
  });

  test("returns names in sorted (alphabetical) order", () => {
    const names = getHexNames();
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  test("includes expected hex regions", () => {
    const names = getHexNames();
    expect(names).toContain("Westgate");
    expect(names).toContain("Fisherman's Row");
    expect(names).toContain("King's Cage");
    expect(names).toContain("Deadlands");
    expect(names).toContain("The Moors");
  });

  test("returns at least 40 hex regions", () => {
    expect(getHexNames().length).toBeGreaterThanOrEqual(40);
  });

  test("contains no duplicates", () => {
    const names = getHexNames();
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

describe("getLocationsForHex", () => {
  test("returns locations for Westgate", () => {
    const locations = getLocationsForHex("Westgate");
    expect(locations.length).toBeGreaterThan(0);
    expect(locations).toContain("The Gallows");
    expect(locations).toContain("Westgate Keep");
  });

  test("returns sorted locations", () => {
    const locations = getLocationsForHex("Westgate");
    const sorted = [...locations].sort();
    expect(locations).toEqual(sorted);
  });

  test("returns locations for Fisherman's Row", () => {
    const locations = getLocationsForHex("Fisherman's Row");
    expect(locations.length).toBeGreaterThan(0);
  });

  test("returns empty array for unknown hex", () => {
    const locations = getLocationsForHex("NonExistentHex");
    expect(locations).toEqual([]);
  });

  test("returns empty array for empty string", () => {
    const locations = getLocationsForHex("");
    expect(locations).toEqual([]);
  });

  test("is case-sensitive (wrong case returns empty)", () => {
    const locations = getLocationsForHex("westgate");
    expect(locations).toEqual([]);
  });
});

describe("getHexLocationMap", () => {
  test("returns an object with hex names as keys", () => {
    const map = getHexLocationMap();
    expect(typeof map).toBe("object");
    expect(map["Westgate"]).toBeDefined();
    expect(map["Fisherman's Row"]).toBeDefined();
  });

  test("includes all hexes from getHexNames()", () => {
    const map = getHexLocationMap();
    const hexNames = getHexNames();
    for (const hex of hexNames) {
      expect(map[hex]).toBeDefined();
    }
  });

  test("Westgate locations in map match getLocationsForHex", () => {
    const map = getHexLocationMap();
    const direct = getLocationsForHex("Westgate");
    expect(map["Westgate"]).toEqual(direct);
  });
});

describe("FOXHOLE_REGIONS data integrity", () => {
  test("all regions have a non-empty name", () => {
    for (const region of FOXHOLE_REGIONS) {
      expect(typeof region.name).toBe("string");
      expect(region.name.length).toBeGreaterThan(0);
    }
  });

  test("all regions have at least 1 location", () => {
    for (const region of FOXHOLE_REGIONS) {
      expect(region.locations.length).toBeGreaterThan(0);
    }
  });

  test("no duplicate region names", () => {
    const names = FOXHOLE_REGIONS.map((r) => r.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  test("all location names are non-empty strings", () => {
    for (const region of FOXHOLE_REGIONS) {
      for (const loc of region.locations) {
        expect(typeof loc).toBe("string");
        expect(loc.length).toBeGreaterThan(0);
      }
    }
  });
});
