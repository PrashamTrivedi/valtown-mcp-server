
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
    },
    oauth?: OAuthConfig
}

export interface OAuthConfig {
    enabled: boolean
    issuerUrl: string
    jwtPrivateKey: string
    jwtPublicKey: string
    encryptionKey: string
    accessTokenTtl: number
    refreshTokenTtl: number
}

export interface SearchResult<T> {
    data: T[]
    links: {
        self: string
        prev?: string
        next?: string
    }
}

export interface OAuthClient {
    clientId: string
    clientSecret?: string
    redirectUris: string[]
    scopes: string[]
    grantTypes: string[]
    tokenEndpointAuthMethod: string
    createdAt: Date
    updatedAt: Date
}

export interface AuthorizationCode {
    code: string
    clientId: string
    redirectUri: string
    scope: string
    codeChallenge: string
    codeChallengeMethod: string
    expiresAt: Date
    valTownToken: string
}

export interface AccessToken {
    token: string
    clientId: string
    scope: string
    expiresAt: Date
    valTownToken: string
    refreshToken?: string
}

export interface OAuthTokenResponse {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
    scope?: string
}

export interface OAuthError {
    error: string
    error_description?: string
    error_uri?: string
}