import {Config} from "./types.ts"

export async function callValTownApi(
    config: Config,
    path: string,
    options?: RequestInit
): Promise<any> {
    // Path conversion for endpoints that have changed in v2
    let apiPath = path

    // If any old v1 paths are accidentally used, convert them to v2
    if (path.startsWith("/v1/projects")) {
        apiPath = path.replace("/v1/projects", "/v2/vals")
        console.warn(`Converting deprecated v1 path to v2: ${path} → ${apiPath}`)
    } else if (path.startsWith("/v1/alias/projects")) {
        apiPath = path.replace("/v1/alias/projects", "/v2/alias/vals")
        console.warn(`Converting deprecated v1 path to v2: ${path} → ${apiPath}`)
    }

    const url = `${config.apiBase}${apiPath}`

    const headers: HeadersInit = {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options?.headers,
            ...headers,
        },
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error (${response.status}): ${errorText}`)
    }

    return response.json()
}