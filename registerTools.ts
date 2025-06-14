// registerTools.ts
import {McpServer} from "npm:@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "./lib/types.ts"
import {registerUserTools} from "./tools/userTools.ts"
import {registerValTools} from "./tools/valsTools.ts"
import {registerBranchTools} from "./tools/branchTools.ts"
import {registerFileTools} from "./tools/fileTools.ts"
import {registerSqliteTools} from "./tools/sqliteTools.ts"
import {registerBlobTools} from "./tools/blobTools.ts"
import {registerCliTools} from "./tools/cliTools.ts"
import {registerPrompts} from "./prompts/promptsTools.ts"

export function registerTools(
  server: McpServer,
  config: Config,
  options?: { excludeCli?: boolean },
) {
  registerUserTools(server, config);
  registerValTools(server, config); // Now handles vals (formerly projects)
  registerBranchTools(server, config);
  registerFileTools(server, config);
  registerSqliteTools(server, config);
  registerBlobTools(server, config);

  // Conditionally register CLI tools
  if (!options?.excludeCli) {
    registerCliTools(server, config); // Register CLI-specific tools
  }
}

export function registerPromptsTools(server: McpServer, config: Config) {
    registerPrompts(server, config)
}