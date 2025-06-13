import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "../lib/types.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"
import {z} from "zod"
import {getCliAvailability} from "../lib/vtCli.ts"



// Register prompt capabilities with server
export function registerPrompts(server: McpServer, _config: Config) {
  // Townie prompt 
  server.prompt(
    "valley",
    {request: z.string()},
    async ({request}) => {
      try {
        const promptPath = _config.prompts?.valleyPath || _config.prompts?.defaultValleyPath
        const useCliIfAvailable = _config.cli?.preferCli ?? false
        const cliAvailable = useCliIfAvailable && await getCliAvailability()
        const defaultPromptPath = `${import.meta.dirname}/prompts/${cliAvailable ? "valley.txt" : "valley_local.txt"}`
        const promptContent = Deno.readTextFileSync(promptPath ?? defaultPromptPath).trim() // Moved .trim() to the same line

        console.error({promptContent})
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `${promptContent.trim()}\n\n<UserRequest> ${request} </UserRequest>`
              }
            }
          ]
        }
      } catch (error) {
        throw new Error(`Error processing prompt: ${getErrorMessage(error)}`)
      }
    }
  )


}