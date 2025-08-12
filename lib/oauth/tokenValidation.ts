import { OAuthConfig } from "../types.ts";
import { verifyJWT } from "./crypto.ts";
import { OAuthStorage } from "./storage.ts";

export interface TokenValidationResult {
  isValid: boolean;
  valTownToken?: string;
  clientId?: string;
  scope?: string;
  error?: string;
}

export class TokenValidationService {
  private storage: OAuthStorage;

  constructor() {
    this.storage = new OAuthStorage();
  }

  async validateBearerToken(authHeader: string, config: OAuthConfig): Promise<TokenValidationResult> {
    try {
      // Extract token from Authorization header
      if (!authHeader.startsWith("Bearer ")) {
        return {
          isValid: false,
          error: "Invalid Authorization header format"
        };
      }

      const token = authHeader.substring(7);

      // Verify JWT signature and get payload
      let payload;
      try {
        payload = await verifyJWT(token, config);
      } catch (error) {
        return {
          isValid: false,
          error: `JWT validation failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }

      // Check if token exists in storage (not revoked)
      const tokenResult = await this.storage.getAccessToken(token);
      if (!tokenResult.success || !tokenResult.data) {
        return {
          isValid: false,
          error: "Token not found or revoked"
        };
      }

      const storedToken = tokenResult.data;

      // Validate token hasn't expired
      if (storedToken.expiresAt < new Date()) {
        return {
          isValid: false,
          error: "Token expired"
        };
      }

      // Validate JWT claims match stored token
      if (payload.client_id !== storedToken.clientId) {
        return {
          isValid: false,
          error: "Token client_id mismatch"
        };
      }

      // Check audience (should match the issuer URL)
      if (payload.iss !== config.issuerUrl) {
        return {
          isValid: false,
          error: "Invalid token issuer"
        };
      }

      return {
        isValid: true,
        valTownToken: storedToken.valTownToken,
        clientId: storedToken.clientId,
        scope: storedToken.scope
      };

    } catch (error) {
      console.error("Token validation error:", error);
      return {
        isValid: false,
        error: "Internal token validation error"
      };
    }
  }

  validateScope(requiredScopes: string[], tokenScope?: string): boolean {
    if (!tokenScope) return false;
    
    const grantedScopes = tokenScope.split(" ");
    
    // Check if all required scopes are granted
    for (const requiredScope of requiredScopes) {
      if (!grantedScopes.includes(requiredScope)) {
        return false;
      }
    }
    
    return true;
  }

  // Scope-based authorization for different tool categories
  getRequiredScopesForTool(toolName: string): string[] {
    const scopeMap: Record<string, string[]> = {
      // Val tools
      'get-val': ['vals:read', 'read'],
      'search-vals': ['vals:read', 'read'],
      'create-val': ['vals:write', 'write'],
      'delete-val': ['vals:delete', 'admin'],
      
      // File tools
      'get-file': ['files:read', 'read'],
      'list-files': ['files:read', 'read'],
      'create-file-or-directory': ['files:write', 'write'],
      'update-file': ['files:write', 'write'],
      'delete-file-or-directory': ['files:delete', 'admin'],
      
      // Blob tools
      'get-blob': ['blobs:read', 'read'],
      'list-blobs': ['blobs:read', 'read'],
      'store-blob': ['blobs:write', 'write'],
      'delete-blob': ['blobs:delete', 'admin'],
      
      // SQLite tools
      'sqlite-query': ['sqlite:read', 'read'],
      'execute-sql': ['sqlite:write', 'write'],
      'sqlite-exec': ['sqlite:write', 'write'],
      
      // User tools
      'get-user': ['read'],
      'get-my-info': ['read'],
      
      // Project tools
      'create-project-from-template': ['write'],
      'sync-project': ['write'],
      
      // Branch tools
      'list-branches': ['read'],
      'get-branch': ['read'],
      'create-branch': ['write'],
      'delete-branch': ['admin']
    };
    
    return scopeMap[toolName] || ['admin']; // Default to admin scope if unknown
  }
}