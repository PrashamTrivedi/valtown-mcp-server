import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {z} from "zod"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"

export function registerUserTools(server: McpServer, config: Config) {
  // Get user information by username
  server.tool(
    "get-user",
    "Get basic details about a user by username",
    {
      username: z.string().describe("Username of the user to look for (without @ symbol)"),
    },
    async ({username}) => {
      try {
        const data = await callValTownApi(config, `/v1/alias/${encodeURIComponent(username)}`)

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error getting user: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Get current user information (me)
  server.tool(
    "get-my-info",
    "Get profile information for the current authenticated user",
    {},
    async () => {
      try {
        const data = await callValTownApi(config, "/v1/me")

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error getting user info: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )
}