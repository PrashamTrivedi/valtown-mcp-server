/**
 * CLI-specific tools for ValTown enhanced capabilities
 */
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {Config} from "../lib/types.ts";
import {getCliAvailability, runVtCommand} from "../lib/vtCli.ts";
import {getErrorMessage} from "../lib/errorUtils.ts";

export function registerCliTools(server: McpServer, config: Config) {
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
}