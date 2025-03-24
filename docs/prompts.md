# ValTown MCP Server Prompt Templates

This guide explains how to create and use the ValTown MCP Server prompt templates. We currently provide two prompt templates with different capabilities:

1. **Townie** - A simple, lightweight prompt for basic Val Town operations
2. **OpenTownie** - A comprehensive prompt for advanced Val Town workflows

## Understanding MCP Prompts

MCP prompts are reusable templates that:
- Accept dynamic arguments
- Can include context from resources
- Guide specific workflows
- Surface as UI elements (like slash commands)

## Implementation Overview

The following example demonstrates how to implement both Townie and OpenTownie prompts in the ValTown MCP Server:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/mcp.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types";
import { Config } from "./lib/types.ts";
import { callValTownApi } from "./lib/api.ts";
import { getErrorMessage } from "./lib/errorUtils.ts";

// Define prompt templates
const PROMPTS = {
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
      {
        name: "context",
        description: "Additional context for the request",
        required: false
      },
      {
        name: "verbose",
        description: "Whether to provide detailed responses",
        required: false
      }
    ]
  }
};

// Register prompt capabilities with server
export function registerPrompts(server: McpServer, config: Config) {
  // Enable prompts capability
  server.capabilities.prompts = {};

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: Object.values(PROMPTS)
    };
  });

  // Get specific prompt
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const prompt = PROMPTS[request.params.name];
    if (!prompt) {
      throw new Error(`Prompt not found: ${request.params.name}`);
    }

    try {
      // Handle Townie prompt (created by the Val Town team)
      if (request.params.name === "townie") {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `I'm Townie, a simple assistant for Val Town. I can help with basic operations.\n\n` +
                      `User Request: ${request.params.arguments?.request}\n\n` +
                      `Please handle this request efficiently and provide a clear response.`
              }
            }
          ]
        };
      }

      // Handle OpenTownie prompt (created by Val Town's CEO, Steve Krouse)
      if (request.params.name === "opentownie") {
        // Get additional user context if available
        const userData = await callValTownApi(config, "/v1/me");
        const verbose = request.params.arguments?.verbose === "true";
        const context = request.params.arguments?.context || "";
        
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `I'm OpenTownie, a comprehensive assistant for Val Town created by CEO Steve Krouse.\n\n` +
                      `User Request: ${request.params.arguments?.request}\n\n` +
                      (context ? `Additional Context: ${context}\n\n` : '') +
                      `User Profile: ${JSON.stringify(userData)}\n\n` +
                      `Please provide ${verbose ? "detailed" : "concise"} assistance with this request.`
              }
            }
          ]
        };
      }

      throw new Error("Prompt implementation not found");
    } catch (error) {
      throw new Error(`Error processing prompt: ${getErrorMessage(error)}`);
    }
  });
}
```

## Townie Prompt

*Created by the Val Town team*

Townie is a lightweight prompt template designed for quick, simple interactions with Val Town. It's perfect for users who need basic functionality without complexity.

### Typical Use Cases

- Creating simple vals
- Basic searching
- Quick information retrieval

## OpenTownie Prompt

*Created by Val Town's CEO, Steve Krouse*

OpenTownie is a comprehensive prompt template designed for advanced workflows and complex operations within Val Town. It provides powerful capabilities for users who need deeper integration.

### Typical Use Cases

- Building complex project structures
- Advanced code generation
- Multi-step workflows
- Cross-val interactions
- Performance optimization recommendations

## Best Practices

When implementing and using these prompts:

1. **Choose the right prompt**:
   - Use Townie for quick, simple tasks
   - Use OpenTownie for complex workflows or when you need more context

2. **Provide clear requests**:
   - Be specific about what you want to accomplish
   - For OpenTownie, utilize the context parameter for additional information

3. **Error handling**:
   - Both prompts include error handling
   - Validate all user inputs
   - Use try/catch blocks and the getErrorMessage utility

4. **Performance considerations**:
   - Townie is more lightweight and better for quick operations
   - OpenTownie provides more capabilities but may use more resources

## Integration Steps

To integrate these prompts into the ValTown MCP Server:

1. Create a new file at `prompts/promptsTools.ts`
2. Implement the `registerPrompts` function as shown above
3. Update `registerTools.ts` to include the prompts registration:

```typescript
import {registerPrompts} from "./prompts/promptsTools.ts"

export function registerTools(server: McpServer, config: Config) {
  // Existing registrations
  registerUserTools(server, config)
  registerValTools(server, config)
  registerProjectTools(server, config)
  registerBranchTools(server, config)
  registerFileTools(server, config)
  registerSqliteTools(server, config)
  registerBlobTools(server, config)
  
  // Register prompts
  registerPrompts(server, config)
}
```

## Credits

- **Townie**: Created by the Val Town team
- **OpenTownie**: Created by Val Town's CEO, Steve Krouse

## Further Resources

- [MCP Protocol Documentation](https://modelcontextprotocol.io/docs/concepts/prompts)
- [Val Town API Reference](https://docs.val.town/api)