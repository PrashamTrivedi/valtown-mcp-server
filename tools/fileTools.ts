import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"
import {getCliAvailability, runVtCommand, parseCliJsonOutput, prepareValWorkspace, cleanupTempDirectory} from "../lib/vtCli.ts"
import * as path from "jsr:@std/path"
import {z} from "zod"

/**
 * Helper to perform file operations using the CLI
 * This handles the common pattern of:
 * 1. Clone the val to a workspace
 * 2. Checkout the correct branch if needed
 * 3. Modify files on disk
 * 4. Push changes back to Val Town
 * 5. Clean up workspace
 */
async function performFileOperationWithCli(
  config: Config,
  valId: string,
  branchId: string | undefined,
  operation: (workspacePath: string) => Promise<boolean>,
  operationDescription: string
): Promise<{success: boolean; output?: any; error?: string}> {
  try {
    console.log(`Using CLI for ${operationDescription} on val: ${valId}`)

    // Prepare workspace with the val cloned
    const workspace = await prepareValWorkspace(valId)

    if (!workspace.success || !workspace.workspacePath) {
      return {
        success: false,
        error: workspace.error || "Failed to prepare workspace"
      }
    }

    // If a branch is specified, checkout that branch
    if (branchId) {
      const checkoutResult = await runVtCommand(["checkout", branchId])

      if (!checkoutResult.success) {
        await cleanupTempDirectory(workspace.workspacePath!)
        return {
          success: false,
          error: `Failed to checkout branch: ${checkoutResult.error}`
        }
      }
    }

    // Perform the specific file operation
    const operationSuccess = await operation(workspace.workspacePath!)

    if (!operationSuccess) {
      await cleanupTempDirectory(workspace.workspacePath!)
      return {
        success: false,
        error: `File operation failed`
      }
    }

    // Push changes back to Val Town
    const pushResult = await runVtCommand(["push", "--json"])

    // Clean up temporary workspace
    await cleanupTempDirectory(workspace.workspacePath!)

    if (!pushResult.success) {
      return {
        success: false,
        error: `Failed to push changes: ${pushResult.error}`
      }
    }

    // Parse and return the result
    const parsedOutput = parseCliJsonOutput(pushResult.output)
    return {
      success: true,
      output: parsedOutput
    }
  } catch (error) {
    console.error(`CLI error during ${operationDescription}:`, getErrorMessage(error))
    return {
      success: false,
      error: getErrorMessage(error)
    }
  }
}

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
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false
      const cliAvailable = useCliIfAvailable && await getCliAvailability()

      if (cliAvailable) {
        try {
          // The CLI status command can be used to list files
          console.log(`Using CLI to list files for val: ${valId}`)

          // Prepare a workspace with the val cloned
          const workspace = await prepareValWorkspace(valId)

          if (workspace.success && workspace.workspacePath) {
            // If a branch is specified, checkout that branch first
            if (branchId) {
              const checkoutResult = await runVtCommand(["checkout", branchId])

              if (!checkoutResult.success) {
                console.error(`Failed to checkout branch: ${checkoutResult.error}`)
                await cleanupTempDirectory(workspace.workspacePath!)
                // Fall back to API
                console.error("CLI error when checking out branch, falling back to API")
                throw new Error("Failed to checkout branch")
              }
            }

            // Run the status command to list files
            const result = await runVtCommand(["status", "--json"])

            // Clean up the temporary directory
            await cleanupTempDirectory(workspace.workspacePath!)

            if (result.success) {
              // Parse JSON output
              const parsedOutput = parseCliJsonOutput(result.output)
              if (parsedOutput) {
                // Filter by path if needed
                // Apply pagination manually if needed
                return {
                  content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
                }
              }
            }
          }

          console.error(`CLI error when listing files, falling back to API: ${workspace.error || "Unknown error"}`)
          // Fall back to API on error
        } catch (error) {
          console.error("CLI error, falling back to API:", getErrorMessage(error))
          // Fall back to API on error
        }
      }

      // API implementation (original code)
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
    async ({valId, path: filePath, type, content, branchId}) => {
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false
      const cliAvailable = useCliIfAvailable && await getCliAvailability()

      if (cliAvailable) {
        try {
          const result = await performFileOperationWithCli(
            config,
            valId,
            branchId,
            async (workspacePath) => {
              try {
                const fullPath = path.join(workspacePath, filePath)

                // Create directory if needed
                if (type === "directory") {
                  try {
                    await Deno.mkdir(fullPath, {recursive: true})
                    return true
                  } catch (error) {
                    console.error(`Failed to create directory: ${getErrorMessage(error)}`)
                    return false
                  }
                } else {
                  // Create parent directories if needed
                  const parentDir = path.dirname(fullPath)
                  try {
                    await Deno.mkdir(parentDir, {recursive: true})
                  } catch (error) {
                    // Ignore if directory already exists
                    if (!(error instanceof Deno.errors.AlreadyExists)) {
                      console.error(`Failed to create parent directory: ${getErrorMessage(error)}`)
                      return false
                    }
                  }

                  // Create file with content
                  try {
                    await Deno.writeTextFile(fullPath, content || "")
                    return true
                  } catch (error) {
                    console.error(`Failed to create file: ${getErrorMessage(error)}`)
                    return false
                  }
                }
              } catch (error) {
                console.error(`File operation error: ${getErrorMessage(error)}`)
                return false
              }
            },
            `creating ${type === "directory" ? "directory" : "file"} at ${filePath}`
          )

          if (result.success) {
            return {
              content: [{type: "text", text: JSON.stringify(result.output || `Created ${type} at ${filePath}`, null, 2)}],
            }
          } else {
            console.error(`CLI error when creating ${type}, falling back to API: ${result.error}`)
            // Fall back to API
          }
        } catch (error) {
          console.error("CLI error, falling back to API:", getErrorMessage(error))
          // Fall back to API on error
        }
      }

      // API implementation (original code)
      try {
        let queryParams = `?path=${encodeURIComponent(filePath)}`
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
    async ({valId, path: filePath, content, branchId}) => {
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false
      const cliAvailable = useCliIfAvailable && await getCliAvailability()

      if (cliAvailable) {
        try {
          const result = await performFileOperationWithCli(
            config,
            valId,
            branchId,
            async (workspacePath) => {
              try {
                const fullPath = path.join(workspacePath, filePath)

                // Update file with new content
                try {
                  await Deno.writeTextFile(fullPath, content)
                  return true
                } catch (error) {
                  console.error(`Failed to update file: ${getErrorMessage(error)}`)
                  return false
                }
              } catch (error) {
                console.error(`File operation error: ${getErrorMessage(error)}`)
                return false
              }
            },
            `updating file at ${filePath}`
          )

          if (result.success) {
            return {
              content: [{type: "text", text: JSON.stringify(result.output || `Updated file at ${filePath}`, null, 2)}],
            }
          } else {
            console.error(`CLI error when updating file, falling back to API: ${result.error}`)
            // Fall back to API
          }
        } catch (error) {
          console.error("CLI error, falling back to API:", getErrorMessage(error))
          // Fall back to API on error
        }
      }

      // API implementation (original code)
      try {
        let queryParams = `?path=${encodeURIComponent(filePath)}`
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
    async ({valId, path: filePath, recursive, branchId}) => {
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false
      const cliAvailable = useCliIfAvailable && await getCliAvailability()

      if (cliAvailable) {
        try {
          const result = await performFileOperationWithCli(
            config,
            valId,
            branchId,
            async (workspacePath) => {
              try {
                const fullPath = path.join(workspacePath, filePath)

                // Check if it's a file or directory
                try {
                  const stat = await Deno.stat(fullPath)

                  if (stat.isDirectory) {
                    // Delete directory
                    try {
                      await Deno.remove(fullPath, {recursive})
                      return true
                    } catch (error) {

                      console.error(`Failed to delete directory: ${getErrorMessage(error)}`)
                      return false
                    }
                  } else {
                    // Delete file
                    try {
                      await Deno.remove(fullPath)
                      return true
                    } catch (error) {
                      console.error(`Failed to delete file: ${getErrorMessage(error)}`)
                      return false
                    }
                  }
                } catch (error) {
                  console.error(`Failed to check path: ${getErrorMessage(error)}`)
                  return false
                }
              } catch (error) {
                console.error(`File operation error: ${getErrorMessage(error)}`)
                return false
              }
            },
            `deleting path ${filePath}`
          )

          if (result.success) {
            return {
              content: [{type: "text", text: `File or directory at path ${filePath} deleted successfully.`}],
            }
          } else {
            console.error(`CLI error when deleting path, falling back to API: ${result.error}`)
            // Fall back to API
          }
        } catch (error) {
          console.error("CLI error, falling back to API:", getErrorMessage(error))
          // Fall back to API on error
        }
      }

      // API implementation (original code)
      try {
        let queryParams = `?path=${encodeURIComponent(filePath)}&recursive=${recursive}`
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
          content: [{type: "text", text: `File or directory at path ${filePath} deleted successfully.`}],
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