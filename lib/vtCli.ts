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