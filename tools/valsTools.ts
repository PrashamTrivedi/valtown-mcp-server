import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {z} from "zod"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"

export function registerValTools(server: McpServer, config: Config) {
  // Search for vals
  server.tool(
    "search-vals",
    "Search for vals across the Val Town platform",
    {
      query: z.string().min(1).max(256).describe("Search query"),
      limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results to return"),
      offset: z.number().int().min(0).default(0).describe("Number of items to skip for pagination"),
    },
    async ({query, limit, offset}: {
      query: string
      limit: number
      offset: number
    }) => {
      try {
        const data = await callValTownApi(
          config,
          `/v1/search/vals?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
        )

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error searching vals: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )

  // Get a specific val
  server.tool(
    "get-val",
    "Get a val by username and val name",
    {
      username: z.string().describe("Username of the val's owner"),
      valName: z.string().describe("Name of the val"),
    },
    async ({username, valName}: {
      username: string
      valName: string
    }) => {
      try {
        const data = await callValTownApi(
          config,
          `/v1/alias/${encodeURIComponent(username)}/${encodeURIComponent(valName)}`
        )

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error getting val: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )

  // Create a new val
  server.tool(
    "create-val",
    "Create a new val (code snippet)",
    {
      name: z.string().describe("Name for the val"),
      code: z.string().describe("TypeScript code for the val"),
      privacy: z.enum(["public", "unlisted", "private"]).default("public")
        .describe("Privacy setting: public, unlisted, or private"),
      type: z.enum(["interval", "http", "express", "email", "script", "rpc", "httpnext"]).default("script")
        .describe("Type of val (script is for libraries or one-off calculations)"),
      readme: z.string().optional().describe("Markdown readme for the val (optional)"),
    },
    async ({name, code, privacy, type, readme}: {
      name: string
      code: string
      privacy: "public" | "unlisted" | "private"
      type: "interval" | "http" | "express" | "email" | "script" | "rpc" | "httpnext"
      readme?: string
    }) => {
      try {
        const payload = {
          name,
          code,
          privacy,
          type,
          ...(readme ? {readme} : {}),
        }

        const data = await callValTownApi(config, "/v1/vals", {
          method: "POST",
          body: JSON.stringify(payload),
        })

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error creating val: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )

  // Update an existing val
  server.tool(
    "update-val",
    "Update an existing val",
    {
      valId: z.string().uuid().describe("ID of the val to update"),
      code: z.string().optional().describe("New code for the val (optional)"),
      name: z.string().optional().describe("New name for the val (optional)"),
      privacy: z.enum(["public", "unlisted", "private"]).optional()
        .describe("Privacy setting: public, unlisted, or private (optional)"),
      type: z.enum(["interval", "http", "express", "email", "script", "rpc", "httpnext"]).optional()
        .describe("Type of val (optional)"),
      readme: z.string().optional().describe("Markdown readme for the val (optional)"),
    },
    async ({valId, ...updates}: {
      valId: string
      code?: string
      name?: string
      privacy?: "public" | "unlisted" | "private"
      type?: "interval" | "http" | "express" | "email" | "script" | "rpc" | "httpnext"
      readme?: string
    }) => {
      try {
        if (Object.keys(updates).length === 0) {
          return {
            content: [{
              type: "text",
              text: "Error: At least one field to update must be provided"
            }],
            isError: true,
          }
        }

        const data = await callValTownApi(config, `/v1/vals/${valId}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        })

        return {
          content: [{
            type: "text",
            text: "Val updated successfully" + (data ? `: ${JSON.stringify(data, null, 2)}` : "")
          }],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error updating val: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )

  // Create a new version of a val
  server.tool(
    "create-val-version",
    "Create a new version of an existing val",
    {
      valId: z.string().uuid().describe("ID of the val"),
      code: z.string().describe("New TypeScript code for the val"),
    },
    async ({valId, code}: {
      valId: string
      code: string
    }) => {
      try {
        const data = await callValTownApi(config, `/v1/vals/${valId}/versions`, {
          method: "POST",
          body: JSON.stringify({code}),
        })

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error creating val version: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )

  // Delete a val
  server.tool(
    "delete-val",
    "Delete a val by ID",
    {
      valId: z.string().uuid().describe("ID of the val to delete"),
    },
    async ({valId}: {valId: string}) => {
      try {
        await callValTownApi(config, `/v1/vals/${valId}`, {
          method: "DELETE",
        })

        return {
          content: [{type: "text", text: "Val deleted successfully"}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error deleting val: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )
}