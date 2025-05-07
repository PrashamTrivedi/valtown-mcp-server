import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"
import {z} from "zod"

export function registerValTools(server: McpServer, config: Config) {
  // Get val by username and val name
  server.tool(
    "get-val",
    "Get a val by username and val name",
    {
      username: z.string().describe("Username of the val's owner"),
      valName: z.string().describe("Name of the val"),
    },
    async ({username, valName}) => {
      try {
        const data = await callValTownApi(
          config,
          `/v2/alias/vals/${encodeURIComponent(username)}/${encodeURIComponent(valName)}`
        )
        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error getting val: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Search vals
  server.tool(
    "search-vals",
    "Search for vals across the Val Town platform",
    {
      query: z.string().describe("Search query").min(1).max(256),
      limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results to return"),
      offset: z.number().int().min(0).default(0).describe("Number of items to skip for pagination"),
    },
    async ({query, limit, offset}) => {
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
        return {
          content: [{type: "text", text: `Error searching vals: ${getErrorMessage(error)}`}],
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
      description: z.string().optional().describe("Description for the val (optional)"),
      privacy: z.enum(["public", "unlisted", "private"]).default("public").describe("Privacy setting: public, unlisted, or private"),
    },
    async ({name, description, privacy}) => {
      try {
        const requestBody = {
          name,
          privacy,
          ...(description ? {description} : {})
        }

        const data = await callValTownApi(
          config,
          `/v2/vals`,
          {
            method: "POST",
            body: JSON.stringify(requestBody),
          }
        )

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error creating val: ${getErrorMessage(error)}`}],
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
    async ({valId}) => {
      try {
        await callValTownApi(
          config,
          `/v2/vals/${valId}`,
          {
            method: "DELETE",
          }
        )

        return {
          content: [{type: "text", text: `Val ${valId} deleted successfully.`}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error deleting val: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // List all vals for authenticated user
  server.tool(
    "list-my-vals",
    "List all vals for the authenticated user",
    {
      limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results to return"),
      offset: z.number().int().min(0).default(0).describe("Number of items to skip for pagination"),
    },
    async ({limit, offset}) => {
      try {
        const data = await callValTownApi(
          config,
          `/v2/me/vals?limit=${limit}&offset=${offset}`
        )
        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error listing your vals: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )
}