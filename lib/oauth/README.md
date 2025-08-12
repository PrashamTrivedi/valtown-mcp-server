# OAuth 2.1 Implementation for ValTown MCP Server

This directory contains the OAuth 2.1 implementation that provides secure, standardized authorization for the ValTown MCP server.

## Overview

The implementation follows the MCP authorization specification and provides:

- **OAuth 2.1 Compliance**: Full implementation with PKCE support
- **Dynamic Client Registration**: Automatic client registration for MCP clients  
- **Scope-based Authorization**: Granular permissions for different operations
- **ValTown API Token Bridge**: Seamless integration with existing ValTown tokens
- **Backward Compatibility**: Maintains existing X-Val-Town-Token header support

## Key Components

### Core Files

- `metadata.ts` - OAuth server and protected resource metadata generation
- `storage.ts` - Client, authorization code, and token storage (memory-based)
- `crypto.ts` - JWT signing/verification, PKCE challenge/response, key generation
- `clientRegistration.ts` - Dynamic client registration service
- `authorizationFlow.ts` - Authorization code and token exchange flows
- `tokenValidation.ts` - JWT validation and scope checking
- `authMiddleware.ts` - Authentication middleware for dual auth support
- `jwks.ts` - JSON Web Key Set endpoint for public key verification

## OAuth 2.1 Endpoints

### Well-Known Discovery
- `GET /.well-known/oauth-authorization-server` - Authorization server metadata
- `GET /.well-known/oauth-protected-resource` - Protected resource metadata  
- `GET /.well-known/jwks.json` - Public keys for JWT verification

### Client Management
- `POST /oauth/register` - Dynamic client registration

### Authorization Flow
- `GET /oauth/authorize` - Authorization endpoint (PKCE required)
- `POST /oauth/token` - Token exchange endpoint
- `POST /oauth/revoke` - Token revocation endpoint

## Supported Scopes

### General Scopes
- `read` - Read-only access to all resources
- `write` - Write access to all resources  
- `admin` - Administrative access (delete operations)

### Resource-Specific Scopes
- `vals:read`, `vals:write`, `vals:delete` - Val management
- `files:read`, `files:write`, `files:delete` - File operations
- `blobs:read`, `blobs:write`, `blobs:delete` - Blob storage
- `sqlite:read`, `sqlite:write` - Database operations

## Usage Example

### 1. Client Registration

```bash
curl -X POST https://your-server.val.run/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uris": ["https://your-client.com/callback"],
    "client_name": "MCP Client",
    "scope": "read write vals:write"
  }'
```

### 2. Authorization Flow (PKCE)

```bash
# Generate code verifier and challenge
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
CODE_CHALLENGE=$(echo -n $CODE_VERIFIER | openssl dgst -sha256 -binary | base64 | tr -d "=+/" | cut -c1-43)

# Authorization request  
https://your-server.val.run/oauth/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&scope=read%20write&code_challenge=CODE_CHALLENGE&code_challenge_method=S256&state=STATE
```

### 3. Token Exchange

```bash
curl -X POST https://your-server.val.run/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "client_id": "CLIENT_ID",
    "code": "AUTHORIZATION_CODE",
    "redirect_uri": "REDIRECT_URI", 
    "code_verifier": "CODE_VERIFIER"
  }'
```

### 4. MCP Requests with OAuth

```bash
curl -X POST https://your-server.val.run/mcp \
  -H "Authorization: Bearer JWT_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get-val", 
      "arguments": {"username": "user", "valName": "example"}
    }
  }'
```

## Environment Variables

Required for OAuth support:

```bash
OAUTH_ENABLED=true
OAUTH_ISSUER_URL=https://your-server.val.run  
OAUTH_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
OAUTH_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
OAUTH_ENCRYPTION_KEY=32-byte-base64-encoded-key
OAUTH_ACCESS_TOKEN_TTL=3600    # 1 hour
OAUTH_REFRESH_TOKEN_TTL=2592000 # 30 days
```

## Security Features

- **PKCE Required**: All authorization flows must use Proof Key for Code Exchange
- **JWT Tokens**: Cryptographically signed tokens with embedded ValTown credentials
- **Scope Validation**: Fine-grained permission checking per operation
- **Token Revocation**: Immediate token invalidation support
- **HTTPS Only**: Secure transport enforcement
- **Short-lived Tokens**: Configurable token lifetimes with refresh capability

## Implementation Notes

### ValTown Token Bridge
OAuth JWTs contain embedded ValTown API tokens, allowing seamless integration:

```json
{
  "sub": "client_id",
  "scope": "read write vals:write",
  "val_town_token": "vt_abc123...",
  "client_id": "oauth_client_id", 
  "token_use": "access",
  "iss": "https://your-server.val.run",
  "exp": 1234567890
}
```

### Backward Compatibility
The system supports both authentication methods:
- **Legacy**: `X-Val-Town-Token` header (full access)
- **OAuth**: `Authorization: Bearer <jwt>` header (scope-limited)

### Storage Considerations
Current implementation uses in-memory storage. For production:
- Consider persistent storage (SQLite, PostgreSQL)
- Implement token cleanup for expired tokens
- Add client management interfaces

## Compliance

This implementation follows:
- OAuth 2.1 (IETF Draft)
- OAuth 2.0 Authorization Server Metadata (RFC 8414)
- OAuth 2.0 Protected Resource Metadata (RFC 9725) 
- Dynamic Client Registration Protocol (RFC 7591)
- Proof Key for Code Exchange (RFC 7636)
- Model Context Protocol Authorization Specification

## Future Enhancements

1. **Persistent Storage**: SQLite/PostgreSQL backend
2. **User Consent UI**: Authorization consent page
3. **Client Management**: Admin interface for client lifecycle
4. **Token Introspection**: RFC 7662 compliance
5. **Rate Limiting**: Per-client request throttling
6. **Audit Logging**: Security event tracking