import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js"
import {registerPromptsTools, registerTools} from "./registerTools.ts"
import {loadConfig} from "./config.ts"

// Load configuration
const config = loadConfig()

// Create server instance
const server = new McpServer({
    name: "val-town",
    version: "1.0.0",
})

// Register tools
registerTools(server, config)
registerPromptsTools(server, config)


// Start the server
const transport = new StdioServerTransport()
await server.connect(transport)
console.error("Val Town MCP Server running on stdio")
