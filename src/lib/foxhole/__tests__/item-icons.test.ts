import { describe, test, expect } from "bun:test";
import {
  getItemIconUrl,
  isVehicle,
  getVehicleItemCodes,
} from "@/lib/foxhole/item-icons";

describe("getItemIconUrl", () => {
  test("returns a path starting with /icons/ for known items", () => {
    const url = getItemIconUrl("RifleC");
    expect(url.startsWith("/icons/")).toBe(true);
    expect(url.endsWith(".png")).toBe(true);
  });

  test("returns items/ path for a rifle", () => {
    const url = getItemIconUrl("RifleC");
    expect(url).toBe("/icons/items/RifleCItemIcon.png");
  });

  test("returns items/ path for grenades", () => {
    const url = getItemIconUrl("HEGrenade");
    expect(url).toBe("/icons/items/HEGrenadeItemIcon.png");
  });

  test("returns vehicles/ path for truck", () => {
    const url = getItemIconUrl("TruckC");
    expect(url).toBe("/icons/vehicles/TruckVehicleIcon.png");
  });

  test("returns vehicles/ path for light tank", () => {
    const url = getItemIconUrl("LightTankC");
    expect(url.startsWith("/icons/vehicles/")).toBe(true);
  });

  test("returns fallback for unknown item codes", () => {
    const url = getItemIconUrl("UnknownItemCode");
    expect(url).toBe("/icons/items/CrateItemIcon.png");
  });

  test("vehicle icons use /icons/ prefix (no leading slash duplication)", () => {
    const url = getItemIconUrl("BattleTankC");
    expect(url).not.toContain("//");
    expect(url.startsWith("/icons/vehicles/")).toBe(true);
  });
});

describe("isVehicle", () => {
  test("returns true for truck", () => {
    expect(isVehicle("TruckC")).toBe(true);
  });

  test("returns true for light tank", () => {
    expect(isVehicle("LightTankC")).toBe(true);
  });

  test("returns true for battle tank", () => {
    expect(isVehicle("BattleTankW")).toBe(true);
  });

  test("returns true for halftrack", () => {
    expect(isVehicle("HalfTrackC")).toBe(true);
  });

  test("returns false for rifle", () => {
    expect(isVehicle("RifleC")).toBe(false);
  });

  test("returns false for basic materials", () => {
    expect(isVehicle("Cloth")).toBe(false);
  });

  test("returns false for grenades", () => {
    expect(isVehicle("HEGrenade")).toBe(false);
  });

  test("returns false for unknown items", () => {
    expect(isVehicle("UnknownItem")).toBe(false);
  });
});

describe("getVehicleItemCodes", () => {
  test("returns a non-empty array", () => {
    const vehicles = getVehicleItemCodes();
    expect(Array.isArray(vehicles)).toBe(true);
    expect(vehicles.length).toBeGreaterThan(0);
  });

  test("includes common vehicles", () => {
    const vehicles = getVehicleItemCodes();
    expect(vehicles).toContain("TruckC");
    expect(vehicles).toContain("LightTankC");
    expect(vehicles).toContain("BattleTankW");
    expect(vehicles).toContain("HalfTrackC");
  });

  test("does not include non-vehicle items", () => {
    const vehicles = getVehicleItemCodes();
    expect(vehicles).not.toContain("RifleC");
    expect(vehicles).not.toContain("Cloth");
    expect(vehicles).not.toContain("HEGrenade");
    expect(vehicles).not.toContain("Components");
  });

  test("all returned codes pass isVehicle check", () => {
    const vehicles = getVehicleItemCodes();
    for (const code of vehicles) {
      expect(isVehicle(code)).toBe(true);
    }
  });

  test("returns at least 50 vehicle types", () => {
    expect(getVehicleItemCodes().length).toBeGreaterThan(50);
  });
});
