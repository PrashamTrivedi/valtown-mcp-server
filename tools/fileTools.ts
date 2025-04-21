import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {z} from "zod"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"
import {getCliAvailability, runVtCommand} from "../lib/vtCli.ts"

export function registerFileTools(server: McpServer, config: Config) {
  // List files
  server.tool(
    "list-files",
    "List files in a project branch",
    {
      projectId: z.string().describe("ID of the project"),
      path: z.string().default("").describe("Path to directory (leave empty for root)"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)").default("main"),
      recursive: z.boolean().default(false).describe("Whether to list files recursively"),
      limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results to return"),
      offset: z.number().int().min(0).default(0).describe("Number of items to skip for pagination"),
    },
    async ({projectId, path, branchId, recursive, limit, offset}: {
      projectId: string
      path: string
      branchId?: string
      recursive: boolean
      limit: number
      offset: number
    }) => {
      try {
        let endpoint = `/v1/projects/${projectId}/files`

        let queryParams = `?path=${encodeURIComponent(path)}&limit=${limit}&offset=${offset}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }
        if (recursive) {
          queryParams += "&recursive=true"
        }

        const data = await callValTownApi(config, endpoint + queryParams)

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

  // Get file content
  server.tool(
    "get-file",
    "Get file content from a project branch",
    {
      projectId: z.string().describe("ID of the project"),
      path: z.string().describe("Path to the file"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({projectId, path, branchId}: {
      projectId: string
      path: string
      branchId?: string
    }) => {
      const cliAvailable = await getCliAvailability();
      
      // For project checkout and file viewing, CLI is more efficient
      if (cliAvailable && config.cli?.preferCli) {
        try {
          // Determine the project path based on user/project structure
          // This assumes we first need to get project info to determine username/project name
          // Use a more direct approach if the CLI allows direct file access by project ID
          
          // First check if we need to checkout the branch
          if (branchId) {
            const checkout = await runVtCommand(["checkout", branchId, "--project", projectId]);
            if (!checkout.success) {
              console.error("Failed to checkout branch:", checkout.error);
              // Fallback to API
            }
          }
          
          // Use the pull command to get latest content
          const result = await runVtCommand(["pull", "--project", projectId, "--json"]);
          
          if (result.success) {
            // If pull is successful, try to read the file using cat command
            const catResult = await runVtCommand(["cat", path, "--project", projectId]);
            
            if (catResult.success) {
              return {
                content: [{type: "text", text: catResult.output}],
              };
            }
          }
        } catch (error) {
          console.error("CLI error:", error);
          // Continue to API fallback
        }
      }
      
      // Fallback to original API implementation
      try {
        let endpoint = `/v1/projects/${projectId}/files/content`
        let queryParams = `?path=${encodeURIComponent(path)}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }
        endpoint += queryParams

        // For file content, we need to handle the response differently
        const url = `${config.apiBase}${endpoint}`
        const options = {
          headers: {
            "Authorization": `Bearer ${config.apiToken}`,
          },
        }

        const response = await fetch(url, options)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`)
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

  // Create file or directory
  server.tool(
    "create-file-or-directory",
    "Create a new file or directory in a project branch",
    {
      projectId: z.string().describe("ID of the project"),
      path: z.string().describe("Path to the new file or directory"),
      type: z.enum(["file", "interval", "http", "email", "script", "directory"])
        .describe("Type of resource to create: file, interval, http, email, script, or directory. Only use `file` for non code files. For code files, including scripts and UI Code, use `interval`, `http`, `email`, or `script`."),
      content: z.string().optional().describe("Content for the file (required for files, not for directories, the code must be in typescript)"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({projectId, path, type, content, branchId}: {
      projectId: string
      path: string
      type: "file" | "interval" | "http" | "email" | "script" | "directory"
      content?: string
      branchId?: string
    }) => {
      try {
        // Validate that content is provided for files
        if (type !== "directory" && content === undefined) {
          return {
            content: [{type: "text", text: "Error: Content is required when creating a file"}],
            isError: true,
          }
        }

        let endpoint = `/v1/projects/${projectId}/files`
        let queryParams = `?path=${encodeURIComponent(path)}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }
        endpoint += queryParams

        const payload = {
          type,
          ...(content !== undefined ? {content} : {}),
        }

        const data = await callValTownApi(config, endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        })

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        return {
          content: [{type: "text", text: `Error creating ${type}: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Update file
  server.tool(
    "update-file",
    "Update an existing file in a project branch",
    {
      projectId: z.string().describe("ID of the project"),
      path: z.string().describe("Path to the file"),
      content: z.string().describe("New content for the file"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({projectId, path, content, branchId}: {
      projectId: string
      path: string
      content: string
      branchId?: string
    }) => {
      const cliAvailable = await getCliAvailability();
      
      // For file updates, CLI can be more efficient with write and push operations
      if (cliAvailable && config.cli?.preferCli) {
        try {
          // First check if we need to checkout the branch
          if (branchId) {
            const checkout = await runVtCommand(["checkout", branchId, "--project", projectId]);
            if (!checkout.success) {
              console.error("Failed to checkout branch:", checkout.error);
              // Fallback to API
            }
          }
          
          // Create a temporary file to hold the content
          const tempFile = await Deno.makeTempFile();
          await Deno.writeTextFile(tempFile, content);
          
          // Use the write command to update the file
          const writeResult = await runVtCommand([
            "write", 
            path, 
            "--from", 
            tempFile,
            "--project", 
            projectId
          ]);
          
          // Clean up the temp file
          await Deno.remove(tempFile);
          
          if (writeResult.success) {
            // If write is successful, push the changes
            const pushResult = await runVtCommand(["push", "--project", projectId, "--json"]);
            
            if (pushResult.success) {
              try {
                const data = JSON.parse(pushResult.output);
                return {
                  content: [{type: "text", text: JSON.stringify(data, null, 2)}],
                };
              } catch {
                return {
                  content: [{type: "text", text: "File updated successfully"}],
                };
              }
            }
          }
        } catch (error) {
          console.error("CLI error:", error);
          // Continue to API fallback
        }
      }
      
      // Fallback to original API implementation
      try {
        let endpoint = `/v1/projects/${projectId}/files`
        let queryParams = `?path=${encodeURIComponent(path)}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }
        endpoint += queryParams

        const data = await callValTownApi(config, endpoint, {
          method: "PUT",
          body: JSON.stringify({content}),
        })

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

  // Delete file or directory
  server.tool(
    "delete-file-or-directory",
    "Delete a file or directory from a project branch",
    {
      projectId: z.string().describe("ID of the project"),
      path: z.string().describe("Path to the file or directory"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({projectId, path, branchId}: {
      projectId: string
      path: string
      branchId?: string
    }) => {
      try {
        let endpoint = `/v1/projects/${projectId}/files`
        let queryParams = `?path=${encodeURIComponent(path)}`
        if (branchId) {
          queryParams += `&branch_id=${encodeURIComponent(branchId)}`
        }
        endpoint += queryParams

        await callValTownApi(config, endpoint, {
          method: "DELETE",
        })

        return {
          content: [{type: "text", text: "File or directory deleted successfully"}],
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