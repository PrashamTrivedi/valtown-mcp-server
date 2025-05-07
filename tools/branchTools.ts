import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"
import {z} from "zod"

export function registerBranchTools(server: McpServer, config: Config) {
  // List all branches in a val
  server.tool(
    "list-branches",
    "List all branches in a val",
    {
      valId: z.string().describe("ID of the val"),
      limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results to return"),
      offset: z.number().int().min(0).default(0).describe("Number of items to skip for pagination"),
    },
    async ({valId, limit, offset}) => {
      try {
        const data = await callValTownApi(
          config,
          `/v2/vals/${valId}/branches?limit=${limit}&offset=${offset}`
        )
        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error listing branches: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Get details about a specific branch
  server.tool(
    "get-branch",
    "Get details about a specific branch",
    {
      valId: z.string().describe("ID of the val"),
      branchId: z.string().describe("ID of the branch"),
    },
    async ({valId, branchId}) => {
      try {
        const data = await callValTownApi(
          config,
          `/v2/vals/${valId}/branches/${branchId}`
        )
        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error getting branch: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Create a new branch in a val
  server.tool(
    "create-branch",
    "Create a new branch in a val",
    {
      valId: z.string().describe("ID of the val"),
      name: z.string().describe("Name for the branch"),
      branchId: z.string().optional().describe("ID of branch to fork from (optional)"),
    },
    async ({valId, name, branchId}) => {
      try {
        const requestBody = {
          name,
          ...(branchId ? {branchId} : {}),
        }

        const data = await callValTownApi(
          config,
          `/v2/vals/${valId}/branches`,
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
          content: [{type: "text", text: `Error creating branch: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Delete a branch from a val
  server.tool(
    "delete-branch",
    "Delete a branch from a val",
    {
      valId: z.string().describe("ID of the val"),
      branchId: z.string().describe("ID of the branch to delete"),
    },
    async ({valId, branchId}) => {
      try {
        await callValTownApi(
          config,
          `/v2/vals/${valId}/branches/${branchId}`,
          {
            method: "DELETE",
          }
        )

        return {
          content: [{type: "text", text: `Branch ${branchId} deleted successfully.`}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error deleting branch: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )
}