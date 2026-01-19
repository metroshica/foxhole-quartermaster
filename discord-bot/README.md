# Foxhole Quartermaster Discord Bot

AI-powered Discord bot for regiment logistics management in Foxhole.

## Architecture

```
discord-bot/
├── mcp-server/     # MCP server exposing tools for data access
│   └── src/
│       ├── tools/  # Tool implementations (inventory, stockpiles, etc.)
│       └── utils/  # Utility functions
└── bot/            # Discord bot (uses MCP server + Gemini AI)
    └── src/
        ├── ai/         # Gemini AI integration
        ├── discord/    # Discord.js client and commands
        └── mcp/        # MCP client to connect to server
```

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Read Messages/View Channels`, `Use Slash Commands`
6. Use generated URL to invite bot to your server

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cd bot
cp .env.example .env
```

Edit `.env`:
```
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_client_id
GOOGLE_API_KEY=your_google_ai_api_key
DATABASE_URL=postgresql://...
```

### 3. Install Dependencies

```bash
# From discord-bot directory
cd mcp-server && bun install && bunx prisma generate
cd ../bot && bun install
```

### 4. Run the Bot

```bash
cd bot
bun run dev
```

## Features

### Slash Commands

| Command | Description |
|---------|-------------|
| `/stats` | Regiment dashboard overview |
| `/inventory [search]` | Search inventory items |
| `/stockpiles [hex]` | List stockpiles |
| `/production [status]` | View production orders |
| `/operations [status]` | View operations |
| `/help` | Show help |

### Natural Language (AI)

Mention the bot to ask questions:
- "How many crates of 12.7 do we have?"
- "Where are our mammons stored?"
- "What do we need for Operation Thunder?"
- "Show me pending production orders"

## Development

### Type Check

```bash
cd mcp-server && bun run tsc --noEmit
cd ../bot && bun run tsc --noEmit
```

### Project Structure

The bot uses a two-process architecture:
1. **MCP Server**: Exposes tools via Model Context Protocol (stdio transport)
2. **Discord Bot**: Connects to Discord, uses Gemini AI for NLP, calls MCP tools

This design allows the MCP server to also be used with Claude Desktop or other MCP clients.
