import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"
import {z} from "zod"

export function registerFileTools(server: McpServer, config: Config) {
  // List files in a val branch
  server.tool(
    "list-files",
    "List files in a val branch",
    {
      valId: z.string().describe("ID of the val"),
      path: z.string().default("").describe("Path to directory (leave empty for root)"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
      recursive: z.boolean().default(false).describe("Whether to list files recursively"),
      limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results to return"),
      offset: z.number().int().min(0).default(0).describe("Number of items to skip for pagination"),
    },
    async ({valId, path, branchId, recursive, limit, offset}) => {
      try {
        let queryParams = `?path=${encodeURIComponent(path)}&recursive=${recursive}&limit=${limit}&offset=${offset}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }

        const data = await callValTownApi(
          config,
          `/v2/vals/${valId}/files${queryParams}`
        )

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error listing files: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Get file content from a val branch
  server.tool(
    "get-file",
    "Get file content from a val branch",
    {
      valId: z.string().describe("ID of the val"),
      path: z.string().describe("Path to the file"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({valId, path, branchId}) => {
      try {
        let queryParams = `?path=${encodeURIComponent(path)}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }

        const response = await fetch(
          `${config.apiBase}/v2/vals/${valId}/files/content${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${config.apiToken}`,
            },
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API error (${response.status}): ${errorText}`)
        }

        const content = await response.text()

        return {
          content: [{type: "text", text: content}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error getting file content: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Create a new file or directory in a val branch
  server.tool(
    "create-file-or-directory",
    "Create a new file or directory in a val branch",
    {
      valId: z.string().describe("ID of the val"),
      path: z.string().describe("Path to the new file or directory"),
      type: z.enum(["file", "interval", "http", "email", "script", "directory"]).describe("Type of resource to create: file, interval, http, email, script, or directory. Only use `file` for non code files. For code files, including scripts and UI Code, use `interval`, `http`, `email`, or `script`."),
      content: z.string().optional().describe("Content for the file (required for files, not for directories, the code must be in typescript)"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({valId, path, type, content, branchId}) => {
      try {
        let queryParams = `?path=${encodeURIComponent(path)}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }

        const requestBody = {
          type,
          ...(type !== "directory" ? {content: content || ""} : {content: null}),
        }

        const data = await callValTownApi(
          config,
          `/v2/vals/${valId}/files${queryParams}`,
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
          content: [{type: "text", text: `Error creating file or directory: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Update an existing file in a val branch
  server.tool(
    "update-file",
    "Update an existing file in a val branch",
    {
      valId: z.string().describe("ID of the val"),
      path: z.string().describe("Path to the file"),
      content: z.string().describe("New content for the file"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({valId, path, content, branchId}) => {
      try {
        let queryParams = `?path=${encodeURIComponent(path)}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }

        const data = await callValTownApi(
          config,
          `/v2/vals/${valId}/files${queryParams}`,
          {
            method: "PUT",
            body: JSON.stringify({content}),
          }
        )

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error updating file: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Delete a file or directory from a val branch
  server.tool(
    "delete-file-or-directory",
    "Delete a file or directory from a val branch",
    {
      valId: z.string().describe("ID of the val"),
      path: z.string().describe("Path to the file or directory"),
      recursive: z.boolean().default(false).describe("Whether to recursively delete all files in the directory"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({valId, path, recursive, branchId}) => {
      try {
        let queryParams = `?path=${encodeURIComponent(path)}&recursive=${recursive}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }

        await callValTownApi(
          config,
          `/v2/vals/${valId}/files${queryParams}`,
          {
            method: "DELETE",
          }
        )

        return {
          content: [{type: "text", text: `File or directory at path ${path} deleted successfully.`}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error deleting file or directory: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )
}