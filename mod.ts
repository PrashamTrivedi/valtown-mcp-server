import {McpServer} from "@modelcontextprotocol/sdk/mcp.js"
import {StdioServerTransport} from "@modelcontextprotocol/sdk/stdio.js"
import {registerTools} from "./registerTools.ts"
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

// Start the server
const transport = new StdioServerTransport()
await server.connect(transport)
console.error("Val Town MCP Server running on stdio")
