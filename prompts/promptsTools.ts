import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js"
import {Config} from "../lib/types.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"


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
const PROMPTS: Record<string, PromptDefinition> = {
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
export function registerPrompts(server: McpServer, config: Config) {


  // List available prompts
  server.server.setRequestHandler(ListPromptsRequestSchema, () => {
    return {
      prompts: Object.values(PROMPTS)
    }
  })

  // Get specific prompt
  server.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name
    const prompt = PROMPTS[promptName]
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptName}`)
    }

    try {
      // Handle Townie prompt (created by the Val Town team)
      if (promptName === "townie") {
        const towniePrompt = Deno.readFileSync(
          new URL("../prompts/townie.txt", import.meta.url)
        )
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `
                ${towniePrompt}
                User Request: ${request.params.arguments?.request}`
              }
            }
          ]
        }
      }

      // Handle OpenTownie prompt (created by Val Town's CEO, Steve Krouse)
      if (promptName === "opentownie") {
        // Get additional user context if available
        const openTowniePrompt = Deno.readFileSync(
          new URL("../prompts/opentownie.txt", import.meta.url),
        )


        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `
                ${openTowniePrompt}
                User Request: ${request.params.arguments?.request}`
              }
            }
          ]
        }
      }

      throw new Error("Prompt implementation not found")
    } catch (error) {
      throw new Error(`Error processing prompt: ${getErrorMessage(error)}`)
    }
  })
}