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
- **Package Manager**: Bun

## Architecture Overview

### Multi-Tenant Design

All data is scoped by `regimentId` (Discord server ID). Users can belong to multiple regiments but have one "selected" regiment active at a time.

```
User -> RegimentMember -> Regiment
                      -> Stockpiles -> StockpileItems
                      -> Operations -> OperationRequirements
```

### Permission Levels

- **VIEWER**: Read-only access
- **EDITOR**: Can create/update stockpiles, operations
- **ADMIN**: Full access including delete operations

## Key Domain Concepts

### Foxhole Items

Items use internal codes (e.g., `RifleC`, `HEGrenade`) mapped to display names. The mapping is in:
- `src/lib/foxhole/item-names.ts` - Item code to display name mapping
- `src/lib/foxhole/item-icons.ts` - Item code to icon URL mapping
- `src/lib/foxhole/regions.ts` - Hex names and locations

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

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, regiment selection
│   ├── (dashboard)/         # Main app pages
│   │   ├── page.tsx         # Dashboard home
│   │   ├── operations/      # Operations CRUD
│   │   ├── stockpiles/      # Stockpile list/detail
│   │   ├── upload/          # OCR upload page
│   │   └── settings/        # User settings
│   └── api/
│       ├── auth/            # NextAuth endpoints
│       ├── dashboard/       # Dashboard stats
│       ├── inventory/       # Aggregate inventory queries
│       ├── operations/      # Operations CRUD
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
| `Operation` | Planned military operations |
| `OperationRequirement` | Items needed for an operation |

### Key Fields

- `Stockpile.type`: "SEAPORT" | "DEPOT" | "BASE" | "STORAGE_DEPOT"
- `Stockpile.hex`: Map region name (e.g., "Westgate", "King's Cage")
- `Operation.status`: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
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

### Adding a New Hex

Update `src/lib/foxhole/regions.ts`

### Modifying Database Schema

1. Edit `prisma/schema.prisma`
2. Run `bun run db:push` (dev) or `bun run db:migrate` (prod)
3. If adding fields to existing models, update relevant API routes

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
