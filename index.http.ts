/**
 * ValTown Remote HTTP MCP Server
 * 
 * This is the HTTP entry point for the ValTown MCP Server when deployed
 * on ValTown itself. It excludes CLI-dependent functionality and uses
 * header-based authentication with Hono and StreamableHTTPServerTransport.
 */

import {McpServer} from "npm:@modelcontextprotocol/sdk/server/mcp.js"
import {StreamableHTTPServerTransport} from "npm:@modelcontextprotocol/sdk/server/streamableHttp.js"
import {Hono} from "npm:hono"
import {cors} from "npm:hono/cors"
import {toFetchResponse, toReqRes} from "npm:fetch-to-node"
import {registerPromptsTools, registerTools} from "./registerTools.ts"
import {loadConfig} from "./config.ts"
import {generateAuthorizationServerMetadata, generateProtectedResourceMetadata} from "./lib/oauth/metadata.ts"
import {ClientRegistrationService} from "./lib/oauth/clientRegistration.ts"
import {AuthorizationFlowService} from "./lib/oauth/authorizationFlow.ts"
import {AuthMiddleware} from "./lib/oauth/authMiddleware.ts"
import {generateJWKS} from "./lib/oauth/jwks.ts"

const app = new Hono()

// Add CORS middleware
app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id", "X-Val-Town-Token"],
}))

// Handle GET requests - Server info
app.get("/", (c) => {
  const responseData = {
    name: "ValTown MCP Server",
    version: "1.0.0",
    description: "Model Context Protocol server for ValTown integration",
    status: "active",
    message: "This is an MCP server. Configuration endpoint coming soon...",
    endpoints: {
      mcp: "POST / - MCP protocol requests (requires X-Val-Town-Token header)",
      info: "GET / - This endpoint"
    },
    documentation: "https://github.com/PrashamTrivedi/valtown-mcp-server"
  }

  return c.json(responseData)
})

// OAuth 2.1 Well-Known Endpoints
app.get("/.well-known/oauth-authorization-server", async (c) => {
  try {
    const config = await loadConfig(true)
    
    // Use dynamic issuer URL based on current request
    const issuerUrl = new URL(c.req.url).origin
    
    // Update OAuth config with dynamic issuer URL
    if (config.oauth) {
      config.oauth.issuerUrl = issuerUrl
    }

    const metadata = generateAuthorizationServerMetadata(config.oauth!)
    
    // Add a note if OAuth is disabled
    if (!config.oauth?.enabled) {
      return c.json({
        ...metadata,
        oauth_enabled: false,
        note: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable."
      })
    }
    
    return c.json(metadata)
  } catch (error) {
    console.error("Error generating authorization server metadata:", error)
    return c.json({
      error: "Internal server error"
    }, 500)
  }
})

app.get("/.well-known/oauth-protected-resource", async (c) => {
  try {
    const config = await loadConfig(true)
    
    // Use dynamic issuer URL based on current request
    const issuerUrl = new URL(c.req.url).origin
    
    // Update OAuth config with dynamic issuer URL
    if (config.oauth) {
      config.oauth.issuerUrl = issuerUrl
    }

    const metadata = generateProtectedResourceMetadata(config.oauth!)
    
    if (!config.oauth?.enabled) {
      return c.json({
        ...metadata,
        oauth_enabled: false,
        note: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable."
      })
    }
    
    return c.json(metadata)
  } catch (error) {
    console.error("Error generating protected resource metadata:", error)
    return c.json({
      error: "Internal server error"
    }, 500)
  }
})

// JWK Set endpoint for public key verification
app.get("/.well-known/jwks.json", async (c) => {
  try {
    const config = await loadConfig(true)
    
    if (!config.oauth?.enabled) {
      return c.json({
        keys: [],
        oauth_enabled: false,
        note: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable."
      })
    }

    const jwks = await generateJWKS(config.oauth)
    return c.json(jwks)
  } catch (error) {
    console.error("JWKS generation error:", error)
    return c.json({
      error: "Internal server error"
    }, 500)
  }
})

// OAuth 2.1 Well-Known Endpoints with /mcp path (for MCP clients)
app.get("/.well-known/oauth-authorization-server/mcp", async (c) => {
  try {
    const config = await loadConfig(true)
    
    // Use base server URL (without /mcp) for OAuth endpoints
    const baseUrl = new URL(c.req.url)
    const issuerUrl = baseUrl.origin
    
    // Update OAuth config with dynamic issuer URL
    if (config.oauth) {
      config.oauth.issuerUrl = issuerUrl
    }

    const metadata = generateAuthorizationServerMetadata(config.oauth!)
    
    if (!config.oauth?.enabled) {
      return c.json({
        ...metadata,
        oauth_enabled: false,
        note: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable."
      })
    }
    
    return c.json(metadata)
  } catch (error) {
    console.error("Error generating authorization server metadata:", error)
    return c.json({
      error: "Internal server error"
    }, 500)
  }
})

app.get("/.well-known/oauth-protected-resource/mcp", async (c) => {
  try {
    const config = await loadConfig(true)
    
    // Use base server URL (without /mcp) for OAuth endpoints
    const baseUrl = new URL(c.req.url)
    const issuerUrl = baseUrl.origin
    
    // Update OAuth config with dynamic issuer URL
    if (config.oauth) {
      config.oauth.issuerUrl = issuerUrl
    }

    const metadata = generateProtectedResourceMetadata(config.oauth!)
    
    if (!config.oauth?.enabled) {
      return c.json({
        ...metadata,
        oauth_enabled: false,
        note: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable."
      })
    }
    
    return c.json(metadata)
  } catch (error) {
    console.error("Error generating protected resource metadata:", error)
    return c.json({
      error: "Internal server error"
    }, 500)
  }
})

app.get("/.well-known/jwks.json/mcp", async (c) => {
  try {
    const config = await loadConfig(true)
    
    if (!config.oauth?.enabled) {
      return c.json({
        keys: [],
        oauth_enabled: false,
        note: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable."
      })
    }

    const jwks = await generateJWKS(config.oauth)
    return c.json(jwks)
  } catch (error) {
    console.error("JWKS generation error:", error)
    return c.json({
      error: "Internal server error"
    }, 500)
  }
})

// OAuth 2.1 Dynamic Client Registration
app.post("/oauth/register", async (c) => {
  try {
    const config = await loadConfig(true)
    
    if (!config.oauth?.enabled) {
      return c.json({
        error: "oauth_disabled",
        error_description: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable client registration.",
        oauth_enabled: false
      }, 503) // Service Unavailable - more appropriate than 404
    }

    const registrationService = new ClientRegistrationService()
    const requestBody = await c.req.json()
    
    const result = await registrationService.registerClient(requestBody)
    
    if (!result.success) {
      return c.json(result.error, 400)
    }

    return c.json(result.data, 201)
  } catch (error) {
    console.error("Client registration error:", error)
    return c.json({
      error: "server_error",
      error_description: "Internal server error"
    }, 500)
  }
})

// OAuth 2.1 Authorization Endpoint (GET - initial request)
app.get("/oauth/authorize", async (c) => {
  try {
    const config = await loadConfig(true)
    
    if (!config.oauth?.enabled) {
      return c.json({
        error: "oauth_disabled",
        error_description: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable authorization.",
        oauth_enabled: false
      }, 503)
    }

    const authService = new AuthorizationFlowService()
    
    // Extract parameters from query string
    const authRequest = {
      response_type: c.req.query("response_type") || "",
      client_id: c.req.query("client_id") || "",
      redirect_uri: c.req.query("redirect_uri") || "",
      scope: c.req.query("scope"),
      state: c.req.query("state"),
      code_challenge: c.req.query("code_challenge") || "",
      code_challenge_method: c.req.query("code_challenge_method") || "",
      val_town_token: c.req.header("X-Val-Town-Token") || c.req.header("Authorization")?.replace("Bearer ", "") || ""
    }

    console.log("OAuth Authorization Request:", {
      client_id: authRequest.client_id,
      redirect_uri: authRequest.redirect_uri,
      scope: authRequest.scope,
      response_type: authRequest.response_type,
      code_challenge_method: authRequest.code_challenge_method
    })

    if (!authRequest.val_town_token) {
      // Show consent form for user to enter their ValTown API token
      return c.html(`
<!DOCTYPE html>
<html>
<head>
    <title>ValTown MCP Authorization</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; }
        input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; }
        .error { color: #dc3545; font-size: 14px; }
    </style>
</head>
<body>
    <h2>Authorize ValTown MCP Server</h2>
    
    <div class="info">
        <p><strong>Authorization Request:</strong></p>
        <p>Client ID: <code>${authRequest.client_id}</code></p>
        <p>Requested Scopes: <code>${authRequest.scope || 'default'}</code></p>
        <p>Redirect URI: <code>${authRequest.redirect_uri}</code></p>
    </div>
    
    <p>To authorize this application, please enter your ValTown API token:</p>
    
    <form method="post" action="/oauth/authorize">
        <input type="hidden" name="response_type" value="${authRequest.response_type}">
        <input type="hidden" name="client_id" value="${authRequest.client_id}">
        <input type="hidden" name="redirect_uri" value="${authRequest.redirect_uri}">
        <input type="hidden" name="scope" value="${authRequest.scope || ''}">
        <input type="hidden" name="state" value="${authRequest.state || ''}">
        <input type="hidden" name="code_challenge" value="${authRequest.code_challenge}">
        <input type="hidden" name="code_challenge_method" value="${authRequest.code_challenge_method}">
        
        <div class="form-group">
            <label for="val_town_token">ValTown API Token:</label>
            <input type="password" id="val_town_token" name="val_town_token" required 
                   placeholder="Enter your ValTown API token">
            <small>Get your token from <a href="https://www.val.town/settings/api" target="_blank">ValTown Settings</a></small>
        </div>
        
        <button type="submit">Authorize Application</button>
        <button type="button" onclick="window.location.href='${authRequest.redirect_uri}?error=access_denied&state=${authRequest.state || ''}'">
            Cancel
        </button>
    </form>
</body>
</html>`)
    }

    const result = await authService.authorize(authRequest, config.oauth)
    
    if (!result.success) {
      const errorParams = new URLSearchParams({
        error: result.error!.error,
        error_description: result.error!.error_description || ""
      })
      
      if (authRequest.state) {
        errorParams.set("state", authRequest.state)
      }

      const redirectUri = result.redirectUri || authRequest.redirect_uri
      return c.redirect(`${redirectUri}?${errorParams}`, 302)
    }

    // Successful authorization - redirect with code
    const successParams = new URLSearchParams({
      code: result.data!.code
    })
    
    if (result.data!.state) {
      successParams.set("state", result.data!.state)
    }

    return c.redirect(`${authRequest.redirect_uri}?${successParams}`, 302)

  } catch (error) {
    console.error("Authorization endpoint error:", error)
    return c.json({
      error: "server_error",
      error_description: "Internal server error"
    }, 500)
  }
})

// OAuth 2.1 Authorization Endpoint (POST - form submission)
app.post("/oauth/authorize", async (c) => {
  try {
    const config = await loadConfig(true)
    
    if (!config.oauth?.enabled) {
      return c.json({
        error: "oauth_disabled",
        error_description: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable authorization.",
        oauth_enabled: false
      }, 503)
    }

    const authService = new AuthorizationFlowService()
    
    // Extract parameters from form data
    const formData = await c.req.formData()
    const authRequest = {
      response_type: formData.get("response_type")?.toString() || "",
      client_id: formData.get("client_id")?.toString() || "",
      redirect_uri: formData.get("redirect_uri")?.toString() || "",
      scope: formData.get("scope")?.toString(),
      state: formData.get("state")?.toString(),
      code_challenge: formData.get("code_challenge")?.toString() || "",
      code_challenge_method: formData.get("code_challenge_method")?.toString() || "",
      val_town_token: formData.get("val_town_token")?.toString() || ""
    }

    if (!authRequest.val_town_token) {
      const errorParams = new URLSearchParams({
        error: "invalid_request",
        error_description: "ValTown API token is required"
      })
      
      if (authRequest.state) {
        errorParams.set("state", authRequest.state)
      }
      
      return c.redirect(`${authRequest.redirect_uri}?${errorParams}`, 302)
    }

    const result = await authService.authorize(authRequest, config.oauth)
    
    if (!result.success) {
      const errorParams = new URLSearchParams({
        error: result.error!.error,
        error_description: result.error!.error_description || ""
      })
      
      if (authRequest.state) {
        errorParams.set("state", authRequest.state)
      }

      const redirectUri = result.redirectUri || authRequest.redirect_uri
      return c.redirect(`${redirectUri}?${errorParams}`, 302)
    }

    // Successful authorization - redirect with code
    const successParams = new URLSearchParams({
      code: result.data!.code
    })
    
    if (result.data!.state) {
      successParams.set("state", result.data!.state)
    }

    return c.redirect(`${authRequest.redirect_uri}?${successParams}`, 302)

  } catch (error) {
    console.error("Authorization endpoint error:", error)
    return c.json({
      error: "server_error",
      error_description: "Internal server error"
    }, 500)
  }
})

// OAuth 2.1 Token Endpoint
app.post("/oauth/token", async (c) => {
  try {
    const config = await loadConfig(true)
    
    if (!config.oauth?.enabled) {
      return c.json({
        error: "oauth_disabled",
        error_description: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable token endpoint.",
        oauth_enabled: false
      }, 503)
    }

    const authService = new AuthorizationFlowService()
    
    // Handle both JSON and form data (Claude Desktop sends form data)
    let requestBody: any
    const contentType = c.req.header("Content-Type") || ""
    
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await c.req.formData()
      requestBody = {
        grant_type: formData.get("grant_type")?.toString(),
        client_id: formData.get("client_id")?.toString(),
        client_secret: formData.get("client_secret")?.toString(),
        code: formData.get("code")?.toString(),
        redirect_uri: formData.get("redirect_uri")?.toString(),
        code_verifier: formData.get("code_verifier")?.toString(),
        refresh_token: formData.get("refresh_token")?.toString(),
        scope: formData.get("scope")?.toString()
      }
    } else {
      requestBody = await c.req.json()
    }
    
    console.log("OAuth Token Request:", {
      content_type: contentType,
      grant_type: requestBody.grant_type,
      client_id: requestBody.client_id,
      code: requestBody.code ? "present" : "missing",
      redirect_uri: requestBody.redirect_uri,
      code_verifier: requestBody.code_verifier ? "present" : "missing"
    })
    
    const result = await authService.exchangeToken(requestBody, config.oauth)
    
    if (!result.success) {
      return c.json(result.error, 400)
    }

    return c.json(result.data)

  } catch (error) {
    console.error("Token endpoint error:", error)
    return c.json({
      error: "server_error",
      error_description: "Internal server error"
    }, 500)
  }
})

// OAuth 2.1 Token Revocation Endpoint
app.post("/oauth/revoke", async (c) => {
  try {
    const config = await loadConfig(true)
    
    if (!config.oauth?.enabled) {
      return c.json({
        error: "oauth_disabled",
        error_description: "OAuth is currently disabled. Set OAUTH_ENABLED=false to disable token revocation.",
        oauth_enabled: false
      }, 503)
    }

    const authService = new AuthorizationFlowService()
    const requestBody = await c.req.json()
    
    if (!requestBody.token) {
      return c.json({
        error: "invalid_request",
        error_description: "Missing token parameter"
      }, 400)
    }

    const result = await authService.revokeToken(requestBody.token)
    
    // OAuth spec says to return 200 even if token doesn't exist
    return c.text("", 200)

  } catch (error) {
    console.error("Token revocation error:", error)
    return c.text("", 200) // Still return success per OAuth spec
  }
})

// Handle MCP requests
app.post("/mcp", async (c) => {
  try {
    // Extract API token from headers
    const apiToken = c.req.header("X-Val-Town-Token") ||
      c.req.header("Authorization")?.replace("Bearer ", "")

    if (!apiToken) {
      return c.json({
        jsonrpc: "2.0",
        error: {code: -32000, message: "Missing API token in X-Val-Town-Token header or Authorization header"},
        id: null
      }, 401)
    }

    // Load remote configuration
    const config = await loadConfig(true)
    config.apiToken = apiToken
    // Convert Hono request to Node.js-style req/res
    const {req, res} = toReqRes(c.req.raw)

    // Create streamable HTTP transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })

    // Create MCP server instance
    const server = new McpServer({
      name: "val-town-remote",
      version: "1.0.0",
    })

    // Register tools (exclude CLI-dependent tools)
    registerTools(server, config, {excludeCli: true})
    registerPromptsTools(server, config)

    // Connect server to transport
    await server.connect(transport)

    // Handle the MCP request using streamable transport
    let requestBody
    try {
      requestBody = await c.req.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return c.json({
          jsonrpc: "2.0",
          error: {code: -32700, message: "Parse error"},
          id: null
        }, 400)
      }
      throw error
    }

    await transport.handleRequest(req, res, requestBody)

    // Clean up on close
    res.on('close', () => {
      console.log('closing request')
      transport.close()
      server.close()
    })

    // Convert Node.js response back to Fetch response
    return toFetchResponse(res)

  } catch (error) {
    console.error("Error handling MCP request:", error)

    return c.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error"
      },
      id: null,
    }, 500)
  }
})

app.get("/mcp", (c) => {
  console.log("Received GET MCP request - not supported in stateless mode")
  return c.json({
    jsonrpc: "2.0",
    id: null,
  }, 200)
})

export default app.fetch