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

// Define prompt templates
const _PROMPTS: Record<string, PromptDefinition> = {
  "townie": {
    name: "townie",
    description: "A simple prompt for basic Val Town operations",
    arguments: [
      {
        name: "request",
        description: "User's request to execute",
        required: true
      }
    ]
  },
  "opentownie": {
    name: "opentownie",
    description: "A comprehensive prompt for advanced Val Town workflows",
    arguments: [
      {
        name: "request",
        description: "User's request to execute",
        required: true
      },
    ]
  }
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
        )
        console.error({towniePrompt})
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `
                ${towniePrompt}
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
        )
        console.error({openTowniePrompt})



        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `
                ${openTowniePrompt}
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