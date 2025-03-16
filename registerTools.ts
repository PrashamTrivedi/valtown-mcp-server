import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "./lib/types.ts"
import {registerUserTools} from "./tools/userTools.ts"
import {registerValTools} from "./tools/valsTools.ts"
import {registerProjectTools} from "./tools/projectTools.ts"
import {registerBranchTools} from "./tools/branchTools.ts"
import {registerFileTools} from "./tools/fileTools.ts"
import {registerSqliteTools} from "./tools/sqliteTools.ts"
import {registerBlobTools} from "./tools/blobTools.ts"

export function registerTools(server: McpServer, config: Config) {
    registerUserTools(server, config)
    registerValTools(server, config)
    registerProjectTools(server, config)
    registerBranchTools(server, config)
    registerFileTools(server, config)
    registerSqliteTools(server, config)
    registerBlobTools(server, config)
}
