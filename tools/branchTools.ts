import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"
import {getCliAvailability, runVtCommand, parseCliJsonOutput, prepareValWorkspace, cleanupTempDirectory} from "../lib/vtCli.ts"
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
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false;
      const cliAvailable = useCliIfAvailable && await getCliAvailability();

      if (cliAvailable) {
        try {
          // The CLI branch command requires working in a Val directory
          console.log(`Using CLI to list branches for val: ${valId}`);
          
          // Prepare a workspace with the val cloned
          const workspace = await prepareValWorkspace(valId);
          
          if (workspace.success && workspace.workspacePath) {
            // Run the branch command in the workspace
            const result = await runVtCommand(["branch", "--json"]);
            
            // Clean up the temporary directory
            await cleanupTempDirectory(workspace.workspacePath);
            
            if (result.success) {
              // Parse JSON output
              const parsedOutput = parseCliJsonOutput(result.output);
              if (parsedOutput) {
                // Apply limit and offset manually if needed
                return {
                  content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
                };
              }
            }
          }
          
          console.error(`CLI error when listing branches, falling back to API: ${workspace.error || "Unknown error"}`);
          // Fall back to API on error
        } catch (error) {
          console.error("CLI error, falling back to API:", getErrorMessage(error));
          // Fall back to API on error
        }
      }

      // API implementation (original code)
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
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false;
      const cliAvailable = useCliIfAvailable && await getCliAvailability();

      if (cliAvailable) {
        try {
          // The CLI checkout -b command requires working in a Val directory
          console.log(`Using CLI to create branch '${name}' for val: ${valId}`);
          
          // Prepare a workspace with the val cloned
          const workspace = await prepareValWorkspace(valId);
          
          if (workspace.success && workspace.workspacePath) {
            // If a source branch is specified, checkout that branch first
            if (branchId) {
              const checkoutResult = await runVtCommand(["checkout", branchId]);
              
              if (!checkoutResult.success) {
                console.error(`Failed to checkout source branch: ${checkoutResult.error}`);
                await cleanupTempDirectory(workspace.workspacePath);
                // Fall back to API
                console.error("CLI error when checking out source branch, falling back to API");
                throw new Error("Failed to checkout source branch");
              }
            }
            
            // Create the new branch
            const result = await runVtCommand(["checkout", "-b", name, "--json"]);
            
            // Clean up the temporary directory
            await cleanupTempDirectory(workspace.workspacePath);
            
            if (result.success) {
              // Parse JSON output
              const parsedOutput = parseCliJsonOutput(result.output);
              if (parsedOutput) {
                return {
                  content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
                };
              }
            }
          }
          
          console.error(`CLI error when creating branch, falling back to API: ${workspace.error || "Unknown error"}`);
          // Fall back to API on error
        } catch (error) {
          console.error("CLI error, falling back to API:", getErrorMessage(error));
          // Fall back to API on error
        }
      }

      // API implementation (original code)
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
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false;
      const cliAvailable = useCliIfAvailable && await getCliAvailability();

      if (cliAvailable) {
        try {
          // The CLI branch -D command requires working in a Val directory
          console.log(`Using CLI to delete branch '${branchId}' from val: ${valId}`);
          
          // Prepare a workspace with the val cloned
          const workspace = await prepareValWorkspace(valId);
          
          if (workspace.success && workspace.workspacePath) {
            // Delete the branch
            const result = await runVtCommand(["branch", "-D", branchId, "--json"]);
            
            // Clean up the temporary directory
            await cleanupTempDirectory(workspace.workspacePath);
            
            if (result.success) {
              return {
                content: [{type: "text", text: `Branch ${branchId} deleted successfully.`}],
              };
            }
          }
          
          console.error(`CLI error when deleting branch, falling back to API: ${workspace.error || "Unknown error"}`);
          // Fall back to API on error
        } catch (error) {
          console.error("CLI error, falling back to API:", getErrorMessage(error));
          // Fall back to API on error
        }
      }

      // API implementation (original code)
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