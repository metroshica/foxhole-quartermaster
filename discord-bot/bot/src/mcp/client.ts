import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mcpClient: Client | null = null;
let mcpProcess: ChildProcess | null = null;

export interface McpToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

export interface McpClient {
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
  listTools(): Promise<Array<{ name: string; description?: string }>>;
  close(): Promise<void>;
}

export async function initMcpClient(): Promise<McpClient> {
  if (mcpClient) {
    return wrapClient(mcpClient);
  }

  console.log("Starting MCP server...");

  // Path to the MCP server
  const mcpServerPath = path.resolve(__dirname, "../../../mcp-server/src/index.ts");

  // Spawn the MCP server process
  mcpProcess = spawn("bun", ["run", mcpServerPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      // Pass through database URL
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });

  // Log stderr for debugging
  mcpProcess.stderr?.on("data", (data) => {
    console.error(`[MCP Server] ${data.toString()}`);
  });

  mcpProcess.on("error", (error) => {
    console.error("MCP server process error:", error);
  });

  mcpProcess.on("exit", (code) => {
    console.log(`MCP server process exited with code ${code}`);
    mcpClient = null;
    mcpProcess = null;
  });

  // Create transport and client
  const transport = new StdioClientTransport({
    command: "bun",
    args: ["run", mcpServerPath],
    env: process.env as Record<string, string>,
  });

  mcpClient = new Client({
    name: "foxhole-quartermaster-bot",
    version: "1.0.0",
  });

  await mcpClient.connect(transport);

  console.log("MCP client connected");

  return wrapClient(mcpClient);
}

function wrapClient(client: Client): McpClient {
  return {
    async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
      const result = await client.callTool({ name, arguments: args });
      return result as McpToolResult;
    },

    async listTools() {
      const result = await client.listTools();
      return result.tools.map((t) => ({
        name: t.name,
        description: t.description,
      }));
    },

    async close() {
      await client.close();
      mcpClient = null;
      if (mcpProcess) {
        mcpProcess.kill();
        mcpProcess = null;
      }
    },
  };
}

export function getMcpClient(): McpClient {
  if (!mcpClient) {
    throw new Error("MCP client not initialized. Call initMcpClient() first.");
  }
  return wrapClient(mcpClient);
}

export async function closeMcpClient(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
  }
  if (mcpProcess) {
    mcpProcess.kill();
    mcpProcess = null;
  }
}
