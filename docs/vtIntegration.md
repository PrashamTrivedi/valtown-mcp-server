# Val Town CLI Integration

This document outlines how to integrate the Val Town CLI (`vt`) with our MCP server workflow, focusing on enhancing existing commands with CLI capabilities while providing API fallbacks.

## Integration Strategy

The primary strategy is to implement a "CLI-first, API-fallback" approach:

1. Detect if the `vt` CLI is available in the environment
2. For supported operations, attempt to use the CLI first
3. Fall back to existing API implementations when the CLI is unavailable or unsuitable

## CLI Detection and Wrapper Layer

### CLI Detection Module

```typescript
// lib/vtCli.ts
export async function isVtCliAvailable(): Promise<boolean> {
  try {
    const process = Deno.run({
      cmd: ["which", "vt"],
      stdout: "piped",
      stderr: "piped"
    });
    const status = await process.status();
    return status.success;
  } catch (error) {
    console.error("Error detecting vt CLI:", error);
    return false;
  }
}

// Cache the CLI availability result
let _isCliAvailable: boolean | null = null;
export async function getCliAvailability(): Promise<boolean> {
  if (_isCliAvailable === null) {
    _isCliAvailable = await isVtCliAvailable();
  }
  return _isCliAvailable;
}
```

### CLI Command Runner

```typescript
// lib/vtCli.ts (continued)
export async function runVtCommand(args: string[]): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  try {
    const process = Deno.run({
      cmd: ["vt", ...args],
      stdout: "piped",
      stderr: "piped"
    });
    
    const [status, stdout, stderr] = await Promise.all([
      process.status(),
      process.output(),
      process.stderrOutput()
    ]);
    
    return {
      success: status.success,
      output: new TextDecoder().decode(stdout),
      error: status.success ? undefined : new TextDecoder().decode(stderr)
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: `Failed to execute vt command: ${error}`
    };
  }
}
```

## Enhancing Existing Tools

### Project Tools Enhancements

Update the existing `projectTools.ts` module to leverage CLI for appropriate operations:

```typescript
// tools/projectTools.ts (enhanced version)
import { getCliAvailability, runVtCommand } from "../lib/vtCli.ts";

// Get a project by username and project name
server.tool(
  "get-project-by-name",
  "Get a project by username and project name",
  { /* existing parameters */ },
  async ({username, projectName}) => {
    // Check if CLI is available
    const cliAvailable = await getCliAvailability();
    
    if (cliAvailable) {
      try {
        // First, try to use vt CLI
        const result = await runVtCommand(["clone", `${username}/${projectName}`, "--json"]);
        
        if (result.success) {
          // Parse JSON output from CLI
          const data = JSON.parse(result.output);
          return {
            content: [{type: "text", text: JSON.stringify(data, null, 2)}],
          };
        }
        // If CLI fails, fall back to API
      } catch (error) {
        console.error("CLI error:", error);
        // Continue to API fallback
      }
    }
    
    // Fallback to original API implementation
    try {
      const data = await callValTownApi(
        config,
        `/v1/alias/projects/${encodeURIComponent(username)}/${encodeURIComponent(projectName)}`
      );
      return {
        content: [{type: "text", text: JSON.stringify(data, null, 2)}],
      };
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{type: "text", text: `Error getting project: ${errorMessage}`}],
        isError: true,
      };
    }
  }
)
```

### File Tools Enhancements

Enhance file tools to use CLI operations where appropriate:

```typescript
// tools/fileTools.ts (enhanced version)
import { getCliAvailability, runVtCommand } from "../lib/vtCli.ts";

// Get file content
server.tool(
  "get-file",
  "Get file content from a project branch",
  { /* existing parameters */ },
  async ({projectId, path, branchId}) => {
    const cliAvailable = await getCliAvailability();
    
    // For project checkout and file viewing, CLI is more efficient
    if (cliAvailable) {
      try {
        // Use the vt CLI to fetch file content
        // This assumes we're in a directory with the project checked out
        // First check if we need to checkout the branch
        if (branchId) {
          const checkout = await runVtCommand(["checkout", branchId]);
          if (!checkout.success) {
            console.error("Failed to checkout branch:", checkout.error);
            // Fallback to API
          }
        }
        
        // Assuming the CLI has a method to directly get file content
        // If not, we'd need to clone+checkout+read
        const result = await runVtCommand(["pull"]);
        if (result.success) {
          // Read the file from local filesystem after pull
          const fileContent = await Deno.readTextFile(path);
          return {
            content: [{type: "text", text: fileContent}],
          };
        }
      } catch (error) {
        console.error("CLI error:", error);
        // Continue to API fallback
      }
    }
    
    // Fallback to original API implementation
    try {
      // Original API implementation here
      // ...
    } catch (error) {
      // Error handling code
      // ...
    }
  }
)
```

## Priority Commands for CLI Enhancement

These commands should prioritize CLI implementation when available:

1. **Project Checkout**
   - Current API approach requires multiple calls and complex prompt flow
   - `vt clone` handles the entire checkout process efficiently
   - Implement CLI-based checkout in `get-project-by-name` and related tools

2. **Branch Operations**
   - `vt checkout` simplifies branch switching compared to API
   - `vt branch` provides better branch management
   - Enhance `branchTools.ts` to use CLI for operations when available

3. **File Synchronization**
   - `vt pull` and `vt push` are more efficient for bulk file operations
   - `vt watch` enables real-time synchronization
   - Enhance file tools to leverage CLI for sync operations

## Configuration Enhancements

Update `config.ts` to include CLI configuration:

```typescript
// config.ts (enhanced)
export function loadConfig() {
  dotenvConfig({export: true});

  const API_TOKEN = Deno.env.get("VAL_TOWN_API_TOKEN");
  if (!API_TOKEN) {
    console.error("Error: VAL_TOWN_API_TOKEN environment variable is required");
    Deno.exit(1);
  }

  // New: CLI preference configuration
  const PREFER_CLI = Deno.env.get("VAL_TOWN_PREFER_CLI") !== "false"; // Default to true
  const CLI_PATH = Deno.env.get("VAL_TOWN_CLI_PATH") || "vt"; // Default to "vt" in PATH

  return {
    apiToken: API_TOKEN,
    apiBase: "https://api.val.town",
    cli: {
      preferCli: PREFER_CLI,
      path: CLI_PATH,
    }
  };
}
```

## Implementation Phases

### Phase 1: CLI Detection and Wrapper Infrastructure
- Create `vtCli.ts` with CLI detection and command runner
- Update config to include CLI preferences
- Test CLI detection and basic command execution

### Phase 2: Enhance Existing Commands
- Modify `projectTools.ts` to use CLI for project operations
- Update `branchTools.ts` to use CLI for branch operations 
- Enhance `fileTools.ts` to use CLI for file operations
- Maintain compatibility with existing tool interfaces

### Phase 3: New CLI-Only Capabilities
- Add local development workflow features
- Implement real-time file watching
- Create project template and scaffolding tools

## Benefits of CLI Integration

1. **More Efficient Workflows**
   - Checkout operations are handled in a single command
   - Branch switching is more natural and Git-like
   - File synchronization is more efficient

2. **Reduced API Load**
   - Fewer API calls for common operations
   - Less network traffic and lower latency
   - Better handling of rate limits

3. **Offline Capabilities**
   - Limited operations possible without internet access
   - Cached project data available locally
   - Batched synchronization of changes

4. **Familiar Developer Experience**
   - Git-like command structure and workflow
   - Consistent with common developer tools
   - Better integration with local development environments