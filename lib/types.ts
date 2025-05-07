
export interface Config {
    apiToken: string
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