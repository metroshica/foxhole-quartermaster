# Foxhole Quartermaster

A logistics management tool for Foxhole regiments. Tracks stockpile inventories, plans operations, and calculates equipment deficits.

> **Note to AI Agents**: This file contains essential context for working on this codebase. **Please update this file** as you make significant changes to the architecture, add new features, or modify key patterns.

## Quick Start

```bash
# Start web app in development mode (hot reload, slower)
./start.sh

# Start web app in production mode (optimized, faster)
./start.sh -p

# Run in background (add -d flag)
./start.sh -dp    # Production mode, detached

# Docker mode (recommended for production)
./start.sh -D     # Starts all services via Docker Compose
./deploy.sh       # Build, migrate, and deploy web container

# Stop the web app
./stop.sh

# Database commands
bun run db:push      # Push schema changes
bun run db:studio    # Open Prisma Studio

# Discord bot has been moved to a separate Python branch
```

### Development vs Production Mode

| Mode | Command | Use Case |
|------|---------|----------|
| Development | `./start.sh` | Local development with hot reload |
| Production | `./start.sh -p` | Live deployment (bare-metal), optimized |
| Docker | `./start.sh -D` | Production via Docker Compose |
| Deploy | `./deploy.sh` | Build + migrate + restart Docker web |
| Background | `./start.sh -d` or `-dp` | Run without blocking terminal |

**Production mode** compiles and optimizes the app first (`next build`), then serves the static bundle. This is significantly faster for end users.

**Docker mode** runs the web app as a container alongside PostgreSQL and the scanner. Use `./deploy.sh` for updates (build, migrate, restart with health check).

### Windows Development Setup

Windows development requires Docker Desktop for PostgreSQL. The scanner service can run locally or connect to a remote instance.

**Prerequisites:**
- Git (includes Git Bash)
- Bun (`npm install -g bun`)
- Node.js 22+
- Docker Desktop for Windows (with WSL 2 backend)

**Initial setup:**
```powershell
# Install dependencies
bun install

# Create .env.local (copy from .env.example and configure)
# Required: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET

# Create .env for Prisma CLI (Prisma reads .env, not .env.local)
# Just needs: DATABASE_URL="postgresql://postgres:postgres@localhost:5433/foxhole_quartermaster"

# Start PostgreSQL container
docker compose up -d postgres

# Initialize database
bun run db:push

# Start dev server
bun run dev
```

**Discord OAuth:** Add `http://localhost:3001/api/auth/callback/discord` to your Discord app's OAuth2 redirects.

**Remote scanner:** To use a remote scanner instead of local Docker, set `SCANNER_URL=http://<ip>:8001` in `.env.local`.

**WSL troubleshooting:** If Docker Desktop shows WSL proxy errors, try:
1. Run `wsl --shutdown` then restart Docker Desktop
2. In Docker Settings → Resources → WSL Integration, disable Ubuntu integration (Docker uses its own distro)

## Tech Stack

**Web App:**
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (Auth.js) with Discord OAuth
- **UI**: shadcn/ui components + Tailwind CSS
- **OCR**: External Python scanner service (template matching + Tesseract)
- **Observability**: Sentry (errors, logging, replay). OpenTelemetry tracing is available but disabled.
- **Package Manager**: Bun

## Architecture Overview

### Multi-Tenant Design

All data is scoped by `regimentId` (Discord server ID). Users can belong to multiple regiments but have one "selected" regiment active at a time.

```
User -> RegimentMember -> Regiment
                      -> Stockpiles -> StockpileItems
                      -> Operations -> OperationRequirements
                      -> ProductionOrders -> ProductionOrderItems
```

### Permission System (RBAC)

The app uses a granular role-based access control system. Admins create custom roles with fine-grained permissions and map Discord role IDs to them.

**Key files:**
- `src/lib/auth/permissions.ts` - Permission constants, types, default role definitions
- `src/lib/auth/resolve-permissions.ts` - Resolves user permissions from DB
- `src/lib/auth/check-permission.ts` - API route helpers (`requirePermission()`, `requireAuth()`)
- `src/lib/auth/seed-roles.ts` - Seeds default roles per regiment

**Permission categories:** Stockpiles (view/create/update/delete/refresh/manage_minimums), Operations (view/create/update/delete), Production (view/create/update/delete/update_items), Scanner (upload), Admin (manage_users/manage_roles)

**View permissions:** `stockpile.view`, `operation.view`, `production.view` control read access. Without a view permission, API endpoints return empty data (not 403). All default roles include all 3 view permissions.

**Default roles:** Admin (all 18 permissions), Editor (12 permissions incl. view + write), Stockpile Administrator (stockpile + scanner + view all), Viewer (3 view permissions only)

**Owner safety net:** Discord user `112967182752768000` always has all permissions (unless dev mode is active).

**Role sources:** Roles can be assigned via Discord sync (`source: "discord"`) or manually by admins (`source: "manual"`). Discord sync only touches discord-sourced roles; manual roles persist across logins.

**Developer mode:** Owner can activate dev mode to test the site as specific roles. When active, the owner's permissions come from selected roles only (no owner bypass). Toggle via `/api/admin/dev-mode` or the DEV button in the bottom-right corner. `User.devModeRoleIds` stores a JSON array of role IDs (null when inactive).

**Legacy:** The old `permissionLevel` (VIEWER/EDITOR/ADMIN) field on `RegimentMember` is kept for backward compatibility and auto-derived from RBAC permissions.

**Admin UI:**
- `/admin/roles` - Manage roles, permissions, and Discord role mappings
- `/admin/users` - View regiment members, sort by name/date, manage manual role assignments

## Key Domain Concepts

### Foxhole Items

Items use internal codes (e.g., `RifleC`, `HEGrenade`) mapped to display names. The mapping is in:
- `src/lib/foxhole/item-names.ts` - Item code to display name mapping (use `getItemDisplayName(itemCode)`)
- `src/lib/foxhole/item-icons.ts` - Item code to icon URL mapping (use `getItemIconUrl(itemCode)`)
  - Vehicle icons use `vehicles/` prefix in the mapping (e.g., `"TruckC": "vehicles/TruckVehicleIcon.png"`)
  - Helper functions: `isVehicle(itemCode)` checks if item is a vehicle, `getVehicleItemCodes()` returns all vehicle codes
- `src/lib/foxhole/item-tags.ts` - Slang/abbreviation to item codes mapping
- `src/lib/foxhole/regions.ts` - Hex names and locations

### Inventory Search

The dashboard inventory search (`src/components/features/dashboard/inventory-search.tsx`) provides:
- Text search across all stockpile items (searches display name, item code, and slang tags)
- **Vehicles filter button** - Toggle to show only vehicles (uses `category=vehicles` API parameter)
- Click any item to see which stockpiles contain it

The aggregate inventory API (`/api/inventory/aggregate`) supports:
- `search` - Filter by name/code/tag
- `category=vehicles` - Filter to vehicles only (uses `isVehicle()` helper)
- `limit` - Max results (default 50)

### Scan Status (Dashboard)

The scan status component (`src/components/features/dashboard/recent-stockpiles.tsx`) displays stockpile freshness:
- **Live timers**: Time display updates every minute without page refresh
- **Color thresholds**: Green (< 90min), Yellow (90min-6h), Orange (6-12h), Red (> 12h)
- **Sorted by scan time**: Most recently scanned first (refresh timer doesn't affect order)
- **Total crates**: Shows sum of all item quantities, not distinct item count

### Activity Feed

The activity feed (`src/components/features/activity/activity-feed.tsx`) shows regiment activity:
- **Activity types**: SCAN, PRODUCTION, OPERATION, STOCKPILE_REFRESH
- **Real-time updates**: Refreshes when actions occur (via `refreshTrigger` prop)
- **Points display**: Shows points earned for scans (+items changed) and refreshes (+10)

### Item Search with Slang/Abbreviations

Inventory search supports common Foxhole community abbreviations (from https://foxhole.wiki.gg/wiki/Slang). When a user searches for an abbreviation, matching items display a blue badge showing the matched tag.

Common abbreviations:
| Category | Examples |
|----------|----------|
| Tanks | LT, BT, TD/HTD/STD, ST, MPT, SH, HWM, BL |
| Vehicles | AC, HT, logi, truck, tankette |
| Resources | bmat, rmat, cmat, conc, ms, ss, amat, comp |
| Weapons | AT, ATR, RPG, MG/HMG, SMG, AR, ISG, arty |
| Nicknames | cutler, bonesaw, ignifist, falchion, silverhand |

To add new abbreviations, update `src/lib/foxhole/item-tags.ts`.

### Stockpiles

Stockpiles are identified primarily by **hex** (map region), not city name. When displaying stockpiles:
- Always show hex first (e.g., "Westgate - Seaport")
- Use `StockpileSelector` component for searching stockpiles
- Use `HexSelector` component for searching hex regions

### Operations

Operations are planned military activities with equipment requirements:
- Have a time range (`scheduledFor` to `scheduledEndAt`)
- Target a location (hex) and destination stockpile
- Requirements are compared against aggregate inventory to show deficits
- Priority levels: 0=Low, 1=Medium, 2=High, 3=Critical

### Production Orders

Production orders track items that need to be manufactured:
- Each order contains one or more items with target quantities
- Members update `quantityProduced` as items are made
- Priority levels: 0=Low, 1=Medium, 2=High, 3=Critical
- Located at `/orders/production` with list, create, detail, and edit pages
- Transport Orders (`/orders/transport`) is a placeholder for future feature

**Admin Edit Capabilities:**
- Edit page at `/orders/production/[id]/edit` accessible via Edit button on detail page
- Can modify: name, description, priority, status, items (add/remove/quantities), target stockpiles
- MPF timer reset: When resetting status on MPF orders, can specify new duration to recalculate timer
- Uses atomic transaction to update items and target stockpiles together

**Regular Orders:**
- Status auto-updates based on progress: PENDING → IN_PROGRESS → COMPLETED

**MPF (Mass Production Factory) Orders:**
- Toggle `isMpf: true` when creating to enable MPF workflow
- Can specify multiple target stockpiles for delivery
- Status flow: PENDING → IN_PROGRESS (submitted to MPF) → READY_FOR_PICKUP (timer done) → COMPLETED (delivered)
- Timer stored as `mpfReadyAt` timestamp, calculated from `mpfSubmittedAt` + duration
- Auto-updates to READY_FOR_PICKUP when timer expires (checked on API fetch)
- Delivery tracking: `deliveryStockpileId` records where items were delivered

**MPF Components:**
- `DurationInput` - HH:MM:SS format input matching Foxhole's MPF timer display (supports 24+ hour durations)
- `CountdownTimer` - Real-time countdown with progress visualization:
  - Props: `targetTime`, `startTime` (for progress), `variant` ("default" | "compact"), `showProgress`
  - Default variant: Linear progress bar with timer text and percentage
  - Compact variant: Circular progress ring with timer inside (used in list views)
  - Color progression based on % complete: Blue → Yellow → Orange → Emerald → Green
  - Pulse animation when > 90% complete
- `MultiStockpileSelector` - Checkbox-based multi-select for target stockpiles

**Stockpile Inventory Integration:**
- When production items are marked as produced, stockpile inventory is automatically incremented
- Only positive deltas increment stockpile (rollbacks don't decrement - OCR scans correct discrepancies)
- Items created as `crated: true` (production creates crates)
- If order has one target stockpile: auto-selected
- If order has multiple target stockpiles: user selects via dialog (remembered for session)
- If order has no target stockpiles: stockpile update skipped
- Green feedback shown: "Added X items to [Stockpile Name]"

**Standing Orders (Stockpile Minimums):**
- A standing order is a production order linked to a specific stockpile (`isStandingOrder: true`, `linkedStockpileId`)
- Created automatically when stockpile minimum levels are set via `/api/stockpiles/[id]/minimums`
- Fulfillment computed from live stockpile inventory (crated items) instead of `quantityProduced`
- Status alternates between `FULFILLED` (all minimums met) and `IN_PROGRESS` (deficits exist)
- Standing orders are never auto-archived and persist across page loads
- UI shows teal "Standing" badge on order cards and fulfillment percentage from live inventory
- Stockpile detail page shows a "Minimum Levels" card with per-item fulfillment indicators

**War Scoping & Archiving:**
- Production orders and operations are scoped to `warNumber` (from Foxhole War API)
- New orders get `warNumber` set automatically on creation via `getCurrentWar()`
- Default list views filter to current war + `archivedAt = null`
- Lazy auto-archive: completed non-standing orders are archived 3 hours after completion
- "Archived" tab on both production orders and operations pages shows archived/previous-war items
- If War API is down, `warNumber` is set to null and orders are included in current-war results

**Short URLs for Discord Sharing:**
- Each production order has a `shortId` (4-character nanoid) for compact URLs
- Share button on order detail page copies `https://foxhole-quartermaster.com/p/{shortId}` to clipboard
- Short URLs redirect to the full order detail page (`/orders/production/{id}`)
- API endpoint: `/api/orders/production/by-short-id/[shortId]` resolves shortId to full ID
- Backfill script: `scripts/backfill-short-ids.ts` generates shortIds for existing orders

## Project Structure

### Web App (`src/`)

```
src/
├── app/
│   ├── (auth)/              # Login, regiment selection
│   ├── (dashboard)/         # Main app pages
│   │   ├── page.tsx         # Dashboard home
│   │   ├── operations/      # Operations CRUD
│   │   ├── orders/          # Production & Transport orders
│   │   ├── p/               # Short URL redirects for production orders
│   │   ├── stockpiles/      # Stockpile list/detail
│   │   ├── history/         # Scan audit log
│   │   ├── upload/          # OCR upload page
│   │   ├── settings/        # User settings
│   │   └── admin/           # Admin pages (users, roles)
│   └── api/
│       ├── admin/           # Admin API (users, roles management)
│       ├── auth/            # NextAuth endpoints
│       ├── dashboard/       # Dashboard stats
│       ├── history/         # Scan history endpoints
│       ├── inventory/       # Aggregate inventory queries
│       ├── operations/      # Operations CRUD
│       ├── orders/          # Production orders CRUD
│       ├── scanner/         # OCR processing
│       └── stockpiles/      # Stockpiles CRUD + minimums
├── components/
│   ├── features/
│   │   ├── admin/           # Role management components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── datetime/        # DateTimePicker, DateTimeRangePicker
│   │   ├── hex/             # HexSelector
│   │   ├── items/           # ItemSelector
│   │   ├── ocr/             # Upload zone, results table
│   │   └── stockpiles/      # StockpileSelector
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── auth/                # NextAuth configuration
│   ├── db/                  # Prisma client
│   ├── discord/             # Discord API helpers
│   ├── foxhole/             # Game data (items, regions, icons)
│   └── scanner/             # OCR processing logic
└── public/
    └── icons/               # Item and vehicle icons
```

## Database Models

### Core Models

| Model | Purpose |
|-------|---------|
| `User` | Discord-authenticated users |
| `Regiment` | Discord servers (guilds) |
| `RegimentMember` | User-regiment relationship with permissions |
| `Stockpile` | Storage locations (seaports, depots, bases) |
| `StockpileItem` | Current inventory at a stockpile |
| `StockpileScan` | Audit trail of OCR scans |
| `StockpileScanItem` | Items captured in each scan (for diff calculation) |
| `Operation` | Planned military operations |
| `OperationRequirement` | Items needed for an operation |
| `ProductionOrder` | Orders for items to be manufactured |
| `ProductionOrderItem` | Individual items in a production order with progress |
| `ProductionOrderTargetStockpile` | Junction table for order-to-stockpile targeting |
| `Role` | Custom roles per regiment with permissions |
| `RolePermission` | Individual permissions assigned to a role |
| `RoleDiscordMapping` | Maps Discord role IDs to app roles |
| `RegimentMemberRole` | Junction: assigns roles to regiment members |

### Key Fields

- `Stockpile.type`: "SEAPORT" | "DEPOT" | "BASE" | "STORAGE_DEPOT"
- `Stockpile.hex`: Map region name (e.g., "Westgate", "King's Cage")
- `Operation.status`: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
- `ProductionOrder.status`: "PENDING" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED" | "FULFILLED"
- `ProductionOrder.isMpf`: Boolean flag for MPF workflow
- `ProductionOrder.isStandingOrder`: Boolean flag for stockpile minimum orders
- `ProductionOrder.linkedStockpileId`: FK to stockpile for standing orders (unique)
- `ProductionOrder.warNumber`: Foxhole war number for scoping
- `ProductionOrder.archivedAt`: Timestamp when order was auto/manually archived
- `Operation.warNumber`: Foxhole war number for scoping
- `Operation.archivedAt`: Timestamp when operation was archived
- `StockpileItem.itemCode`: Internal item code (e.g., "RifleC")

## Key Components

### DateTimeRangePicker

`src/components/features/datetime/datetime-range-picker.tsx`

Timezone-aware date/time range picker with:
- Start and end time inputs
- Duration presets (1h, 2h, 3h, etc.)
- Timezone selector (US, EU, Asia timezones)
- Auto-detects user's timezone

### ItemSelector

`src/components/features/items/item-selector.tsx`

Autocomplete for selecting items:
- Shows inventory items first (with quantity badges)
- Keyboard navigation (arrow keys, enter, escape)
- Filters as you type

### StockpileSelector / HexSelector

`src/components/features/stockpiles/stockpile-selector.tsx`
`src/components/features/hex/hex-selector.tsx`

Inline search components for selecting stockpiles or hexes with keyboard navigation.

## API Patterns

### Next.js 16 Dynamic Routes

In Next.js 16, `params` is a Promise. For client components, use the `use()` hook:
```typescript
import { use } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: PageProps) {
  const { id } = use(params);
  // ...
}
```

For pages using `useParams()` hook (from `next/navigation`), no changes needed.

### Authentication & Permissions

API routes use permission check helpers from `src/lib/auth/check-permission.ts`:

```typescript
// Read endpoints (auth + regiment only):
const authResult = await requireAuth();
if (authResult instanceof NextResponse) return authResult;
const { userId, regimentId } = authResult;

// Write endpoints (auth + regiment + specific permission):
const authResult = await requirePermission(PERMISSIONS.STOCKPILE_CREATE);
if (authResult instanceof NextResponse) return authResult;
const { userId, regimentId } = authResult;
```

### Regiment Scoping

Data is always scoped to the user's selected regiment (handled automatically by `requireAuth()`/`requirePermission()`).

### Validation

Use Zod schemas for request validation:
```typescript
const schema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
});
const result = schema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
}
```

## OCR Scanner

The OCR scanner is a separate Python service that processes stockpile screenshots:
- Located in `scanner/` directory
- Uses template matching for item icons
- Falls back to Tesseract for quantity text
- Called via `/api/scanner` endpoint

Upload flow:
1. User pastes screenshot (Ctrl+V) or uploads file
2. Image sent to scanner service
3. Scanner returns detected items with confidence scores
4. User confirms and selects target stockpile
5. Items saved to database with StockpileScan audit record

## Common Tasks

### Adding a New Item

1. Add to `src/lib/foxhole/item-names.ts`
2. Add icon to `public/icons/items/`
3. Update `src/lib/foxhole/item-icons.ts` if needed
4. Add relevant slang/abbreviations to `src/lib/foxhole/item-tags.ts`

### Adding New Slang/Abbreviations

Update `src/lib/foxhole/item-tags.ts` with the abbreviation (lowercase) mapped to item codes:

```typescript
"newabbrev": ["ItemCode1", "ItemCode2"],
```

### Adding a New Hex

Update `src/lib/foxhole/regions.ts`

### Modifying Database Schema

1. Edit `prisma/schema.prisma`
2. Run `bun run db:push` (dev) or `bun run db:migrate` (prod)
3. Run `bunx prisma generate` to regenerate the Prisma client
4. **CRITICAL: Restart the dev server** - The running Next.js server caches the Prisma client. Without restart, you'll get "cannot read properties of undefined" errors when accessing new models.
5. If adding fields to existing models, update relevant API routes

### Creating New Feature Components

Place in `src/components/features/<feature-name>/`

## Environment Variables

**Web App** (`.env.local`):
```
DATABASE_URL=postgresql://...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3001
SCANNER_URL=http://localhost:8001  # Python OCR service
```

## Hosting

The entire stack runs in Docker. PostgreSQL, the OCR scanner, and the Next.js web app are all managed via `docker-compose.yml`.

### Docker Deployment (Recommended)

```bash
# First time / after code changes:
./deploy.sh              # Build image, run migrations, restart container

# Deploy without migrations:
./deploy.sh --no-migrate

# Run migrations only (no build/restart):
./deploy.sh --migrate-only

# Quick start (all services):
./start.sh -D

# Stop the web app:
./stop.sh

# View logs:
docker compose logs -f web
```

### Bare-Metal Development

For local development with hot reload, run Next.js directly (Docker still used for PostgreSQL and scanner):

```bash
./start.sh       # Development mode (hot reload)
./start.sh -p    # Production mode (optimized)
./start.sh -dp   # Production mode, background
```

### Auto-Start on Boot (systemd)

```bash
sudo cp foxhole-quartermaster.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable foxhole-quartermaster
sudo systemctl start foxhole-quartermaster

# View logs
journalctl -u foxhole-quartermaster -f
```

### Docker Containers

| Container | Port | Purpose |
|-----------|------|---------|
| `foxhole-quartermaster-web` | 3002 (testing) / 3001 (prod) | Next.js web app |
| `foxhole-quartermaster-db` | 5433 | PostgreSQL database |
| `foxhole-stockpiles-scanner` | 8001 | OCR scanner service |

### Access

- **Public URL**: https://foxhole-quartermaster.com (via Cloudflare)
- **Local**: http://localhost:3001 or http://192.168.1.50:3001
- **Scanner**: http://localhost:8001

### Kubernetes Deployment (GitOps)

The app can also be deployed to Kubernetes using ArgoCD + Argo Rollouts + Kargo for a full GitOps pipeline with blue-green deployments and dev-to-prod image promotion.

**Architecture:**
- **ArgoCD** syncs Helm chart from git to cluster
- **Argo Rollouts** handles blue-green deployment for the web app
- **Kargo** promotes images from `demo` -> `prod` environments

**Environments:**
| Environment | Namespace | Ingress Host | Rollout |
|-------------|-----------|-------------|---------|
| Demo | `fq-demo` | `demo.foxhole-quartermaster.com` | Auto-promote |
| Prod | `fq-prod` | `foxhole-quartermaster.com` | Manual promote |

**Image Tags** (single Docker Hub repo: `metroshica/foxhole-quartermaster`):
- `web-sha-<7char>` — Next.js runner stage
- `scanner-sha-<7char>` — Python OCR scanner
- `builder-sha-<7char>` — Builder stage (for migrations)

**Key files:**
```
k8s/
  chart/              # Helm chart (templates + values)
  argocd/             # ArgoCD Project + Applications
  kargo/              # Kargo Project, Warehouse, Stages
.github/workflows/
  build-push.yml      # CI: test, build, push images on main push
deploy-k8s.sh         # Local script: build + push images manually
```

**Build & push images manually:**
```bash
./deploy-k8s.sh                  # Build and push all 3 images
./deploy-k8s.sh --web-only       # Only web + builder
./deploy-k8s.sh --scanner-only   # Only scanner
./deploy-k8s.sh --dry-run        # Preview tags
```

**Promotion flow:**
1. Push to `main` -> GitHub Actions builds + pushes images
2. Kargo detects new tags -> auto-promotes to `demo`
3. ArgoCD syncs demo (migration PreSync -> scanner -> web blue-green)
4. Verify at `demo.foxhole-quartermaster.com`
5. `kargo promote --project foxhole-quartermaster --stage prod`
6. ArgoCD syncs prod -> verify preview -> `kubectl argo rollouts promote fq-prod-web -n fq-prod`

**Create secrets per namespace (before first deploy):**
```bash
kubectl create secret generic fq-secrets -n <namespace> \
  --from-literal=POSTGRES_PASSWORD='...' \
  --from-literal=DATABASE_URL='postgresql://postgres:<pw>@fq-<env>-postgres:5432/foxhole_quartermaster' \
  --from-literal=NEXTAUTH_SECRET='...' \
  --from-literal=DISCORD_CLIENT_ID='...' \
  --from-literal=DISCORD_CLIENT_SECRET='...' \
  --from-literal=AUTHORIZED_REGIMENT_IDS='...'
```

**Validate chart locally:**
```bash
helm template k8s/chart -f k8s/chart/values.yaml -f k8s/chart/values-demo.yaml
```

## Observability

### OpenTelemetry Tracing

The app uses OpenTelemetry for distributed tracing. Traces are exported via OTLP protocol, which is compatible with multiple backends.

**Key files:**
- `src/lib/telemetry/index.ts` - OTel SDK configuration
- `src/lib/telemetry/tracing.ts` - Helper utilities (`withSpan`, `addSpanAttributes`, etc.)
- `src/instrumentation.ts` - Next.js instrumentation entry point

**Auto-instrumented:**
- All HTTP requests/responses
- All fetch() calls to external services (Discord API, Scanner)
- Prisma database queries

**Manual spans:**
- Discord API calls (`discord.fetch_guilds`, `discord.fetch_member`, `discord.refresh_token`)
- Scanner image processing (`scanner.process_image`)

### Configuration

Set these environment variables to enable tracing:

```bash
# Honeycomb
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY
OTEL_SERVICE_NAME=foxhole-quartermaster

# Or GCP Cloud Trace
OTEL_EXPORTER_OTLP_ENDPOINT=https://cloudtrace.googleapis.com

# Or Datadog
OTEL_EXPORTER_OTLP_ENDPOINT=https://trace.agent.datadoghq.com
OTEL_EXPORTER_OTLP_HEADERS=DD-API-KEY=YOUR_KEY
```

To disable tracing, leave `OTEL_EXPORTER_OTLP_ENDPOINT` unset.

### Adding Custom Spans

Use the tracing helpers to add spans to business logic:

```typescript
import { withSpan, addSpanAttributes } from "@/lib/telemetry/tracing";

const result = await withSpan("my.operation", async (span) => {
  span.setAttribute("item.count", items.length);
  return doSomething();
});
```

## Sentry

Sentry is used for error tracking, performance monitoring, and logging.

### Configuration Files

Sentry initialization files (already configured):
- `src/instrumentation-client.ts` - Client-side (includes Replay integration)
- `sentry.server.config.ts` - Server-side
- `sentry.edge.config.ts` - Edge runtime
- `src/instrumentation.ts` - Loads server/edge configs

In other files, import Sentry with:
```typescript
import * as Sentry from "@sentry/nextjs";
```

### Exception Capturing

Use `Sentry.captureException(error)` in try-catch blocks:
```typescript
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

### Custom Span Instrumentation

Create spans for meaningful actions (button clicks, API calls, function calls). Child spans can exist within parent spans.

**Component Actions:**
```typescript
function TestComponent() {
  const handleClick = () => {
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        span.setAttribute("config", someValue);
        span.setAttribute("metric", someMetric);
        doSomething();
      },
    );
  };
  return <button onClick={handleClick}>Test</button>;
}
```

**API Calls:**
```typescript
async function fetchUserData(userId: string) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`,
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    },
  );
}
```

### Logging

Enable logging with `enableLogs: true` in `Sentry.init()`. Use the logger for structured logs:

```typescript
const { logger } = Sentry;

logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached", { endpoint: "/api/results/", isEnterprise: false });
logger.error("Failed to process payment", { orderId: "order_123", amount: 99.99 });
logger.fatal("Database connection pool exhausted", { database: "users", activeConnections: 100 });
```

Use `logger.fmt` template literal to include variables in structured logs.

**Console Integration (optional):**
```typescript
Sentry.init({
  dsn: "...",
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
});
```

## Conventions

- **Hex as primary identifier**: Always show hex first when referencing stockpiles
- **Ctrl+V first**: Upload interfaces emphasize paste over file upload (Foxhole players are used to this)
- **No time estimates**: Don't add duration estimates in comments or planning
- **Minimal changes**: Only modify what's necessary, don't over-engineer
- **Update this file**: Keep CLAUDE.md current when making significant changes
- **Confirm commits**: Always show the user the proposed commit message and get confirmation before committing. Never commit without user approval.
