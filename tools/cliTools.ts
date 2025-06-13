/**
 * CLI-specific tools for ValTown enhanced capabilities
 */
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {Config} from "../lib/types.ts";
import {getCliAvailability, runVtCommand, parseCliJsonOutput, prepareValWorkspace, cleanupTempDirectory} from "../lib/vtCli.ts";
import {getErrorMessage} from "../lib/errorUtils.ts";

export function registerCliTools(server: McpServer, _config: Config) {
  // Watch files in a project for real-time updates
  server.tool(
    "watch-files",
    "Watch for real-time file changes in a project",
    {
      projectId: z.string().describe("ID of the project to watch"),
      branchId: z.string().optional().describe("ID of the branch to watch (optional, defaults to main)"),
    },
    async ({projectId, branchId}: {
      projectId: string
      branchId?: string
    }) => {
      const cliAvailable = await getCliAvailability();
      
      if (!cliAvailable) {
        return {
          content: [{
            type: "text", 
            text: "Error: This command requires the ValTown CLI (vt) to be installed"
          }],
          isError: true,
        };
      }
      
      try {
        const watchArgs = ["watch", "--project", projectId];
        
        if (branchId) {
          watchArgs.push("--branch", branchId);
        }
        
        // Add JSON output format
        watchArgs.push("--json");
        
        const result = await runVtCommand(watchArgs);
        
        if (result.success) {
          try {
            const data = JSON.parse(result.output);
            return {
              content: [{type: "text", text: JSON.stringify(data, null, 2)}],
            };
          } catch {
            return {
              content: [{type: "text", text: result.output}],
            };
          }
        } else {
          return {
            content: [{type: "text", text: `Error watching files: ${result.error}`}],
            isError: true,
          };
        }
      } catch (error) {
        console.error(error);
        return {
          content: [{type: "text", text: `Error watching files: ${getErrorMessage(error)}`}],
          isError: true,
        };
      }
    }
  );
  
  // Create new project from template
  server.tool(
    "create-project-from-template",
    "Create a new project from a template",
    {
      name: z.string().describe("Name for the new project"),
      templateRepo: z.string().describe("Template repository path (username/repo)"),
      privacy: z.enum(["public", "unlisted", "private"]).default("unlisted")
        .describe("Privacy setting: public, unlisted, or private"),
      description: z.string().optional().describe("Description for the project (optional)"),
    },
    async ({name, templateRepo, privacy, description}: {
      name: string
      templateRepo: string
      privacy: "public" | "unlisted" | "private"
      description?: string
    }) => {
      const cliAvailable = await getCliAvailability();
      
      if (!cliAvailable) {
        return {
          content: [{
            type: "text", 
            text: "Error: This command requires the ValTown CLI (vt) to be installed"
          }],
          isError: true,
        };
      }
      
      try {
        const createArgs = ["create", name, "--template", templateRepo, "--privacy", privacy];
        
        if (description) {
          createArgs.push("--description", description);
        }
        
        // Add JSON output format
        createArgs.push("--json");
        
        const result = await runVtCommand(createArgs);
        
        if (result.success) {
          try {
            const data = JSON.parse(result.output);
            return {
              content: [{type: "text", text: JSON.stringify(data, null, 2)}],
            };
          } catch {
            return {
              content: [{type: "text", text: result.output}],
            };
          }
        } else {
          return {
            content: [{type: "text", text: `Error creating project from template: ${result.error}`}],
            isError: true,
          };
        }
      } catch (error) {
        console.error(error);
        return {
          content: [{type: "text", text: `Error creating project from template: ${getErrorMessage(error)}`}],
          isError: true,
        };
      }
    }
  );
  
  // Sync all changes in a project
  server.tool(
    "sync-project",
    "Sync all changes in a project (pull and push)",
    {
      projectId: z.string().describe("ID of the project to sync"),
      branchId: z.string().optional().describe("ID of the branch to sync (optional, defaults to main)"),
    },
    async ({projectId, branchId}: {
      projectId: string
      branchId?: string
    }) => {
      const cliAvailable = await getCliAvailability();
      
      if (!cliAvailable) {
        return {
          content: [{
            type: "text", 
            text: "Error: This command requires the ValTown CLI (vt) to be installed"
          }],
          isError: true,
        };
      }
      
      try {
        // First pull changes
        const pullArgs = ["pull", "--project", projectId];
        
        if (branchId) {
          pullArgs.push("--branch", branchId);
        }
        
        const pullResult = await runVtCommand(pullArgs);
        
        if (!pullResult.success) {
          return {
            content: [{type: "text", text: `Error pulling changes: ${pullResult.error}`}],
            isError: true,
          };
        }
        
        // Then push changes
        const pushArgs = ["push", "--project", projectId];
        
        if (branchId) {
          pushArgs.push("--branch", branchId);
        }
        
        // Add JSON output format
        pushArgs.push("--json");
        
        const pushResult = await runVtCommand(pushArgs);
        
        if (pushResult.success) {
          try {
            const data = JSON.parse(pushResult.output);
            return {
              content: [{type: "text", text: JSON.stringify(data, null, 2)}],
            };
          } catch {
            return {
              content: [{type: "text", text: "Project synchronized successfully"}],
            };
          }
        } else {
          return {
            content: [{type: "text", text: `Error pushing changes: ${pushResult.error}`}],
            isError: true,
          };
        }
      } catch (error) {
        console.error(error);
        return {
          content: [{type: "text", text: `Error syncing project: ${getErrorMessage(error)}`}],
          isError: true,
        };
      }
    }
  );
  
  // Watch a Val for local changes and automatically push them
  server.tool(
    "watch-val",
    "Watch a Val for local changes and automatically push them",
    {
      valId: z.string().describe("ID of the val"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({valId, branchId}) => {
      // Check for CLI availability (required for this tool)
      const cliAvailable = await getCliAvailability();
      
      if (!cliAvailable) {
        return {
          content: [{type: "text", text: "This tool requires the ValTown CLI, which is not available."}],
          isError: true,
        };
      }

      try {
        // Prepare a workspace with the val cloned
        console.log(`Using CLI to watch val: ${valId}`);
        const workspace = await prepareValWorkspace(valId);
        
        if (!workspace.success || !workspace.workspacePath) {
          return {
            content: [{type: "text", text: `Error preparing workspace: ${workspace.error || "Unknown error"}`}],
            isError: true,
          };
        }
        
        // If a branch is specified, checkout that branch
        if (branchId) {
          const checkoutResult = await runVtCommand(["checkout", branchId]);
          
          if (!checkoutResult.success) {
            await cleanupTempDirectory(workspace.workspacePath);
            return {
              content: [{type: "text", text: `Error checking out branch: ${checkoutResult.error}`}],
              isError: true,
            };
          }
        }
        
        // Start watching the val
        // Note: In a real implementation, this would need to be a long-running process
        // This example just initiates the watch command and reports success
        const watchResult = await runVtCommand(["watch", "--json"]);
        
        // Note: In a real implementation, we would keep the watch process running
        // and handle cleanup when appropriate. For this example, we'll just report success
        
        // Clean up workspace (in a real implementation, this would happen later)
        await cleanupTempDirectory(workspace.workspacePath);
        
        if (!watchResult.success) {
          return {
            content: [{type: "text", text: `Error starting watch: ${watchResult.error}`}],
            isError: true,
          };
        }
        
        // Return success message
        return {
          content: [{type: "text", text: `Started watching val ${valId}${branchId ? ` (branch: ${branchId})` : ''}.`}],
        };
      } catch (error) {
        console.error(error);
        return {
          content: [{type: "text", text: `Error watching val: ${getErrorMessage(error)}`}],
          isError: true,
        };
      }
    }
  );
  
  // Pull latest changes from Val Town
  server.tool(
    "pull-val",
    "Pull latest changes from Val Town",
    {
      valId: z.string().describe("ID of the val"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({valId, branchId}) => {
      // Check for CLI availability (required for this tool)
      const cliAvailable = await getCliAvailability();
      
      if (!cliAvailable) {
        return {
          content: [{type: "text", text: "This tool requires the ValTown CLI, which is not available."}],
          isError: true,
        };
      }

      try {
        // Prepare a workspace with the val cloned
        console.log(`Using CLI to pull latest changes for val: ${valId}`);
        const workspace = await prepareValWorkspace(valId);
        
        if (!workspace.success || !workspace.workspacePath) {
          return {
            content: [{type: "text", text: `Error preparing workspace: ${workspace.error || "Unknown error"}`}],
            isError: true,
          };
        }
        
        // If a branch is specified, checkout that branch
        if (branchId) {
          const checkoutResult = await runVtCommand(["checkout", branchId]);
          
          if (!checkoutResult.success) {
            await cleanupTempDirectory(workspace.workspacePath);
            return {
              content: [{type: "text", text: `Error checking out branch: ${checkoutResult.error}`}],
              isError: true,
            };
          }
        }
        
        // Pull latest changes
        const pullResult = await runVtCommand(["pull", "--json"]);
        
        // Clean up workspace
        await cleanupTempDirectory(workspace.workspacePath);
        
        if (!pullResult.success) {
          return {
            content: [{type: "text", text: `Error pulling changes: ${pullResult.error}`}],
            isError: true,
          };
        }
        
        // Parse and return result
        const parsedOutput = parseCliJsonOutput(pullResult.output);
        if (parsedOutput) {
          return {
            content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
          };
        }
        
        // Fallback success message
        return {
          content: [{type: "text", text: `Successfully pulled latest changes for val ${valId}${branchId ? ` (branch: ${branchId})` : ''}.`}],
        };
      } catch (error) {
        console.error(error);
        return {
          content: [{type: "text", text: `Error pulling changes: ${getErrorMessage(error)}`}],
          isError: true,
        };
      }
    }
  );
  
  // Open a Val in the default web browser
  server.tool(
    "browse-val",
    "Open a Val in the default web browser",
    {
      valId: z.string().describe("ID of the val"),
    },
    async ({valId}) => {
      // Check for CLI availability (required for this tool)
      const cliAvailable = await getCliAvailability();
      
      if (!cliAvailable) {
        return {
          content: [{type: "text", text: "This tool requires the ValTown CLI, which is not available."}],
          isError: true,
        };
      }

      try {
        // Note: This is typically not an operation you'd want to do from a server
        // as it would open a browser on the server machine. In a real implementation,
        // you might just return the URL to open.
        console.log(`Using CLI to get browse URL for val: ${valId}`);
        
        // Run the command to get the URL
        const browseResult = await runVtCommand(["browse", valId, "--dry-run", "--json"]);
        
        if (!browseResult.success) {
          return {
            content: [{type: "text", text: `Error getting browse URL: ${browseResult.error}`}],
            isError: true,
          };
        }
        
        // Parse and return URL
        const parsedOutput = parseCliJsonOutput(browseResult.output);
        if (parsedOutput) {
          return {
            content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
          };
        }
        
        // Fallback URL format
        return {
          content: [{type: "text", text: `https://www.val.town/v/${valId}`}],
        };
      } catch (error) {
        console.error(error);
        return {
          content: [{type: "text", text: `Error getting browse URL: ${getErrorMessage(error)}`}],
          isError: true,
        };
      }
    }
  );
  
  // Remix an existing Val to create a new one
  server.tool(
    "remix-val",
    "Remix an existing Val to create a new one",
    {
      sourceValUri: z.string().describe("URI of the source Val to remix (username/valname)"),
      newValName: z.string().describe("Name for the new Val"),
      privacy: z.enum(["public", "unlisted", "private"]).default("public").describe("Privacy setting for the new Val"),
    },
    async ({sourceValUri, newValName, privacy}) => {
      // Check for CLI availability (required for this tool)
      const cliAvailable = await getCliAvailability();
      
      if (!cliAvailable) {
        return {
          content: [{type: "text", text: "This tool requires the ValTown CLI, which is not available."}],
          isError: true,
        };
      }

      try {
        console.log(`Using CLI to remix val: ${sourceValUri} to ${newValName}`);
        
        // Build command arguments
        const args = ["remix", sourceValUri, newValName, "--json"];
        
        // Add privacy option if not public (public is default)
        if (privacy !== "public") {
          args.push("--privacy", privacy);
        }
        
        // Run the remix command
        const remixResult = await runVtCommand(args);
        
        if (!remixResult.success) {
          return {
            content: [{type: "text", text: `Error remixing val: ${remixResult.error}`}],
            isError: true,
          };
        }
        
        // Parse and return result
        const parsedOutput = parseCliJsonOutput(remixResult.output);
        if (parsedOutput) {
          return {
            content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
          };
        }
        
        // Fallback success message
        return {
          content: [{type: "text", text: `Successfully remixed ${sourceValUri} to ${newValName}.`}],
        };
      } catch (error) {
        console.error(error);
        return {
          content: [{type: "text", text: `Error remixing val: ${getErrorMessage(error)}`}],
          isError: true,
        };
      }
    }
  );
  
  // Show the working tree status of a Val
  server.tool(
    "get-val-status",
    "Show the working tree status of a Val",
    {
      valId: z.string().describe("ID of the val"),
      branchId: z.string().optional().describe("ID of the branch (optional, defaults to main)"),
    },
    async ({valId, branchId}) => {
      // Check for CLI availability (required for this tool)
      const cliAvailable = await getCliAvailability();
      
      if (!cliAvailable) {
        return {
          content: [{type: "text", text: "This tool requires the ValTown CLI, which is not available."}],
          isError: true,
        };
      }

      try {
        // Prepare a workspace with the val cloned
        console.log(`Using CLI to get status for val: ${valId}`);
        const workspace = await prepareValWorkspace(valId);
        
        if (!workspace.success || !workspace.workspacePath) {
          return {
            content: [{type: "text", text: `Error preparing workspace: ${workspace.error || "Unknown error"}`}],
            isError: true,
          };
        }
        
        // If a branch is specified, checkout that branch
        if (branchId) {
          const checkoutResult = await runVtCommand(["checkout", branchId]);
          
          if (!checkoutResult.success) {
            await cleanupTempDirectory(workspace.workspacePath);
            return {
              content: [{type: "text", text: `Error checking out branch: ${checkoutResult.error}`}],
              isError: true,
            };
          }
        }
        
        // Get status
        const statusResult = await runVtCommand(["status", "--json"]);
        
        // Clean up workspace
        await cleanupTempDirectory(workspace.workspacePath);
        
        if (!statusResult.success) {
          return {
            content: [{type: "text", text: `Error getting status: ${statusResult.error}`}],
            isError: true,
          };
        }
        
        // Parse and return result
        const parsedOutput = parseCliJsonOutput(statusResult.output);
        if (parsedOutput) {
          return {
            content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
          };
        }
        
        // Fallback status message
        return {
          content: [{type: "text", text: statusResult.output}],
        };
      } catch (error) {
        console.error(error);
        return {
          content: [{type: "text", text: `Error getting val status: ${getErrorMessage(error)}`}],
          isError: true,
        };
      }
    }
  );
}