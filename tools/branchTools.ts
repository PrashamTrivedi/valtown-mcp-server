import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {z} from "zod"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"

export function registerBranchTools(server: McpServer, config: Config) {
  // List branches in a project
  server.tool(
    "list-branches",
    "List all branches in a project",
    {
      projectId: z.string().describe("ID of the project"),
      limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results to return"),
      offset: z.number().int().min(0).default(0).describe("Number of items to skip for pagination"),
    },
    async ({projectId, limit, offset}: {
      projectId: string
      limit: number
      offset: number
    }) => {
      try {
        const data = await callValTownApi(
          config,
          `/v1/projects/${projectId}/branches?limit=${limit}&offset=${offset}`
        )

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error listing branches: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Get a specific branch
  server.tool(
    "get-branch",
    "Get details about a specific branch",
    {
      projectId: z.string().describe("ID of the project"),
      branchId: z.string().describe("ID of the branch"),
    },
    async ({projectId, branchId}: {
      projectId: string
      branchId: string
    }) => {
      try {
        const data = await callValTownApi(config, `/v1/projects/${projectId}/branches/${branchId}`)

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error getting branch: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Create a new branch
  server.tool(
    "create-branch",
    "Create a new branch in a project",
    {
      projectId: z.string().describe("ID of the project"),
      name: z.string().describe("Name for the branch"),
      forkedBranchId: z.string().optional().describe("ID of branch to fork from (optional)"),
    },
    async ({projectId, name, forkedBranchId}: {
      projectId: string
      name: string
      forkedBranchId?: string
    }) => {
      try {
        const payload = {
          name,
          ...(forkedBranchId ? {forkedBranchId} : {}),
        }

        const data = await callValTownApi(config, `/v1/projects/${projectId}/branches`, {
          method: "POST",
          body: JSON.stringify(payload),
        })

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error creating branch: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Delete a branch
  server.tool(
    "delete-branch",
    "Delete a branch from a project",
    {
      projectId: z.string().describe("ID of the project"),
      branchId: z.string().describe("ID of the branch to delete"),
    },
    async ({projectId, branchId}: {
      projectId: string
      branchId: string
    }) => {
      try {
        await callValTownApi(config, `/v1/projects/${projectId}/branches/${branchId}`, {
          method: "DELETE",
        })

        return {
          content: [{type: "text", text: "Branch deleted successfully"}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error deleting branch: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )
}