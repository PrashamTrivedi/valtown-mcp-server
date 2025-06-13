# Remote HTTP Streamable MCP Server for ValTown - Task Analysis

## Task Summary

Convert the existing ValTown MCP Server from STDIO transport to a **Remote HTTP
Streamable MCP Server** that can be hosted on ValTown itself. This involves
creating a separate HTTP entry point that excludes CLI-dependent functionality
while reusing existing tools and configuration.

## Revised Architecture Strategy

### **Single Codebase, Dual Entry Points**

- **Keep** `mod.ts` as STDIO entry point (unchanged)
- **Add** `index.ts` as HTTP entry point for ValTown deployment
- **Modify** `registerTools()` to accept `excludeCli` flag
- **Update** config for remote authentication via headers
- **Deploy** current directory as ValTown project with `.vt/` and `.vtignore`

### Current Tool Categories

1. **User Tools** (`userTools.ts`) - User profile operations ✅
2. **Vals Tools** (`valsTools.ts`) - Val/project management ✅
3. **Branch Tools** (`branchTools.ts`) - Git branch operations ✅
4. **File Tools** (`fileTools.ts`) - File CRUD operations ✅
5. **SQLite Tools** (`sqliteTools.ts`) - Database operations ✅
6. **Blob Tools** (`blobTools.ts`) - Blob storage operations ✅
7. **CLI Tools** (`cliTools.ts`) - **Exclude for remote** ❌
8. **Prompts** (`promptsTools.ts`) - Valley coding assistant prompt ✅

### CLI Dependencies to Exclude

Tools in `cliTools.ts` that require local ValTown CLI and won't work remotely:

- `watch-files` - Real-time file watching
- `create-project-from-template` - Template-based project creation
- `sync-project` - Pull/push synchronization
- `watch-val` - Local file watching with auto-push
- `pull-val` - Local workspace operations
- `browse-val` - Browser opening (could be adapted to return URL)
- `remix-val` - Val remixing
- `get-val-status` - Local workspace status

## Implementation Plan

### Phase 1: Project Setup

1. **Migrate backend files** - Move any relevant files from `backend/` to main
   directory
2. **Remove backend directory** - Clean up after migration
3. **Add `.vt/` directory** - Make current directory a ValTown project
4. **Create `.vtignore`** - Exclude local files from deployment:
   ```
   .git
   .vscode
   .cursorrules
   .DS_Store
   node_modules
   vendor
   taskNotes/
   README.md
   deno.lock
   ```
5. **Setup ValTown project** using `vt` CLI commands

### Phase 2: Code Modifications

1. **Modify `registerTools.ts`** to accept `excludeCli` parameter:
   ```typescript
   export async function registerTools(
     server: McpServer,
     config: Config,
     options?: { excludeCli?: boolean },
   ) {
     // Register all API-based tools
     registerUserTools(server, config);
     registerValTools(server, config);
     registerBranchTools(server, config);
     registerFileTools(server, config);
     registerSqliteTools(server, config);
     registerBlobTools(server, config);

     // Conditionally register CLI tools
     if (!options?.excludeCli) {
       registerCliTools(server, config);
     }
   }
   ```

2. **Update `config.ts`** for remote authentication:
   ```typescript
   export async function loadConfig(remoteMode = false) {
     if (remoteMode) {
       // For remote: expect token in request headers
       return {
         apiToken: null, // Will be set from headers
         apiBase: "https://api.val.town",
         prompts: {
           valleyPath: "./prompts/valley.txt", // Use local file in deployment
         },
       };
     }
     // Existing local config logic...
   }
   ```

### Phase 3: HTTP Entry Point

1. **Create `index.ts`** for ValTown HTTP deployment:
   ```typescript
   import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
   import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
   import { registerPromptsTools, registerTools } from "./registerTools.ts";
   import { loadConfig } from "./config.ts";

   // HTTP handler for ValTown
   export default async function (req: Request): Promise<Response> {
     // CORS handling
     if (req.method === "OPTIONS") {
       return new Response(null, {
         status: 200,
         headers: {
           "Access-Control-Allow-Origin": "*",
           "Access-Control-Allow-Methods": "POST, OPTIONS",
           "Access-Control-Allow-Headers":
             "Content-Type, Authorization, Mcp-Session-Id, X-Val-Town-Token",
         },
       });
     }

     // Extract token from headers
     const apiToken = req.headers.get("X-Val-Town-Token") ||
       req.headers.get("Authorization")?.replace("Bearer ", "");

     if (!apiToken) {
       return new Response("Missing API token", { status: 401 });
     }

     // Create server with remote config
     const config = await loadConfig(true);
     config.apiToken = apiToken;

     const server = new McpServer({
       name: "val-town-remote",
       version: "1.0.0",
     });

     // Register tools (exclude CLI)
     await registerTools(server, config, { excludeCli: true });
     registerPromptsTools(server, config);

     // Handle MCP request
     const transport = new StreamableHTTPServerTransport({
       sessionIdGenerator: () => crypto.randomUUID(),
     });

     return await transport.handleRequest(req);
   }
   ```

### Phase 4: Enhanced Features (Future)

1. **Configuration API endpoint** - Allow dynamic Valley prompt updates
2. **Health check endpoint** - Server status monitoring
3. **Rate limiting** - Prevent abuse
4. **Enhanced authentication** - OAuth support

## File Structure (Final)

```
/ (ValTown project root)
├── .vt/                      # ValTown project state
├── .vtignore                 # Exclude local files from deployment
├── mod.ts                    # 🔄 STDIO entry (unchanged)
├── index.ts                  # 🆕 HTTP entry for ValTown  
├── config.ts                 # 🔄 Enhanced for remote mode
├── registerTools.ts          # 🔄 Add excludeCli parameter
├── tools/                    # ✅ Deploy to ValTown
│   ├── userTools.ts          # ✅ API-based (included)
│   ├── valsTools.ts          # ✅ API-based (included) 
│   ├── branchTools.ts        # ✅ API-based (included)
│   ├── fileTools.ts          # ✅ API-based (included)
│   ├── sqliteTools.ts        # ✅ API-based (included)
│   ├── blobTools.ts          # ✅ API-based (included)
│   └── cliTools.ts           # ❌ Excluded in remote mode
├── prompts/                  # ✅ Deploy to ValTown
│   ├── valley.txt            # ✅ Used for remote prompt
│   └── promptsTools.ts       # ✅ Prompt registration
├── lib/                      # ✅ Deploy to ValTown
└── [excluded by .vtignore]
    ├── taskNotes/            # ❌ Not deployed
    ├── README.md             # ❌ Not deployed
    └── deno.lock             # ❌ Not deployed
```

## Authentication Strategy

### Remote Token Handling

- **Header-based**: `X-Val-Town-Token` or `Authorization: Bearer <token>`
- **API Key Format**: ValTown tokens are API keys (not JWT), format: `vtwn_*`
- **Per-request**: No persistent token storage required
- **Secure**: Token never logged or exposed

### Future: Configuration API

```typescript
// Future enhancement - dynamic configuration
app.post("/config/valley-prompt", async (req) => {
  const { prompt } = await req.json();
  // Update Valley prompt dynamically
  // Requires proper authentication and validation
});
```

## Benefits of This Approach

1. ✅ **Zero Code Duplication** - Reuses all existing tools and logic
2. ✅ **Clean Separation** - Local STDIO vs Remote HTTP entry points
3. ✅ **Selective Deployment** - Only deploys compatible tools
4. ✅ **Flexible Authentication** - Header-based token passing
5. ✅ **Future Extensible** - Easy to add configuration APIs
6. ✅ **ValTown Native** - Proper project structure and deployment

## Deployment Process

1. **Setup ValTown project**: `vt init` in current directory
2. **Configure exclusions**: Create `.vtignore` with local-only files
3. **Deploy**: `vt push` deploys `index.ts` and compatible tools
4. **Test**: MCP clients connect via HTTPS with token headers
5. **Monitor**: Use ValTown dashboard for debugging and logs

## Benefits of Remote HTTP Server

1. **Universal Access**: Can be used by any MCP client over HTTP
2. **Scalability**: ValTown's serverless infrastructure handles scaling
3. **Security**: API key authentication and CORS policies
4. **Maintainability**: Single deployment, no client-side installation
5. **Performance**: Direct API access without CLI overhead
6. **Real-time**: Streamable HTTP supports real-time updates

## Success Criteria

1. ✅ **API-based tools working** - All 6 non-CLI tool categories functional
   over HTTP
2. ✅ **Streamable HTTP transport** - Proper MCP protocol implementation
3. ✅ **API key authentication** - Secure ValTown token handling via headers
4. ✅ **CORS configuration** - Cross-origin access for MCP clients
5. ✅ **Session management** - Stateful operations using session IDs
6. ✅ **Error handling** - Appropriate HTTP status codes and error messages
7. ✅ **Import resolution** - All modules working in ValTown environment
8. ✅ **Performance** - Fast cold starts and response times
9. ✅ **Security** - No token leakage, proper validation, rate limiting

## MCP Client Configuration (Only useful for readme and documentation)

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "valtown-remote": {
      "url": "https://username-mcp-server.web.val.run/",
      "headers": {
        "X-Val-Town-Token": "vtwn_your_api_key_here"
      }
    }
  }
}
```

### Other MCP Clients

- **Endpoint**: `https://username-mcp-server.web.val.run/`
- **Method**: POST
- **Headers**:
  - `Content-Type: application/json`
  - `X-Val-Town-Token: vtwn_your_api_key_here`
  - Optional: `Mcp-Session-Id: session-uuid`

## Deployment Workflow

1. **Setup**: `vt init` in current directory
2. **Configure**: Create `.vtignore` to exclude local files
3. **Deploy**: `vt push` uploads code to ValTown
4. **Test**: Verify MCP clients can connect with API key
5. **Monitor**: Use ValTown dashboard for logs and performance
