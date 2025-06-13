/**
 * ValTown CLI integration utilities
 * Provides detection and execution capabilities for the ValTown CLI
 */

/**
 * Checks if the ValTown CLI (vt) is available in the environment
 * @returns Promise resolving to boolean indicating CLI availability
 */
export async function isVtCliAvailable(): Promise<boolean> {
  try {
    const command = new Deno.Command("which", {
      args: ["vt"],
      stdout: "piped",
      stderr: "piped"
    });
    const output = await command.output();
    return output.code === 0;
  } catch (error) {
    console.error("Error detecting vt CLI:", error);
    return false;
  }
}

// Cache the CLI availability result
let _isCliAvailable: boolean | null = null;

/**
 * Gets and caches the CLI availability to avoid repeated checks
 * @returns Promise resolving to boolean indicating CLI availability
 */
export async function getCliAvailability(): Promise<boolean> {
  if (_isCliAvailable === null) {
    _isCliAvailable = await isVtCliAvailable();
  }
  return _isCliAvailable;
}

/**
 * Runs a ValTown CLI command with the provided arguments
 * @param args Array of command arguments to pass to the vt CLI
 * @returns Promise resolving to an object containing command execution result
 */
export async function runVtCommand(args: string[]): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  try {
    const command = new Deno.Command("vt", {
      args: args,
      stdout: "piped",
      stderr: "piped"
    });
    
    const output = await command.output();
    
    return {
      success: output.code === 0,
      output: new TextDecoder().decode(output.stdout),
      error: output.code === 0 ? undefined : new TextDecoder().decode(output.stderr)
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: `Failed to execute vt command: ${error}`
    };
  }
}

/**
 * Parse CLI JSON output (placeholder for missing function)
 * @param output CLI output string to parse
 * @returns Parsed JSON object or error
 */
export function parseCliJsonOutput(output: string): any {
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Failed to parse CLI JSON output: ${error}`);
  }
}

/**
 * Prepare Val workspace (placeholder for missing function)
 * @param valId Val ID to prepare workspace for
 * @returns Workspace preparation result
 */
export async function prepareValWorkspace(valId: string): Promise<{
  success: boolean;
  workspacePath?: string;
  error?: string;
}> {
  // This is a placeholder since workspace operations are CLI-specific
  // and not needed for remote HTTP mode
  return {
    success: false,
    error: "Workspace operations not supported in remote mode"
  };
}

/**
 * Cleanup temporary directory (placeholder for missing function)
 * @param dirPath Directory path to cleanup
 * @returns Cleanup result
 */
export async function cleanupTempDirectory(dirPath: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // This is a placeholder since workspace operations are CLI-specific
  // and not needed for remote HTTP mode
  return {
    success: false,
    error: "Workspace operations not supported in remote mode"
  };
}