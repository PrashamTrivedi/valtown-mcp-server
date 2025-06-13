# ValTown CLI Integration Plan

## Overview

This plan outlines how to update the ValTown MCP server to use the `vt` CLI when
the `PREFER_CLI` configuration flag is enabled. When enabled, the server will
attempt to use the CLI for operations that have CLI equivalents, falling back to
the API when necessary.

## Prerequisites

1. Enhance `lib/vtCli.ts` to ensure robust CLI availability checking
2. Add proper error handling and fallback mechanisms
3. Ensure consistent return formats between CLI and API operations

## Tool-to-CLI Command Mapping

### User Tools (`userTools.ts`)

| Current Tool  | CLI Command | Action                                 |
| ------------- | ----------- | -------------------------------------- |
| `get-user`    | N/A         | Continue using API (no CLI equivalent) |
| `get-my-info` | N/A         | Continue using API (no CLI equivalent) |

### Val Tools (`valsTools.ts`)

| Current Tool   | CLI Command                            | Action                                                                 |
| -------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| `get-val`      | `vt clone <username>/<valName> --json` | Update to use CLI when preferred                                       |
| `search-vals`  | N/A                                    | Continue using API (no CLI equivalent)                                 |
| `create-val`   | `vt create <name> --json`              | Update to use CLI when preferred                                       |
| `delete-val`   | `vt delete --json`                     | Update to use CLI when preferred (requires handling working directory) |
| `list-my-vals` | `vt list --json`                       | Update to use CLI when preferred                                       |

### Branch Tools (`branchTools.ts`)

| Current Tool    | CLI Command                      | Action                                                        |
| --------------- | -------------------------------- | ------------------------------------------------------------- |
| `list-branches` | `vt branch --json`               | Update to use CLI when preferred (requires working directory) |
| `get-branch`    | N/A                              | Continue using API (no CLI equivalent)                        |
| `create-branch` | `vt checkout -b <name> --json`   | Update to use CLI when preferred (requires working directory) |
| `delete-branch` | `vt branch -D <branchId> --json` | Update to use CLI when preferred (requires working directory) |

### File Tools (`fileTools.ts`)

| Current Tool               | CLI Command        | Action                                                        |
| -------------------------- | ------------------ | ------------------------------------------------------------- |
| `list-files`               | `vt status --json` | Update to use CLI when preferred (requires working directory) |
| `get-file`                 | N/A                | Continue using API (no CLI equivalent)                        |
| `create-file-or-directory` | `vt push --json`   | Requires file creation first, then push                       |
| `update-file`              | `vt push --json`   | Requires file update first, then push                         |
| `delete-file-or-directory` | `vt push --json`   | Requires file deletion first, then push                       |

### SQLite Tools (`sqliteTools.ts`)

| Current Tool        | CLI Command | Action                                 |
| ------------------- | ----------- | -------------------------------------- |
| `execute-sql`       | N/A         | Continue using API (no CLI equivalent) |
| `execute-sql-batch` | N/A         | Continue using API (no CLI equivalent) |
| `sqlite-query`      | N/A         | Continue using API (no CLI equivalent) |
| `sqlite-exec`       | N/A         | Continue using API (no CLI equivalent) |

### Blob Tools (`blobTools.ts`)

| Current Tool  | CLI Command | Action                                 |
| ------------- | ----------- | -------------------------------------- |
| `list-blobs`  | N/A         | Continue using API (no CLI equivalent) |
| `get-blob`    | N/A         | Continue using API (no CLI equivalent) |
| `store-blob`  | N/A         | Continue using API (no CLI equivalent) |
| `delete-blob` | N/A         | Continue using API (no CLI equivalent) |

## Implementation Plan

### 1. Enhance CLI Utility Functions

Update `lib/vtCli.ts` to include:

```typescript
// Enhanced runVtCommand with proper working directory support
export async function runVtCommand(args: string[], options?: {
  workingDir?: string;
  suppressErrors?: boolean;
}): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  // Implementation here
}

// Helper function for operating on a specific Val
export async function prepareValWorkspace(valId: string): Promise<{
  success: boolean;
  tempDir?: string;
  error?: string;
}> {
  // Create temp directory, clone Val, and return directory path
}

// Helper function to clean up temp directory
export async function cleanupTempDirectory(dirPath: string): Promise<boolean> {
  // Clean up temp directory
}
```

### 2. Update Tool Registration Functions

For each tool function that can use the CLI, modify to use the CLI when
`config.cli?.preferCli` is true and CLI is available:

```typescript
server.tool(
  "tool-name",
  "Description",
  {/* parameters */},
  async (params) => {
    // Check for CLI preference
    const useCliIfAvailable = config.cli?.preferCli ?? false;
    const cliAvailable = useCliIfAvailable && await getCliAvailability();

    if (cliAvailable) {
      try {
        // Use CLI implementation
        const result = await runCliImplementation(params);
        return result;
      } catch (error) {
        console.error("CLI error, falling back to API:", error);
        // Fall back to API on error
      }
    }

    // API implementation (original code)
    try {
      const data = await callValTownApi(/* ... */);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      // Error handling
    }
  },
);
```

### 3. File Operations Workflow with CLI

For file operations which require local file manipulation:

1. Create a temporary directory
2. Clone the Val to the temp directory
3. Perform file operations (create/update/delete files)
4. Push changes
5. Clean up temp directory

### 4. Add New CLI Workflows

Add these tools to support CLI-specific operations that aren't currently
covered:

#### New Tools to Implement

1. **Watch Tool** - `watch-val`
   - Inputs: `valId`, `branchId` (optional)
   - Description: "Watch a Val for local changes and automatically push them"
   - Maps to: `vt watch`

2. **Pull Tool** - `pull-val`
   - Inputs: `valId`, `branchId` (optional)
   - Description: "Pull latest changes from Val Town"
   - Maps to: `vt pull`

3. **Browse Tool** - `browse-val`
   - Inputs: `valId`
   - Description: "Open a Val in the default web browser"
   - Maps to: `vt browse`

4. **Remix Tool** - `remix-val`
   - Inputs: `sourceValUri`, `newValName`, `privacy` (optional)
   - Description: "Remix an existing Val to create a new one"
   - Maps to: `vt remix`

5. **Status Tool** - `get-val-status`
   - Inputs: `valId`
   - Description: "Show the working tree status of a Val"
   - Maps to: `vt status`

## Testing Plan

1. Test CLI availability detection
2. Test each tool with CLI preferred and available
3. Test each tool with CLI preferred but unavailable (fallback to API)
4. Test each tool with CLI not preferred
5. Test error handling and recovery

## Notes and Considerations

1. **Temporary Directory Management**: When using CLI operations, we'll need to
   create temporary directories to clone and manipulate Vals. Ensure proper
   cleanup.

2. **Error Handling**: If CLI operations fail, log the error and fall back to
   API operations where possible.

3. **JSON Output**: Add `--json` flag to CLI commands when available to ensure
   structured output.

4. **Working Directory**: CLI commands require a working directory with a Val
   checked out. Implement proper scaffolding and cleanup.

5. **CLI Version Compatibility**: Add version checking to ensure compatibility
   with the CLI version.

6. **Performance Considerations**: CLI operations may be slower than direct API
   calls due to additional filesystem operations.
