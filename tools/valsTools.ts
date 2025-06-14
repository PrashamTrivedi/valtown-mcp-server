import {McpServer} from "npm:@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"
import {getCliAvailability, runVtCommand, parseCliJsonOutput} from "../lib/vtCli.ts"
import {z} from "npm:zod"

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
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false;
      const cliAvailable = useCliIfAvailable && await getCliAvailability();
      const valReference = `${username}/${valName}`;

      if (cliAvailable) {
        try {
          // Use CLI implementation with the clone command and --json flag
          console.log(`Using CLI to get val: ${valReference}`);
          const result = await runVtCommand(["clone", valReference, "--json"]);
          
          if (result.success) {
            // Parse JSON output
            const parsedOutput = parseCliJsonOutput(result.output);
            if (parsedOutput) {
              return {
                content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
              };
            }
          }
          
          console.error(`CLI error when getting val, falling back to API: ${result.error}`);
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
          `/v2/alias/vals/${encodeURIComponent(username)}/${encodeURIComponent(valName)}`
        );
        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        };
      } catch (error) {
        console.error(error);
        return {
          content: [{type: "text", text: `Error getting val: ${getErrorMessage(error)}`}],
          isError: true,
        };
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
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false;
      const cliAvailable = useCliIfAvailable && await getCliAvailability(config.cli?.path);

      if (cliAvailable) {
        try {
          // Use CLI implementation with the create command and --json flag
          console.log(`Using CLI to create val: ${name}`);
          // Build CLI arguments
          const cliArgs = ["create", name, "--json"];
          
          // Add privacy option if not public (public is default)
          if (privacy !== "public") {
            cliArgs.push("--privacy", privacy);
          }
          
          // Add description if provided
          if (description) {
            cliArgs.push("--description", description);
          }
          
          const result = await runVtCommand(cliArgs);
          
          if (result.success) {
            // Parse JSON output
            const parsedOutput = parseCliJsonOutput(result.output);
            if (parsedOutput) {
              return {
                content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
              };
            }
          }
          
          console.error(`CLI error when creating val, falling back to API: ${result.error}`);
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
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false;
      const cliAvailable = useCliIfAvailable && await getCliAvailability(config.cli?.path);

      if (cliAvailable) {
        try {
          // The CLI delete command requires working in a Val directory, 
          // so we need to clone first, then delete
          console.log(`Using CLI to delete val: ${valId}`);
          
          // Use prepareValWorkspace first (would need to implement special workspace setup)
          // For now, we'll use the API implementation instead of complex workspace management
          
          // This could be implemented with temporary directory setup if needed, 
          // but for now we'll use the API for deletion as it's simpler
          console.log("Deletion via CLI requires workspace setup, using API instead");
        } catch (error) {
          console.error("CLI error, falling back to API:", getErrorMessage(error));
          // Fall back to API on error
        }
      }

      // API implementation (original code)
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
      // Check for CLI preference
      const useCliIfAvailable = config.cli?.preferCli ?? false;
      const cliAvailable = useCliIfAvailable && await getCliAvailability(config.cli?.path);

      if (cliAvailable) {
        try {
          // Use CLI implementation with the list command and --json flag
          console.log(`Using CLI to list vals`);
          
          const cliArgs = ["list", "--json"];
          // Note: the CLI may not support limit and offset params
          // We could add support for --limit and --offset if the CLI adds these options
          
          const result = await runVtCommand(cliArgs, {
            suppressErrors: true,
            cliPath: config.cli?.path
          });
          
          if (result.success) {
            // Parse JSON output
            const parsedOutput = parseCliJsonOutput(result.output);
            if (parsedOutput) {
              // Apply limit and offset manually if needed
              // This is a workaround since the CLI might not support pagination
              return {
                content: [{type: "text", text: JSON.stringify(parsedOutput, null, 2)}],
              };
            }
          }
          
          console.error(`CLI error when listing vals, falling back to API: ${result.error}`);
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