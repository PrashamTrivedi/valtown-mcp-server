import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {Config} from "../lib/types.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"
import {z} from "zod"

// Define prompt structure type
type PromptDefinition = {
  name: string
  description: string
  arguments: {
    name: string
    description: string
    required: boolean
  }[]
}



// Register prompt capabilities with server
export function registerPrompts(server: McpServer, _config: Config) {
  // Townie prompt 
  server.prompt(
    "townie",
    {request: z.string()},
    ({request}) => {
      try {
        const towniePrompt = Deno.readTextFileSync(`${import.meta.dirname}/townie.txt`
        ).trim()
        console.error({towniePrompt})
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `
                ${towniePrompt}\n\n
                User Request: ${request}`
              }
            }
          ]
        }
      } catch (error) {
        throw new Error(`Error processing prompt: ${getErrorMessage(error)}`)
      }
    }
  )

  // OpenTownie prompt
  server.prompt(
    "opentownie",
    {request: z.string()},
    ({request}) => {
      try {

        const openTowniePrompt = Deno.readTextFileSync(`${import.meta.dirname}/opentownie.txt`
        ).trim()
        console.error({openTowniePrompt})



        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `
                ${openTowniePrompt}\n\n
                User Request: ${request}`
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