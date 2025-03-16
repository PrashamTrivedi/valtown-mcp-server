import {Config} from "./types.ts"

export async function callValTownApi(config: Config, endpoint: string, options = {}) {
    const url = `${config.apiBase}${endpoint}`
    const defaultOptions = {
        headers: {
            "Authorization": `Bearer ${config.apiToken}`,
            "Content-Type": "application/json",
        },
    }

    try {
        const response = await fetch(url, {...defaultOptions, ...options})

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`)
        }

        if (response.status === 204) {
            return {success: true}
        }

        return await response.json()
    } catch (error) {
        console.error("API request error:", error)
        throw error
    }
}
