import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {z} from "zod"
import {Config} from "../lib/types.ts"
import {callValTownApi} from "../lib/api.ts"
import {getErrorMessage} from "../lib/errorUtils.ts"

export function registerBlobTools(server: McpServer, config: Config) {
  // List blobs
  server.tool(
    "list-blobs",
    "List blobs accessible to the current user",
    {
      prefix: z.string().optional().describe("If specified, only include blobs that start with this string"),
    },
    async ({prefix}) => {
      try {
        const queryParams = prefix ? `?prefix=${encodeURIComponent(prefix)}` : ""
        const data = await callValTownApi(config, `/v1/blob${queryParams}`)

        return {
          content: [{type: "text", text: JSON.stringify(data, null, 2)}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error listing blobs: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Get a blob
  server.tool(
    "get-blob",
    "Get a blob by ID",
    {
      key: z.string().min(1).max(512).describe("Key that uniquely identifies this blob"),
    },
    async ({key}) => {
      try {
        // For blobs, we need to handle binary data differently
        const url = `${config.apiBase}/v1/blob/${encodeURIComponent(key)}`
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${config.apiToken}`,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`)
        }

        const contentType = response.headers.get("content-type") || "application/octet-stream"

        // Convert to base64 or text depending on the content type
        let content
        if (contentType.startsWith("text/") || contentType === "application/json") {
          content = await response.text()
        } else {
          const buffer = await response.arrayBuffer()
          content = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        }

        return {
          content: [{
            type: "text",
            text: `Content-Type: ${contentType}\n\n${content}`
          }],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error getting blob: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Store a blob
  server.tool(
    "store-blob",
    "Store a new blob",
    {
      key: z.string().min(1).max(512).describe("Key that uniquely identifies this blob"),
      data: z.string().describe("Content to store (text or base64-encoded binary)"),
      isBase64: z.boolean().default(false).describe("Whether the data is base64-encoded binary"),
      contentType: z.string().default("text/plain").describe("Content type of the blob"),
    },
    async ({key, data, isBase64, contentType}) => {
      try {
        // Convert from base64 if needed
        let bodyData = data
        if (isBase64) {
          // For base64, we need to decode it to binary
          const binary = atob(data)
          const array = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i)
          }
          bodyData = new TextDecoder().decode(array)
        }

        const url = `${config.apiBase}/v1/blob/${encodeURIComponent(key)}`
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.apiToken}`,
            "Content-Type": contentType,
          },
          body: bodyData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`)
        }

        return {
          content: [{type: "text", text: "Blob stored successfully"}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error storing blob: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )

  // Delete a blob
  server.tool(
    "delete-blob",
    "Delete a blob by ID",
    {
      key: z.string().min(1).max(512).describe("Key that uniquely identifies this blob"),
    },
    async ({key}) => {
      try {
        await callValTownApi(config, `/v1/blob/${encodeURIComponent(key)}`, {
          method: "DELETE",
        })

        return {
          content: [{type: "text", text: "Blob deleted successfully"}],
        }
      } catch (error) {
        return {
          content: [{type: "text", text: `Error deleting blob: ${getErrorMessage(error)}`}],
          isError: true,
        }
      }
    }
  )
}