# Task Analysis: Remove deno.json npm imports for ValTown compatibility

## Exact Task Requirements

Remove npm imports from `deno.json` and import them directly in TypeScript files
to make the MCP server tools compatible with both CLI (Deno) and ValTown
deployment environments.

## Current State Analysis

### Current npm imports in deno.json:

```json
"imports": {
  "zod": "npm:zod",
  "@modelcontextprotocol/sdk/server": "npm:@modelcontextprotocol/sdk/server",
  "@modelcontextprotocol/sdk": "npm:@modelcontextprotocol/sdk"
}
```

### Files Using These Imports:

- **mod.ts**: Uses `@modelcontextprotocol/sdk/server/mcp.js` and
  `@modelcontextprotocol/sdk/server/stdio.js`
- **index.http.ts**: Already uses direct npm imports
  (`npm:@modelcontextprotocol/sdk/server/mcp.js`, etc.)
- **registerTools.ts**: Uses `@modelcontextprotocol/sdk/server/mcp.js`
- **All tool files** (userTools.ts, valsTools.ts, etc.): Use `zod` and
  `@modelcontextprotocol/sdk/server/mcp.js`

### Key Observations:

1. `index.http.ts` already demonstrates the correct pattern with direct npm
   imports
2. The CLI version (`mod.ts`) uses the import map while the HTTP version uses
   direct imports
3. Both versions need to work with identical tool registration code

## Implementation Strategy

### 1. Update Import Statements

Replace all import map references with direct npm imports:

**From:**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
```

**To:**

```typescript
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "npm:zod";
```

### 2. Files Requiring Updates

- `mod.ts` (2 imports)
- `registerTools.ts` (1 import)
- All tool files in `/tools/` directory (11 files)
- `prompts/promptsTools.ts` (2 imports)

### 3. Remove deno.json imports

Delete the entire `imports` section from `deno.json`:

```json
"imports": {
  "zod": "npm:zod",
  "@modelcontextprotocol/sdk/server": "npm:@modelcontextprotocol/sdk/server", 
  "@modelcontextprotocol/sdk": "npm:@modelcontextprotocol/sdk"
}
```

### 4. Verification Steps

1. Test CLI functionality with `deno task start`
2. Test Builds pass with `deno task build`
3. Test HTTP deployment compatibility with `vt push`. 3.1 You need to start the
   MCP inspector with `npx @modelcontextprotocol/inspector` 3.2 You need to ask
   the Developer to run the valtown mcp server with proper arguments.
4. Ensure both entry points work with identical tool code
5. Verify no breaking changes to existing functionality

## Expected Benefits

- Single codebase works in both Deno CLI and ValTown environments
- Eliminates import map dependency issues in ValTown
- Maintains compatibility with existing MCP server functionality
- Simplifies deployment and reduces environment-specific configuration
