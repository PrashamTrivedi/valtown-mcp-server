// registerTools.ts
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "./lib/types.ts"
import {registerUserTools} from "./tools/userTools.ts"
import {registerValTools} from "./tools/valsTools.ts"
import {registerBranchTools} from "./tools/branchTools.ts"
import {registerFileTools} from "./tools/fileTools.ts"
import {registerSqliteTools} from "./tools/sqliteTools.ts"
import {registerBlobTools} from "./tools/blobTools.ts"
import {registerPrompts} from "./prompts/promptsTools.ts"

export async function registerTools(server: McpServer, config: Config) {
    registerUserTools(server, config)
    registerValTools(server, config)  // Now handles vals (formerly projects)
    registerBranchTools(server, config)
    registerFileTools(server, config)
    registerSqliteTools(server, config)
    registerBlobTools(server, config)
}

export function registerPromptsTools(server: McpServer, config: Config) {
    registerPrompts(server, config)
}