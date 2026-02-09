# RBAC Migration Guide

## Production Database Migration Steps

After merging the `feat/rbac-permissions` branch into `main`, run the following on the production instance:

### 1. Push Schema Changes

This adds 4 new tables (`Role`, `RolePermission`, `RoleDiscordMapping`, `RegimentMemberRole`) and adds a `roles` relation to `Regiment` and `RegimentMember`. No existing data is modified or deleted.

```bash
# Push the new schema to the production database
bunx prisma db push --accept-data-loss
```

The `--accept-data-loss` flag is needed because of a pre-existing unique constraint change on `ProductionOrder.shortId`. The RBAC tables are purely additive (new tables only).

### 2. Run the Migration Script

This script:
- Creates 3 default roles (Admin, Editor, Viewer) for each regiment
- Migrates any existing `adminRoles[]`/`editorRoles[]`/`viewerRoles[]` Discord role IDs to `RoleDiscordMapping` records
- Assigns each existing `RegimentMember` to the appropriate default role based on their `permissionLevel`

```bash
bun run scripts/migrate-rbac.ts
```

### 3. Restart the Application

The running Next.js server caches the Prisma client. Restart to pick up the new models.

```bash
./stop.sh
./start.sh -p    # or ./start.sh -dp for background
```

### What Happens Automatically

- **On login**: When users log in and select a regiment, the `select-regiment` endpoint automatically:
  - Seeds default roles if they don't exist
  - Migrates old Discord role arrays to new `RoleDiscordMapping` records (one-time per regiment)
  - Resolves user permissions from their assigned roles
  - Populates `permissions[]` in the JWT session

- **Backward compatibility**: The old `permissionLevel` field on `RegimentMember` is kept and auto-derived from the new permissions. Existing code checking `regimentPermission` still works.

### Verification

After migration, verify:
1. Log in and navigate to `/admin/roles` - should see 3 default roles
2. Check that existing permission checks work (try actions as different users)
3. Owner Discord ID `112967182752768000` should always have all permissions
