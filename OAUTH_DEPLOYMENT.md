# OAuth 2.1 Deployment Guide

This guide explains how to deploy the ValTown MCP Server with OAuth 2.1 support enabled.

## Prerequisites

1. ValTown account with API token
2. RSA key pair for JWT signing
3. Environment variables configured

## Step 1: Generate RSA Key Pair

Generate the required RSA keys for JWT signing:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key  
openssl rsa -in private.pem -pubout -out public.pem

# Convert to single-line format for environment variables
PRIVATE_KEY=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem)
PUBLIC_KEY=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public.pem)
```

## Step 2: Configure Environment Variables

Set the following environment variables in your ValTown environment or .env file:

```bash
# OAuth Configuration
OAUTH_ENABLED=true
OAUTH_ISSUER_URL=https://prashamtrivedi-valtown-mcp-server.val.run
OAUTH_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
OAUTH_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtP...\n-----END PUBLIC KEY-----"
OAUTH_ENCRYPTION_KEY="base64-encoded-32-byte-key"
OAUTH_ACCESS_TOKEN_TTL=3600
OAUTH_REFRESH_TOKEN_TTL=2592000

# ValTown Configuration (existing)
VAL_TOWN_API_TOKEN=your_valtown_token_here
```

### Generating Encryption Key

```bash
# Generate 32-byte encryption key
openssl rand -base64 32
```

## Step 3: Deploy to ValTown

1. Upload the updated code to your ValTown val
2. Ensure all environment variables are set
3. Test the deployment

## Step 4: Verify OAuth Endpoints

Test that all OAuth endpoints are working:

```bash
# Authorization Server Metadata
curl https://your-server.val.run/.well-known/oauth-authorization-server

# Protected Resource Metadata  
curl https://your-server.val.run/.well-known/oauth-protected-resource

# JWKS Endpoint
curl https://your-server.val.run/.well-known/jwks.json

# Client Registration
curl -X POST https://your-server.val.run/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uris": ["https://client.example.com/callback"],
    "client_name": "Test Client"
  }'
```

## Step 5: Test OAuth Flow

Run the automated test suite:

```bash
# Set test environment
export TEST_SERVER_URL=https://your-server.val.run
export VAL_TOWN_API_TOKEN=your_token

# Run OAuth compliance tests
deno run --allow-net --allow-env oauth-test.ts
```

## MCP Client Configuration

For MCP clients supporting OAuth, use these configuration values:

### Claude Desktop Config
```json
{
  "mcpServers": {
    "valtown-oauth": {
      "command": "npx", 
      "args": ["@modelcontextprotocol/server-everything"],
      "transport": {
        "type": "http",
        "url": "https://your-server.val.run/mcp",
        "oauth": {
          "authorization_endpoint": "https://your-server.val.run/oauth/authorize",
          "token_endpoint": "https://your-server.val.run/oauth/token", 
          "client_registration_endpoint": "https://your-server.val.run/oauth/register",
          "scopes": ["read", "write", "vals:read", "vals:write"]
        }
      }
    }
  }
}
```

### Manual OAuth Client Setup

1. **Register Client:**
   ```bash
   curl -X POST https://your-server.val.run/oauth/register \
     -H "Content-Type: application/json" \
     -d '{
       "redirect_uris": ["https://your-app.com/oauth/callback"],
       "client_name": "Your MCP Client",
       "scope": "read write vals:read vals:write"
     }'
   ```

2. **Store client_id and client_secret from response**

3. **Authorization Request (PKCE):**
   ```bash
   # Generate PKCE parameters
   CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
   CODE_CHALLENGE=$(echo -n $CODE_VERIFIER | openssl dgst -sha256 -binary | base64 | tr -d "=+/" | cut -c1-43)
   
   # Redirect user to:
   https://your-server.val.run/oauth/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&scope=read%20write&code_challenge=CODE_CHALLENGE&code_challenge_method=S256&state=RANDOM_STATE
   ```

4. **Exchange Code for Token:**
   ```bash
   curl -X POST https://your-server.val.run/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "authorization_code",
       "client_id": "CLIENT_ID",
       "client_secret": "CLIENT_SECRET",
       "code": "AUTH_CODE",
       "redirect_uri": "REDIRECT_URI",
       "code_verifier": "CODE_VERIFIER"
     }'
   ```

5. **Use Access Token:**
   ```bash
   curl -X POST https://your-server.val.run/mcp \
     -H "Authorization: Bearer ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
   ```

## Security Considerations

1. **Environment Variables**: Store sensitive values securely
2. **HTTPS Only**: Never use OAuth over HTTP in production  
3. **Key Management**: Rotate keys regularly
4. **Scope Principle**: Grant minimal required scopes
5. **Token Monitoring**: Monitor for suspicious activity

## Troubleshooting

### Common Issues

1. **"OAuth not enabled" errors**: Check `OAUTH_ENABLED=true` is set
2. **JWT signature failures**: Verify private/public key pair matches
3. **Client registration fails**: Ensure redirect URIs use HTTPS
4. **Token validation fails**: Check token hasn't expired
5. **Scope errors**: Verify client has required scopes

### Debug Mode

Enable additional logging:
```bash
export DEBUG=oauth:*
```

### Test OAuth Without MCP Client

Use the test script to verify OAuth implementation:
```bash
deno run --allow-net --allow-env oauth-test.ts
```

## Migration from Legacy Authentication

The system maintains backward compatibility:

- **Existing clients** using `X-Val-Town-Token` continue to work
- **New clients** can use OAuth for enhanced security
- **Gradual migration** is supported

To migrate existing integrations:
1. Deploy OAuth-enabled server
2. Register OAuth clients
3. Update client applications gradually
4. Eventually deprecate legacy authentication

## Support

For issues or questions:
1. Check the test suite output for specific errors
2. Verify environment variable configuration  
3. Review server logs for OAuth-related messages
4. Consult the OAuth 2.1 specification for compliance details