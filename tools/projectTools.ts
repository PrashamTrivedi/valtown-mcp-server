import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {z} from "zod"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"

export function registerProjectTools(server: McpServer, config: Config) {
  // List all projects
  server.tool(
    "list-projects",
    "List all projects accessible to the current user",
    {
      limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of results to return"),
      offset: z.number().int().min(0).default(0).describe("Number of items to skip for pagination"),
    },
    async ({limit, offset}: {limit: number; offset: number}) => {
      try {
        const data = await callValTownApi(
          config,
          `/v1/me/projects?limit=${limit}&offset=${offset}`
        )

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error listing projects: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )

  // Get a specific project
  server.tool(
    "get-project",
    "Get details about a specific project",
    {
      projectId: z.string().describe("ID of the project"),
    },
    async ({projectId}: {projectId: string}) => {
      try {
        const data = await callValTownApi(config, `/v1/projects/${projectId}`)

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error getting project: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )

  // Get a project by username and project name
  server.tool(
    "get-project-by-name",
    "Get a project by username and project name",
    {
      username: z.string().describe("Username of the project's owner"),
      projectName: z.string().describe("Name of the project"),
    },
    async ({username, projectName}: {username: string; projectName: string}) => {
      try {
        const data = await callValTownApi(
          config,
          `/v1/alias/projects/${encodeURIComponent(username)}/${encodeURIComponent(projectName)}`
        )

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error getting project: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )

  // Create a new project
  server.tool(
    "create-project",
    "Create a new project",
    {
      name: z.string()
        .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Project name must start with a letter and can only contain letters, numbers, and underscores")
        .describe("Name for the project"),
      privacy: z.enum(["public", "unlisted", "private"]).default("public")
        .describe("Privacy setting: public, unlisted, or private"),
      description: z.string().max(64).optional()
        .describe("Description for the project (optional, max 64 characters)"),
      imageUrl: z.string().optional().describe("URL to an image for the project (optional)"),
    },
    async ({name, privacy, description, imageUrl}: {
      name: string
      privacy: "public" | "unlisted" | "private"
      description?: string
      imageUrl?: string
    }) => {
      try {
        // Validate project name
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
          return {
            content: [{
              type: "text",
              text: "Error: Project name must start with a letter and can only contain letters, numbers, and underscores"
            }],
            isError: true,
          }
        }

        // Validate description length
        if (description && description.length > 64) {
          return {
            content: [{
              type: "text",
              text: "Error: Description must be 64 characters or less"
            }],
            isError: true,
          }
        }

        const payload = {
          name,
          privacy,
          ...(description ? {description} : {}),
          ...(imageUrl ? {imageUrl} : {}),
        }

        const data = await callValTownApi(config, "/v1/projects", {
          method: "POST",
          body: JSON.stringify(payload),
        })

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error creating project: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )

  // Delete a project
  server.tool(
    "delete-project",
    "Delete a project by ID",
    {
      projectId: z.string().describe("ID of the project to delete"),
    },
    async ({projectId}: {projectId: string}) => {
      try {
        await callValTownApi(config, `/v1/projects/${projectId}`, {
          method: "DELETE",
        })

        return {
          content: [{type: "text", text: "Project deleted successfully"}],
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [{type: "text", text: `Error deleting project: ${errorMessage}`}],
          isError: true,
        }
      }
    }
  )
}