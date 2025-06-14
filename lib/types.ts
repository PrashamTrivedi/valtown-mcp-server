
export interface Config {
    apiToken: string | null
    apiBase: string
    cli?: {
        preferCli: boolean
        path: string
    },
    prompts?: {
        valleyPath?: string
        defaultValleyPath: string
    }
}

export interface SearchResult<T> {
    data: T[]
    links: {
        self: string
        prev?: string
        next?: string
    }
}