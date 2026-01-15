# Foxhole Quartermaster

A logistics management tool for Foxhole regiments. Tracks stockpile inventories, plans operations, and calculates equipment deficits.

> **Note to AI Agents**: This file contains essential context for working on this codebase. **Please update this file** as you make significant changes to the architecture, add new features, or modify key patterns.

## Quick Start

```bash
# Start everything (PostgreSQL, Scanner, Next.js)
./start.sh

# Or start manually:
export $(grep -v '^#' .env.local | xargs) && bun run dev

# Stop the app
./stop.sh

# Database commands
bun run db:push      # Push schema changes
bun run db:studio    # Open Prisma Studio
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (Auth.js) with Discord OAuth
- **UI**: shadcn/ui components + Tailwind CSS
- **OCR**: External Python scanner service (template matching + Tesseract)
- **Observability**: OpenTelemetry (tracing to Honeycomb/GCP/Datadog)
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

### Permission Levels

- **VIEWER**: Read-only access
- **EDITOR**: Can create/update stockpiles, operations
- **ADMIN**: Full access including delete operations

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

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, regiment selection
│   ├── (dashboard)/         # Main app pages
│   │   ├── page.tsx         # Dashboard home
│   │   ├── operations/      # Operations CRUD
│   │   ├── orders/          # Production & Transport orders
│   │   ├── stockpiles/      # Stockpile list/detail
│   │   ├── history/         # Scan audit log
│   │   ├── upload/          # OCR upload page
│   │   └── settings/        # User settings
│   └── api/
│       ├── auth/            # NextAuth endpoints
│       ├── dashboard/       # Dashboard stats
│       ├── history/         # Scan history endpoints
│       ├── inventory/       # Aggregate inventory queries
│       ├── operations/      # Operations CRUD
│       ├── orders/          # Production orders CRUD
│       ├── scanner/         # OCR processing
│       └── stockpiles/      # Stockpiles CRUD
├── components/
│   ├── features/
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

### Key Fields

- `Stockpile.type`: "SEAPORT" | "DEPOT" | "BASE" | "STORAGE_DEPOT"
- `Stockpile.hex`: Map region name (e.g., "Westgate", "King's Cage")
- `Operation.status`: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
- `ProductionOrder.status`: "PENDING" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED"
- `ProductionOrder.isMpf`: Boolean flag for MPF workflow
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

### Authentication

All API routes check authentication:
```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Regiment Scoping

Data is always scoped to the user's selected regiment:
```typescript
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { selectedRegimentId: true },
});
```

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

Update `src/lib/foxhole/item-tags.ts` - add a new entry mapping the abbreviation (lowercase) to an array of item codes:
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

Required in `.env.local`:
```
DATABASE_URL=postgresql://...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3001
SCANNER_URL=http://localhost:8000  # Python OCR service
```

## Hosting

This app runs locally with Docker containers for PostgreSQL and the OCR scanner.

### Starting the App

```bash
./start.sh    # Starts PostgreSQL, Scanner, and Next.js
./stop.sh     # Stops Next.js (keeps Docker containers running)
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
| `foxhole-quartermaster-db` | 5433 | PostgreSQL database |
| `foxhole-stockpiles-scanner` | 8001 | OCR scanner service |

### Access

- **Public URL**: https://foxhole-quartermaster.metroshica.com (via Cloudflare)
- **Local**: http://localhost:3001 or http://192.168.1.50:3001
- **Scanner**: http://localhost:8001

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

In Next.js, Sentry initialization happens in specific files:
- `instrumentation-client.(js|ts)` - Client-side initialization
- `sentry.server.config.ts` - Server-side initialization
- `sentry.edge.config.ts` - Edge runtime initialization

Initialization only needs to happen in these files. In other files, import Sentry with:
```typescript
import * as Sentry from "@sentry/nextjs";
```

### Baseline Configuration

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://39b80cc3f3909f8b2514c64e6a55a610@o4510711778705408.ingest.us.sentry.io/4510711780278272",
  enableLogs: true,
});
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

## Future Plans

### Discord Bot Integration

A Discord bot will be developed to integrate with this app. Most Foxhole regiment collaboration happens in Discord, so the bot will allow:
- Querying stockpile inventory from Discord
- Creating/viewing operations
- Receiving notifications about low supplies or upcoming operations
- Quick stockpile updates via bot commands

The bot will use the same API endpoints and authentication system, with a service account for the bot user.

## Conventions

- **Hex as primary identifier**: Always show hex first when referencing stockpiles
- **Ctrl+V first**: Upload interfaces emphasize paste over file upload (Foxhole players are used to this)
- **No time estimates**: Don't add duration estimates in comments or planning
- **Minimal changes**: Only modify what's necessary, don't over-engineer
- **Update this file**: Keep CLAUDE.md current when making significant changes
- **Confirm commits**: Always show the user the proposed commit message and get confirmation before committing. Never commit without user approval.
