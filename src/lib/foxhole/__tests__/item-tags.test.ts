import { describe, test, expect } from "bun:test";
import {
  getItemCodesByTag,
  getTagsForItem,
  ITEM_TAGS,
} from "@/lib/foxhole/item-tags";

describe("getItemCodesByTag", () => {
  test("returns item codes for 'bmat'", () => {
    const codes = getItemCodesByTag("bmat");
    expect(codes).toContain("Cloth");
  });

  test("returns item codes for 'bmats' (plural alias)", () => {
    const codes = getItemCodesByTag("bmats");
    expect(codes).toContain("Cloth");
  });

  test("returns item codes for 'rmat'", () => {
    const codes = getItemCodesByTag("rmat");
    expect(codes).toContain("Wood");
  });

  test("returns item codes for 'comp' (components)", () => {
    const codes = getItemCodesByTag("comp");
    expect(codes).toContain("Components");
  });

  test("handles uppercase input (case-insensitive)", () => {
    const lower = getItemCodesByTag("bmat");
    const upper = getItemCodesByTag("BMAT");
    const mixed = getItemCodesByTag("Bmat");
    expect(upper).toEqual(lower);
    expect(mixed).toEqual(lower);
  });

  test("returns empty array for unknown tag", () => {
    const codes = getItemCodesByTag("nonexistenttag_xyz");
    expect(codes).toEqual([]);
  });

  test("returns multiple codes for 'lt' (light tanks)", () => {
    const codes = getItemCodesByTag("lt");
    expect(codes.length).toBeGreaterThan(1);
    expect(codes).toContain("LightTankC");
    expect(codes).toContain("LightTankW");
  });

  test("returns codes for 'rpg' abbreviation", () => {
    const codes = getItemCodesByTag("rpg");
    expect(codes.length).toBeGreaterThan(0);
    expect(codes).toContain("RpgW");
  });

  test("returns codes for 'logi' (logistics vehicles)", () => {
    const codes = getItemCodesByTag("logi");
    expect(codes).toContain("TruckC");
    expect(codes).toContain("TruckW");
  });

  test("returns codes for ammo abbreviation '762'", () => {
    const codes = getItemCodesByTag("762");
    expect(codes).toContain("RifleAmmo");
  });

  test("returns codes for 'he' (HE grenade)", () => {
    const codes = getItemCodesByTag("he");
    expect(codes).toContain("HEGrenade");
  });

  test("returns codes for 'falchion' nickname", () => {
    const codes = getItemCodesByTag("falchion");
    expect(codes).toContain("MediumTankC");
  });
});

describe("getTagsForItem", () => {
  test("returns tags for Cloth (bmat/bmats)", () => {
    const tags = getTagsForItem("Cloth");
    expect(tags).toContain("bmat");
    expect(tags).toContain("bmats");
  });

  test("returns tags for Wood (rmat/rmats)", () => {
    const tags = getTagsForItem("Wood");
    expect(tags).toContain("rmat");
    expect(tags).toContain("rmats");
  });

  test("returns tags for LightTankC", () => {
    const tags = getTagsForItem("LightTankC");
    expect(tags).toContain("lt");
  });

  test("returns tags for TruckC", () => {
    const tags = getTagsForItem("TruckC");
    expect(tags).toContain("truck");
    expect(tags).toContain("logi");
  });

  test("returns tags for HEGrenade", () => {
    const tags = getTagsForItem("HEGrenade");
    expect(tags).toContain("he");
    expect(tags).toContain("mammon");
  });

  test("returns empty array for item with no tags", () => {
    const tags = getTagsForItem("UnknownItemCode");
    expect(tags).toEqual([]);
  });
});

describe("ITEM_TAGS data integrity", () => {
  test("all tag keys are lowercase", () => {
    for (const key of Object.keys(ITEM_TAGS)) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  test("all tag values are non-empty arrays", () => {
    for (const [, codes] of Object.entries(ITEM_TAGS)) {
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBeGreaterThan(0);
    }
  });

  test("all item codes in tags are non-empty strings", () => {
    for (const codes of Object.values(ITEM_TAGS)) {
      for (const code of codes) {
        expect(typeof code).toBe("string");
        expect(code.length).toBeGreaterThan(0);
      }
    }
  });

  test("has at least 50 tag entries", () => {
    expect(Object.keys(ITEM_TAGS).length).toBeGreaterThan(50);
  });
});
