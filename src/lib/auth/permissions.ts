/**
 * RBAC Permission Constants
 *
 * Defines all granular permissions, grouped by category.
 * Used throughout the app for permission checks, role creation, and admin UI.
 */

export const PERMISSIONS = {
  // Stockpiles
  STOCKPILE_CREATE: "stockpile.create",
  STOCKPILE_UPDATE: "stockpile.update",
  STOCKPILE_DELETE: "stockpile.delete",
  STOCKPILE_REFRESH: "stockpile.refresh",
  STOCKPILE_MANAGE_MINIMUMS: "stockpile.manage_minimums",

  // Operations
  OPERATION_CREATE: "operation.create",
  OPERATION_UPDATE: "operation.update",
  OPERATION_DELETE: "operation.delete",

  // Production
  PRODUCTION_CREATE: "production.create",
  PRODUCTION_UPDATE: "production.update",
  PRODUCTION_DELETE: "production.delete",
  PRODUCTION_UPDATE_ITEMS: "production.update_items",

  // Scanner
  SCANNER_UPLOAD: "scanner.upload",

  // Admin
  ADMIN_MANAGE_USERS: "admin.manage_users",
  ADMIN_MANAGE_ROLES: "admin.manage_roles",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.STOCKPILE_CREATE]: "Create Stockpiles",
  [PERMISSIONS.STOCKPILE_UPDATE]: "Update/Scan Stockpiles",
  [PERMISSIONS.STOCKPILE_DELETE]: "Delete Stockpiles",
  [PERMISSIONS.STOCKPILE_REFRESH]: "Refresh Stockpiles",
  [PERMISSIONS.STOCKPILE_MANAGE_MINIMUMS]: "Manage Stockpile Minimum Levels",
  [PERMISSIONS.OPERATION_CREATE]: "Create Operations",
  [PERMISSIONS.OPERATION_UPDATE]: "Edit Operations",
  [PERMISSIONS.OPERATION_DELETE]: "Delete Operations",
  [PERMISSIONS.PRODUCTION_CREATE]: "Create Production Orders",
  [PERMISSIONS.PRODUCTION_UPDATE]: "Edit Production Orders",
  [PERMISSIONS.PRODUCTION_DELETE]: "Delete Production Orders",
  [PERMISSIONS.PRODUCTION_UPDATE_ITEMS]: "Update Production Progress",
  [PERMISSIONS.SCANNER_UPLOAD]: "Upload Screenshots (OCR)",
  [PERMISSIONS.ADMIN_MANAGE_USERS]: "Manage Users",
  [PERMISSIONS.ADMIN_MANAGE_ROLES]: "Manage Roles & Permissions",
};

export interface PermissionGroup {
  name: string;
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: "Stockpiles",
    permissions: [
      PERMISSIONS.STOCKPILE_CREATE,
      PERMISSIONS.STOCKPILE_UPDATE,
      PERMISSIONS.STOCKPILE_DELETE,
      PERMISSIONS.STOCKPILE_REFRESH,
      PERMISSIONS.STOCKPILE_MANAGE_MINIMUMS,
    ],
  },
  {
    name: "Operations",
    permissions: [
      PERMISSIONS.OPERATION_CREATE,
      PERMISSIONS.OPERATION_UPDATE,
      PERMISSIONS.OPERATION_DELETE,
    ],
  },
  {
    name: "Production",
    permissions: [
      PERMISSIONS.PRODUCTION_CREATE,
      PERMISSIONS.PRODUCTION_UPDATE,
      PERMISSIONS.PRODUCTION_DELETE,
      PERMISSIONS.PRODUCTION_UPDATE_ITEMS,
    ],
  },
  {
    name: "Scanner",
    permissions: [PERMISSIONS.SCANNER_UPLOAD],
  },
  {
    name: "Administration",
    permissions: [
      PERMISSIONS.ADMIN_MANAGE_USERS,
      PERMISSIONS.ADMIN_MANAGE_ROLES,
    ],
  },
];

export interface DefaultRoleDefinition {
  name: string;
  description: string;
  permissions: Permission[];
}

export const DEFAULT_ROLES: DefaultRoleDefinition[] = [
  {
    name: "Admin",
    description: "Full access to all features and settings",
    permissions: [...ALL_PERMISSIONS],
  },
  {
    name: "Editor",
    description: "Can create and modify stockpiles, operations, and production orders",
    permissions: [
      PERMISSIONS.STOCKPILE_CREATE,
      PERMISSIONS.STOCKPILE_UPDATE,
      PERMISSIONS.STOCKPILE_REFRESH,
      PERMISSIONS.OPERATION_CREATE,
      PERMISSIONS.OPERATION_UPDATE,
      PERMISSIONS.PRODUCTION_CREATE,
      PERMISSIONS.PRODUCTION_UPDATE,
      PERMISSIONS.PRODUCTION_UPDATE_ITEMS,
      PERMISSIONS.SCANNER_UPLOAD,
    ],
  },
  {
    name: "Stockpile Administrator",
    description: "Manages stockpile inventory levels and minimums",
    permissions: [
      PERMISSIONS.STOCKPILE_CREATE,
      PERMISSIONS.STOCKPILE_UPDATE,
      PERMISSIONS.STOCKPILE_DELETE,
      PERMISSIONS.STOCKPILE_REFRESH,
      PERMISSIONS.STOCKPILE_MANAGE_MINIMUMS,
      PERMISSIONS.SCANNER_UPLOAD,
    ],
  },
  {
    name: "Viewer",
    description: "Read-only access to all data",
    permissions: [],
  },
];

/** Discord user ID that always has all permissions (safety net) */
export const OWNER_DISCORD_ID = "112967182752768000";
