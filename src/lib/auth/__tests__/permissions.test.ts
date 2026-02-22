import { describe, test, expect } from "bun:test";
import {
  PERMISSIONS,
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
  OWNER_DISCORD_ID,
  type Permission,
} from "@/lib/auth/permissions";

describe("PERMISSIONS constants", () => {
  test("has all stockpile permissions", () => {
    expect(PERMISSIONS.STOCKPILE_VIEW).toBe("stockpile.view");
    expect(PERMISSIONS.STOCKPILE_CREATE).toBe("stockpile.create");
    expect(PERMISSIONS.STOCKPILE_UPDATE).toBe("stockpile.update");
    expect(PERMISSIONS.STOCKPILE_DELETE).toBe("stockpile.delete");
    expect(PERMISSIONS.STOCKPILE_REFRESH).toBe("stockpile.refresh");
    expect(PERMISSIONS.STOCKPILE_MANAGE_MINIMUMS).toBe(
      "stockpile.manage_minimums"
    );
  });

  test("has all operation permissions", () => {
    expect(PERMISSIONS.OPERATION_VIEW).toBe("operation.view");
    expect(PERMISSIONS.OPERATION_CREATE).toBe("operation.create");
    expect(PERMISSIONS.OPERATION_UPDATE).toBe("operation.update");
    expect(PERMISSIONS.OPERATION_DELETE).toBe("operation.delete");
  });

  test("has all production permissions", () => {
    expect(PERMISSIONS.PRODUCTION_VIEW).toBe("production.view");
    expect(PERMISSIONS.PRODUCTION_CREATE).toBe("production.create");
    expect(PERMISSIONS.PRODUCTION_UPDATE).toBe("production.update");
    expect(PERMISSIONS.PRODUCTION_DELETE).toBe("production.delete");
    expect(PERMISSIONS.PRODUCTION_UPDATE_ITEMS).toBe(
      "production.update_items"
    );
  });

  test("has scanner and admin permissions", () => {
    expect(PERMISSIONS.SCANNER_UPLOAD).toBe("scanner.upload");
    expect(PERMISSIONS.ADMIN_MANAGE_USERS).toBe("admin.manage_users");
    expect(PERMISSIONS.ADMIN_MANAGE_ROLES).toBe("admin.manage_roles");
  });

  test("all permission values follow dot-notation format", () => {
    for (const value of Object.values(PERMISSIONS)) {
      expect(value).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });
});

describe("ALL_PERMISSIONS", () => {
  test("contains exactly 18 permissions", () => {
    expect(ALL_PERMISSIONS.length).toBe(18);
  });

  test("contains no duplicate entries", () => {
    const unique = new Set(ALL_PERMISSIONS);
    expect(unique.size).toBe(ALL_PERMISSIONS.length);
  });

  test("contains every value from PERMISSIONS object", () => {
    for (const perm of Object.values(PERMISSIONS)) {
      expect(ALL_PERMISSIONS).toContain(perm);
    }
  });

  test("all permissions are strings", () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(typeof perm).toBe("string");
    }
  });
});

describe("DEFAULT_ROLES", () => {
  test("defines exactly 4 default roles", () => {
    expect(DEFAULT_ROLES.length).toBe(4);
  });

  test("all role names are unique", () => {
    const names = DEFAULT_ROLES.map((r) => r.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  test("all roles have a name and description", () => {
    for (const role of DEFAULT_ROLES) {
      expect(typeof role.name).toBe("string");
      expect(role.name.length).toBeGreaterThan(0);
      expect(typeof role.description).toBe("string");
      expect(role.description.length).toBeGreaterThan(0);
    }
  });

  test("Admin role has all permissions", () => {
    const admin = DEFAULT_ROLES.find((r) => r.name === "Admin");
    expect(admin).toBeDefined();
    expect(admin!.permissions.length).toBe(ALL_PERMISSIONS.length);
    for (const perm of ALL_PERMISSIONS) {
      expect(admin!.permissions).toContain(perm);
    }
  });

  test("Viewer role has only the 3 view permissions", () => {
    const viewer = DEFAULT_ROLES.find((r) => r.name === "Viewer");
    expect(viewer).toBeDefined();
    expect(viewer!.permissions).toContain(PERMISSIONS.STOCKPILE_VIEW);
    expect(viewer!.permissions).toContain(PERMISSIONS.OPERATION_VIEW);
    expect(viewer!.permissions).toContain(PERMISSIONS.PRODUCTION_VIEW);
    // Must not have write permissions
    expect(viewer!.permissions).not.toContain(PERMISSIONS.STOCKPILE_CREATE);
    expect(viewer!.permissions).not.toContain(PERMISSIONS.OPERATION_CREATE);
    expect(viewer!.permissions).not.toContain(PERMISSIONS.PRODUCTION_CREATE);
    expect(viewer!.permissions).not.toContain(PERMISSIONS.ADMIN_MANAGE_USERS);
    expect(viewer!.permissions).not.toContain(PERMISSIONS.SCANNER_UPLOAD);
  });

  test("Editor role has view and write permissions but not admin", () => {
    const editor = DEFAULT_ROLES.find((r) => r.name === "Editor");
    expect(editor).toBeDefined();
    expect(editor!.permissions).toContain(PERMISSIONS.STOCKPILE_VIEW);
    expect(editor!.permissions).toContain(PERMISSIONS.STOCKPILE_CREATE);
    expect(editor!.permissions).toContain(PERMISSIONS.SCANNER_UPLOAD);
    expect(editor!.permissions).not.toContain(PERMISSIONS.ADMIN_MANAGE_USERS);
    expect(editor!.permissions).not.toContain(PERMISSIONS.ADMIN_MANAGE_ROLES);
  });

  test("Stockpile Administrator role has stockpile management permissions", () => {
    const stockpileAdmin = DEFAULT_ROLES.find(
      (r) => r.name === "Stockpile Administrator"
    );
    expect(stockpileAdmin).toBeDefined();
    expect(stockpileAdmin!.permissions).toContain(
      PERMISSIONS.STOCKPILE_MANAGE_MINIMUMS
    );
    expect(stockpileAdmin!.permissions).toContain(PERMISSIONS.STOCKPILE_DELETE);
    expect(stockpileAdmin!.permissions).not.toContain(
      PERMISSIONS.ADMIN_MANAGE_USERS
    );
  });

  test("no role has duplicate permissions", () => {
    for (const role of DEFAULT_ROLES) {
      const unique = new Set(role.permissions);
      expect(unique.size).toBe(role.permissions.length);
    }
  });
});

describe("PERMISSION_LABELS", () => {
  test("has a label for every permission in ALL_PERMISSIONS", () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(PERMISSION_LABELS[perm]).toBeDefined();
    }
  });

  test("all labels are non-empty strings", () => {
    for (const perm of ALL_PERMISSIONS) {
      const label = PERMISSION_LABELS[perm];
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe("PERMISSION_GROUPS", () => {
  test("has groups defined", () => {
    expect(PERMISSION_GROUPS.length).toBeGreaterThan(0);
  });

  test("all groups have a name and permissions array", () => {
    for (const group of PERMISSION_GROUPS) {
      expect(typeof group.name).toBe("string");
      expect(group.name.length).toBeGreaterThan(0);
      expect(Array.isArray(group.permissions)).toBe(true);
      expect(group.permissions.length).toBeGreaterThan(0);
    }
  });

  test("all permissions across groups are valid permission values", () => {
    const allPermsSet = new Set<Permission>(ALL_PERMISSIONS);
    for (const group of PERMISSION_GROUPS) {
      for (const perm of group.permissions) {
        expect(allPermsSet.has(perm)).toBe(true);
      }
    }
  });

  test("every permission appears in at least one group", () => {
    const groupedPerms = new Set<string>();
    for (const group of PERMISSION_GROUPS) {
      for (const perm of group.permissions) {
        groupedPerms.add(perm);
      }
    }
    for (const perm of ALL_PERMISSIONS) {
      expect(groupedPerms.has(perm)).toBe(true);
    }
  });
});

describe("OWNER_DISCORD_ID", () => {
  test("is a non-empty string", () => {
    expect(typeof OWNER_DISCORD_ID).toBe("string");
    expect(OWNER_DISCORD_ID.length).toBeGreaterThan(0);
  });

  test("is a valid Discord snowflake (numeric string)", () => {
    expect(/^\d+$/.test(OWNER_DISCORD_ID)).toBe(true);
  });
});
