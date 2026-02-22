import { describe, test, expect } from "bun:test";
import {
  getItemDisplayName,
  ITEM_DISPLAY_NAMES,
} from "@/lib/foxhole/item-names";

describe("getItemDisplayName", () => {
  test("returns display name for a known rifle code", () => {
    expect(getItemDisplayName("RifleC")).toBe("Argenti r.II Rifle");
  });

  test("returns display name for basic materials (Cloth)", () => {
    expect(getItemDisplayName("Cloth")).toBe("Basic Materials");
  });

  test("returns display name for refined materials (Wood)", () => {
    expect(getItemDisplayName("Wood")).toBe("Refined Materials");
  });

  test("returns display name for HE grenade", () => {
    expect(getItemDisplayName("HEGrenade")).toBe("Mammon 91-b");
  });

  test("returns display name for a truck", () => {
    expect(getItemDisplayName("TruckC")).toBe("R-1 Hauler");
  });

  test("returns display name for components", () => {
    expect(getItemDisplayName("Components")).toBe("Components");
  });

  test("returns the item code itself for unknown codes", () => {
    expect(getItemDisplayName("NonExistentItemCode")).toBe(
      "NonExistentItemCode"
    );
  });

  test("returns item code for empty-ish unknown codes", () => {
    expect(getItemDisplayName("ZZZUnknown")).toBe("ZZZUnknown");
  });
});

describe("ITEM_DISPLAY_NAMES data integrity", () => {
  test("contains required common items", () => {
    expect(ITEM_DISPLAY_NAMES["RifleC"]).toBeDefined();
    expect(ITEM_DISPLAY_NAMES["Cloth"]).toBeDefined();
    expect(ITEM_DISPLAY_NAMES["Components"]).toBeDefined();
    expect(ITEM_DISPLAY_NAMES["HEGrenade"]).toBeDefined();
    expect(ITEM_DISPLAY_NAMES["TruckC"]).toBeDefined();
  });

  test("contains at least 100 items", () => {
    expect(Object.keys(ITEM_DISPLAY_NAMES).length).toBeGreaterThan(100);
  });

  test("all display names are non-empty strings", () => {
    for (const [, name] of Object.entries(ITEM_DISPLAY_NAMES)) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test("all item codes are non-empty strings", () => {
    for (const code of Object.keys(ITEM_DISPLAY_NAMES)) {
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
    }
  });

  test("contains all major ammo types", () => {
    expect(ITEM_DISPLAY_NAMES["RifleAmmo"]).toBeDefined(); // 7.62mm
    expect(ITEM_DISPLAY_NAMES["MGAmmo"]).toBeDefined(); // 12.7mm
    expect(ITEM_DISPLAY_NAMES["MortarAmmo"]).toBeDefined();
    expect(ITEM_DISPLAY_NAMES["BattleTankAmmo"]).toBeDefined(); // 75mm
  });

  test("contains key vehicles", () => {
    expect(ITEM_DISPLAY_NAMES["LightTankC"]).toBeDefined();
    expect(ITEM_DISPLAY_NAMES["BattleTankW"]).toBeDefined();
    expect(ITEM_DISPLAY_NAMES["TruckW"]).toBeDefined();
  });
});
