import { Context } from "npm:hono";
import { Config } from "../types.ts";
import { TokenValidationService } from "./tokenValidation.ts";

export interface AuthContext {
  valTownToken: string;
  clientId?: string;
  scope?: string;
  authMethod: 'legacy' | 'oauth';
}

export class AuthMiddleware {
  private tokenValidator: TokenValidationService;

  constructor() {
    this.tokenValidator = new TokenValidationService();
  }

  async extractAuthContext(c: Context, config: Config): Promise<{ success: boolean; auth?: AuthContext; error?: string }> {
    // Try OAuth first if enabled
    if (config.oauth?.enabled) {
      const authHeader = c.req.header("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const validationResult = await this.tokenValidator.validateBearerToken(authHeader, config.oauth);
        
        if (validationResult.isValid) {
          return {
            success: true,
            auth: {
              valTownToken: validationResult.valTownToken!,
              clientId: validationResult.clientId,
              scope: validationResult.scope,
              authMethod: 'oauth'
            }
          };
        } else {
          return {
            success: false,
            error: `OAuth validation failed: ${validationResult.error}`
          };
        }
      }
    }

    // Fallback to legacy authentication
    const legacyToken = c.req.header("X-Val-Town-Token") ||
      c.req.header("Authorization")?.replace("Bearer ", "");

    if (!legacyToken) {
      return {
        success: false,
        error: "Missing authentication token"
      };
    }

    return {
      success: true,
      auth: {
        valTownToken: legacyToken,
        authMethod: 'legacy'
      }
    };
  }

  validateToolAccess(toolName: string, authContext: AuthContext): boolean {
    // Legacy authentication has full access (backward compatibility)
    if (authContext.authMethod === 'legacy') {
      return true;
    }

    // OAuth authentication requires scope validation
    if (authContext.authMethod === 'oauth') {
      const requiredScopes = this.tokenValidator.getRequiredScopesForTool(toolName);
      return this.tokenValidator.validateScope(requiredScopes, authContext.scope);
    }

    return false;
  }

  createScopeAwareConfig(config: Config, authContext: AuthContext): Config {
    // Return config with the validated ValTown token
    return {
      ...config,
      apiToken: authContext.valTownToken
    };
  }

  generateUnauthorizedResponse(toolName: string, requiredScopes: string[]) {
    return {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Insufficient scope",
        data: {
          required_scopes: requiredScopes,
          tool: toolName,
          description: `Access to '${toolName}' requires one of the following scopes: ${requiredScopes.join(', ')}`
        }
      },
      id: null
    };
  }
}