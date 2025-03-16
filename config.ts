import {config as dotenvConfig} from "https://deno.land/x/dotenv@v3.2.2/mod.ts"

export function loadConfig() {
    dotenvConfig({export: true})

    const API_TOKEN = Deno.env.get("VAL_TOWN_API_TOKEN")
    if (!API_TOKEN) {
        console.error("Error: VAL_TOWN_API_TOKEN environment variable is required")
        Deno.exit(1)
    }

    return {
        apiToken: API_TOKEN,
        apiBase: "https://api.val.town",
    }
}
