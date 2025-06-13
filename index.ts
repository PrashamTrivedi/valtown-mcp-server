/**
 * ValTown Remote HTTP MCP Server
 * 
 * This is the HTTP entry point for the ValTown MCP Server when deployed
 * on ValTown itself. It excludes CLI-dependent functionality and uses
 * header-based authentication.
 */

import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { registerPromptsTools, registerTools } from "./registerTools.ts";
import { loadConfig } from "./config.ts";

/**
 * HTTP handler for ValTown deployment
 * Handles MCP requests over HTTP
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

  // Only handle POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ 
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed" },
        id: null 
      }),
      { 
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    // Extract API token from headers
    const apiToken = req.headers.get("X-Val-Town-Token") ||
      req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!apiToken) {
      return new Response(
        JSON.stringify({ 
          jsonrpc: "2.0",
          error: { code: -32000, message: "Missing API token in X-Val-Town-Token header or Authorization header" },
          id: null 
        }),
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

    // Parse request body
    const body = await req.json();

    // Create a minimal transport interface
    const transport = {
      start: () => Promise.resolve(),
      send: (_message: unknown) => Promise.resolve(),
      close: () => Promise.resolve()
    };

    // Connect server
    await server.connect(transport);

    // Handle the MCP request directly
    let response;
    try {
      if (body.method === "initialize") {
        response = {
          jsonrpc: "2.0",
          id: body.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              prompts: {},
            },
            serverInfo: {
              name: "val-town-remote",
              version: "1.0.0",
            },
          },
        };
      } else if (body.method === "tools/list") {
        // Get registered tools from the server
        const toolsMap = (server as any)._tools || new Map();
        const tools = Array.from(toolsMap.values()).map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));
        response = {
          jsonrpc: "2.0",
          id: body.id,
          result: { tools },
        };
      } else if (body.method === "tools/call") {
        // Call the tool directly
        const toolsMap = (server as any)._tools || new Map();
        const tool = toolsMap.get(body.params.name);
        if (!tool) {
          throw new Error(`Tool not found: ${body.params.name}`);
        }
        const result = await tool.handler(body.params.arguments || {});
        response = {
          jsonrpc: "2.0",
          id: body.id,
          result,
        };
      } else if (body.method === "prompts/list") {
        // Get registered prompts from the server
        const promptsMap = (server as any)._prompts || new Map();
        const prompts = Array.from(promptsMap.values()).map((prompt: any) => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments,
        }));
        response = {
          jsonrpc: "2.0",
          id: body.id,
          result: { prompts },
        };
      } else if (body.method === "prompts/get") {
        // Get prompt from the server
        const promptsMap = (server as any)._prompts || new Map();
        const prompt = promptsMap.get(body.params.name);
        if (!prompt) {
          throw new Error(`Prompt not found: ${body.params.name}`);
        }
        const result = await prompt.handler(body.params.arguments || {});
        response = {
          jsonrpc: "2.0",
          id: body.id,
          result,
        };
      } else {
        response = {
          jsonrpc: "2.0",
          error: { code: -32601, message: "Method not found" },
          id: body.id,
        };
      }
    } catch (error) {
      response = {
        jsonrpc: "2.0",
        error: { 
          code: -32603, 
          message: "Internal error",
          data: error instanceof Error ? error.message : String(error)
        },
        id: body.id,
      };
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("Error handling MCP request:", error);
    
    return new Response(
      JSON.stringify({ 
        jsonrpc: "2.0",
        error: { 
          code: -32603, 
          message: "Internal server error",
          data: error instanceof Error ? error.message : String(error)
        },
        id: null,
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