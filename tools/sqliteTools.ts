import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {z} from "zod"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"

export function registerSqliteTools(server: McpServer, config: Config) {
  // Execute SQL
  server.tool(
    "execute-sql",
    "Execute a SQL query against a SQLite database",
    {
      statement: z.string().describe("SQL statement to execute"),
    },
    async ({statement}) => {
      try {
        const data = await callValTownApi(config, "/v1/sqlite/execute", {
          method: "POST",
          body: JSON.stringify({statement}),
        })

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error executing SQL: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Execute SQL batch
  server.tool(
    "execute-sql-batch",
    "Execute multiple SQL statements against a SQLite database",
    {
      statements: z.array(z.string()).describe("Array of SQL statements to execute"),
      mode: z.enum(["read", "write"]).default("read").describe("Mode of the statements (read or write)"),
    },
    async ({statements, mode}) => {
      try {
        const data = await callValTownApi(config, "/v1/sqlite/batch", {
          method: "POST",
          body: JSON.stringify({statements, mode}),
        })

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error executing SQL batch: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )
}