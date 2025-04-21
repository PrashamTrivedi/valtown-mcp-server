export interface Config {
    apiToken: string
    apiBase: string
    cli?: {
        preferCli: boolean
        path: string
    }
}
