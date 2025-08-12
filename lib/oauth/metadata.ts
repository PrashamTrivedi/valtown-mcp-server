import { OAuthConfig } from "../types.ts";

export interface OAuthAuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  revocation_endpoint: string;
  introspection_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  code_challenge_methods_supported: string[];
  scopes_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  registration_endpoint_open: boolean;
}

export interface OAuthProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
  resource_documentation?: string;
}

export function generateAuthorizationServerMetadata(config: OAuthConfig): OAuthAuthorizationServerMetadata {
  const issuer = config.issuerUrl;
  
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    introspection_endpoint: `${issuer}/oauth/introspect`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token"
    ],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none"
    ],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [
      "read",
      "write", 
      "admin",
      "vals:read",
      "vals:write",
      "vals:delete",
      "files:read",
      "files:write",
      "files:delete",
      "blobs:read",
      "blobs:write",
      "blobs:delete",
      "sqlite:read",
      "sqlite:write"
    ],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    registration_endpoint_open: true
  };
}

export function generateProtectedResourceMetadata(config: OAuthConfig): OAuthProtectedResourceMetadata {
  return {
    resource: config.issuerUrl,
    authorization_servers: [config.issuerUrl],
    scopes_supported: [
      "read",
      "write",
      "admin",
      "vals:read",
      "vals:write", 
      "vals:delete",
      "files:read",
      "files:write",
      "files:delete",
      "blobs:read",
      "blobs:write",
      "blobs:delete",
      "sqlite:read",
      "sqlite:write"
    ],
    bearer_methods_supported: [
      "header",
      "query"
    ],
    resource_documentation: "https://github.com/PrashamTrivedi/valtown-mcp-server"
  };
}