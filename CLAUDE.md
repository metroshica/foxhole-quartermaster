# Foxhole Quartermaster

## Development

- **Port**: Always use port 3001 (`bun run dev` is configured for this). Port 3000 is used by another Foxhole app.
- **Start server**: `export $(grep -v '^#' .env.local | xargs) && bun run dev`

## Tech Stack

- Next.js 14 (App Router)
- Prisma with PostgreSQL
- NextAuth.js v5 (Auth.js) with Discord OAuth
- shadcn/ui components
- Tailwind CSS

## Key Patterns

- Multi-tenant architecture scoped by `regimentId`
- Permission levels: VIEWER, EDITOR, ADMIN
- Foxhole items use internal codes (e.g., "RifleC") mapped to display names
- OCR scanner for stockpile screenshots (template matching + Tesseract)

## Database

- `bun run db:push` - Push schema changes
- `bun run db:studio` - Open Prisma Studio
