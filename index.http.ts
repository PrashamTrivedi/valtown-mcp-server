/**
 * ValTown Remote HTTP MCP Server
 * 
 * This is the HTTP entry point for the ValTown MCP Server when deployed
 * on ValTown itself. It excludes CLI-dependent functionality and uses
 * header-based authentication with Hono and StreamableHTTPServerTransport.
 */

import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { toFetchResponse, toReqRes } from "npm:fetch-to-node";
import { registerPromptsTools, registerTools } from "./registerTools.ts";
import { loadConfig } from "./config.ts";

const app = new Hono();

// Add CORS middleware
app.use("/*", cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id", "X-Val-Town-Token"],
}));

// Handle MCP requests
app.post("/", async (c) => {
  try {
    // Extract API token from headers
    const apiToken = c.req.header("X-Val-Town-Token") ||
      c.req.header("Authorization")?.replace("Bearer ", "");

    if (!apiToken) {
      return c.json({ 
        jsonrpc: "2.0",
        error: { code: -32000, message: "Missing API token in X-Val-Town-Token header or Authorization header" },
        id: null 
      }, 401);
    }

    // Load remote configuration
    const config = await loadConfig(true);
    config.apiToken = apiToken;

    // Convert Hono request to Node.js-style req/res
    const { req, res } = toReqRes(c.req.raw);

    // Create streamable HTTP transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    // Create MCP server instance
    const server = new McpServer({
      name: "val-town-remote",
      version: "1.0.0",
    });

    // Register tools (exclude CLI-dependent tools)
    await registerTools(server, config, { excludeCli: true });
    registerPromptsTools(server, config);

    // Connect server to transport
    await server.connect(transport);

    // Handle the MCP request using streamable transport
    await transport.handleRequest(req, res, await c.req.json());

    // Clean up on close
    res.on('close', () => {
      transport.close();
      server.close();
    });

    // Convert Node.js response back to Fetch response
    return toFetchResponse(res);

  } catch (error) {
    console.error("Error handling MCP request:", error);
    
    return c.json({ 
      jsonrpc: "2.0",
      error: { 
        code: -32603, 
        message: "Internal server error",
        data: error instanceof Error ? error.message : String(error)
      },
      id: null,
    }, 500);
  }
});

// Handle non-POST methods
app.all("/*", (c) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }
  
  return c.json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST for MCP requests." },
    id: null
  }, 405);
});

export default app;