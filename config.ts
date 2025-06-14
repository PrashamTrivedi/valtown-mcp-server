import {config as dotenvConfig} from "https://deno.land/x/dotenv@v3.2.2/mod.ts"
import * as path from "jsr:@std/path"
import {getCliAvailability} from "./lib/vtCli.ts"
export async function loadConfig(remoteMode = false) {
  if (remoteMode) {
    // For remote: expect token in request headers, use local prompt file
    return {
      apiToken: null, // Will be set from headers
      apiBase: "https://api.val.town",
      cli: {
        preferCli: false,
        path: "vt",
      },
      prompts: {
        valleyPath: `${import.meta.dirname}/prompts/valley.txt`, // Use local file in deployment
        defaultValleyPath: `${import.meta.dirname}/prompts/valley.txt`,
      },
    };
  }

  // Existing local config logic
  dotenvConfig({ export: true });

  const API_TOKEN = Deno.env.get("VAL_TOWN_API_TOKEN");
  if (!API_TOKEN) {
    console.error("Error: VAL_TOWN_API_TOKEN environment variable is required");
    Deno.exit(1);
  }

  // CLI preference configuration
  const PREFER_CLI = Deno.env.get("VAL_TOWN_PREFER_CLI") !== "false"; // Default to true
  const CLI_PATH = Deno.env.get("VAL_TOWN_CLI_PATH") || "vt"; // Default to "vt" in PATH
  // Prompt file paths (can be absolute or relative to CWD)
  const VALLEY_PROMPT_PATH = Deno.env.get("VALLEY_PROMPT_PATH");
  const useCliIfAvailable = PREFER_CLI ?? false;
  const cliAvailable = useCliIfAvailable && await getCliAvailability();
  const defaultPromptPath = `${import.meta.dirname}/prompts/${
    cliAvailable ? "valley.txt" : "valley_local.txt"
  }`;

  // Resolve paths relative to the current working directory if they're not absolute
  const resolvedValleyPath = VALLEY_PROMPT_PATH
    ? (path.isAbsolute(VALLEY_PROMPT_PATH)
      ? VALLEY_PROMPT_PATH
      : defaultPromptPath)
    : undefined;
  return {
    apiToken: API_TOKEN,
    apiBase: "https://api.val.town",
    cli: {
      preferCli: PREFER_CLI,
      path: CLI_PATH,
    },
    prompts: {
      valleyPath: resolvedValleyPath,
      // Default paths included with the binary
      defaultValleyPath: defaultPromptPath,
    },
  };
}