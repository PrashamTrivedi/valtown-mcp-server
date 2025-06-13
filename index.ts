/**
 * ValTown Remote HTTP MCP Server
 * 
 * This is the HTTP entry point for the ValTown MCP Server when deployed
 * on ValTown itself. It excludes CLI-dependent functionality and uses
 * header-based authentication.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerPromptsTools, registerTools } from "./registerTools.ts";
import { loadConfig } from "./config.ts";

/**
 * HTTP handler for ValTown deployment
 * Handles MCP requests over HTTP with streamable transport
 */
export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, Mcp-Session-Id, X-Val-Town-Token",
      },
    });
  }

  try {
    // Extract API token from headers
    const apiToken = req.headers.get("X-Val-Town-Token") ||
      req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!apiToken) {
      return new Response(
        JSON.stringify({ error: "Missing API token in X-Val-Town-Token header or Authorization header" }),
        { 
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Load remote configuration
    const config = await loadConfig(true);
    config.apiToken = apiToken;

    // Create MCP server instance
    const server = new McpServer({
      name: "val-town-remote",
      version: "1.0.0",
    });

    // Register tools (exclude CLI-dependent tools)
    await registerTools(server, config, { excludeCli: true });
    registerPromptsTools(server, config);

    // Create streamable HTTP transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    // Connect server to transport
    await server.connect(transport);

    // Handle the MCP request
    const response = await transport.handleRequest(req);
    
    // Add CORS headers to response
    response.headers.set("Access-Control-Allow-Origin", "*");
    
    return response;
  } catch (error) {
    console.error("Error handling MCP request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}