import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "./lib/types.ts"
import {registerUserTools} from "./tools/userTools.ts"
import {registerValTools} from "./tools/valsTools.ts"
import {registerProjectTools} from "./tools/projectTools.ts"
import {registerBranchTools} from "./tools/branchTools.ts"
import {registerFileTools} from "./tools/fileTools.ts"
import {registerSqliteTools} from "./tools/sqliteTools.ts"
import {registerBlobTools} from "./tools/blobTools.ts"
import {registerCliTools} from "./tools/cliTools.ts"
import {registerPrompts} from "./prompts/promptsTools.ts"
import {getCliAvailability} from "./lib/vtCli.ts"

export async function registerTools(server: McpServer, config: Config) {
    registerUserTools(server, config)
    registerValTools(server, config)
    registerProjectTools(server, config)
    registerBranchTools(server, config)
    registerFileTools(server, config)
    registerSqliteTools(server, config)
    registerBlobTools(server, config)
    
    // Register CLI-specific tools if CLI is available
    const cliAvailable = await getCliAvailability();
    if (cliAvailable) {
        registerCliTools(server, config)
    }
}

export function registerPromptsTools(server: McpServer, config: Config) {
    registerPrompts(server, config)
}
