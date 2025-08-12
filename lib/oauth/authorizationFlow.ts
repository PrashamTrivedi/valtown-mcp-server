import { OAuthConfig, AuthorizationCode, AccessToken, OAuthError, OAuthTokenResponse } from "../types.ts";
import { generateRandomString, verifyCodeChallenge, generateJWT } from "./crypto.ts";
import { OAuthStorage } from "./storage.ts";
import { ClientRegistrationService } from "./clientRegistration.ts";

export interface AuthorizeRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: string;
  val_town_token: string; // ValTown API token from user
}

export interface AuthorizeResponse {
  code: string;
  state?: string;
}

export interface TokenRequest {
  grant_type: string;
  client_id: string;
  client_secret?: string;
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
  scope?: string;
}

export class AuthorizationFlowService {
  private storage: OAuthStorage;
  private clientService: ClientRegistrationService;

  constructor() {
    this.storage = new OAuthStorage();
    this.clientService = new ClientRegistrationService();
  }

  async authorize(request: AuthorizeRequest, config: OAuthConfig): Promise<{ success: boolean; data?: AuthorizeResponse; error?: OAuthError; redirectUri?: string }> {
    try {
      // Validate response_type
      if (request.response_type !== "code") {
        return {
          success: false,
          error: {
            error: "unsupported_response_type",
            error_description: "Only 'code' response type is supported"
          }
        };
      }

      // Validate code_challenge_method
      if (request.code_challenge_method !== "S256") {
        return {
          success: false,
          error: {
            error: "invalid_request",
            error_description: "Only S256 code challenge method is supported"
          }
        };
      }

      // Validate client
      const clientResult = await this.clientService.getClient(request.client_id);
      if (!clientResult.success || !clientResult.data) {
        return {
          success: false,
          error: {
            error: "invalid_client",
            error_description: "Invalid client_id"
          }
        };
      }

      const client = clientResult.data;

      // Validate redirect_uri
      if (!client.redirectUris.includes(request.redirect_uri)) {
        return {
          success: false,
          error: {
            error: "invalid_redirect_uri",
            error_description: "redirect_uri not registered for this client"
          }
        };
      }

      // Validate scope
      const requestedScopes = request.scope?.split(" ") || ["read"];
      for (const scope of requestedScopes) {
        if (!client.scopes.includes(scope)) {
          return {
            success: false,
            error: {
              error: "invalid_scope",
              error_description: `Scope '${scope}' not allowed for this client`
            },
            redirectUri: request.redirect_uri
          };
        }
      }

      // TODO: In a real implementation, this would redirect to a user consent page
      // For now, we automatically approve the authorization
      
      // Generate authorization code
      const authCode = generateRandomString(32);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const authorizationCode: AuthorizationCode = {
        code: authCode,
        clientId: request.client_id,
        redirectUri: request.redirect_uri,
        scope: requestedScopes.join(" "),
        codeChallenge: request.code_challenge,
        codeChallengeMethod: request.code_challenge_method,
        expiresAt,
        valTownToken: request.val_town_token
      };

      // Store authorization code
      const storeResult = await this.storage.storeAuthorizationCode(authorizationCode);
      if (!storeResult.success) {
        return {
          success: false,
          error: {
            error: "server_error",
            error_description: storeResult.error || "Failed to store authorization code"
          },
          redirectUri: request.redirect_uri
        };
      }

      return {
        success: true,
        data: {
          code: authCode,
          state: request.state
        }
      };

    } catch (error) {
      console.error("Authorization error:", error);
      return {
        success: false,
        error: {
          error: "server_error",
          error_description: "Internal server error"
        }
      };
    }
  }

  async exchangeToken(request: TokenRequest, config: OAuthConfig): Promise<{ success: boolean; data?: OAuthTokenResponse; error?: OAuthError }> {
    try {
      if (request.grant_type === "authorization_code") {
        return await this.exchangeAuthorizationCode(request, config);
      } else if (request.grant_type === "refresh_token") {
        return await this.refreshAccessToken(request, config);
      } else {
        return {
          success: false,
          error: {
            error: "unsupported_grant_type",
            error_description: `Grant type '${request.grant_type}' is not supported`
          }
        };
      }
    } catch (error) {
      console.error("Token exchange error:", error);
      return {
        success: false,
        error: {
          error: "server_error",
          error_description: "Internal server error"
        }
      };
    }
  }

  private async exchangeAuthorizationCode(request: TokenRequest, config: OAuthConfig): Promise<{ success: boolean; data?: OAuthTokenResponse; error?: OAuthError }> {
    // Validate required parameters
    if (!request.code || !request.redirect_uri || !request.code_verifier) {
      return {
        success: false,
        error: {
          error: "invalid_request",
          error_description: "Missing required parameters: code, redirect_uri, code_verifier"
        }
      };
    }

    // Validate client
    const clientResult = await this.clientService.getClient(request.client_id);
    if (!clientResult.success || !clientResult.data) {
      return {
        success: false,
        error: {
          error: "invalid_client",
          error_description: "Invalid client_id"
        }
      };
    }

    const client = clientResult.data;

    // Validate client authentication if required
    if (client.tokenEndpointAuthMethod === "client_secret_basic" || client.tokenEndpointAuthMethod === "client_secret_post") {
      if (!request.client_secret || request.client_secret !== client.clientSecret) {
        return {
          success: false,
          error: {
            error: "invalid_client",
            error_description: "Invalid client credentials"
          }
        };
      }
    }

    // Get and validate authorization code
    const codeResult = await this.storage.getAuthorizationCode(request.code);
    if (!codeResult.success || !codeResult.data) {
      return {
        success: false,
        error: {
          error: "invalid_grant",
          error_description: "Invalid or expired authorization code"
        }
      };
    }

    const authCode = codeResult.data;

    // Validate code ownership and redirect_uri
    if (authCode.clientId !== request.client_id || authCode.redirectUri !== request.redirect_uri) {
      await this.storage.deleteAuthorizationCode(request.code);
      return {
        success: false,
        error: {
          error: "invalid_grant",
          error_description: "Authorization code does not match client or redirect URI"
        }
      };
    }

    // Verify PKCE challenge
    const challengeValid = await verifyCodeChallenge(request.code_verifier, authCode.codeChallenge);
    if (!challengeValid) {
      await this.storage.deleteAuthorizationCode(request.code);
      return {
        success: false,
        error: {
          error: "invalid_grant",
          error_description: "Invalid code verifier"
        }
      };
    }

    // Generate tokens
    const accessToken = generateRandomString(64);
    const refreshToken = generateRandomString(64);
    const expiresAt = new Date(Date.now() + config.accessTokenTtl * 1000);

    // Generate JWT with ValTown token embedded
    const jwtPayload = {
      sub: authCode.clientId,
      scope: authCode.scope,
      val_town_token: authCode.valTownToken,
      client_id: authCode.clientId,
      token_use: "access"
    };

    const jwtToken = await generateJWT(jwtPayload, config);

    // Store access token
    const tokenData: AccessToken = {
      token: jwtToken,
      clientId: request.client_id,
      scope: authCode.scope,
      expiresAt,
      valTownToken: authCode.valTownToken,
      refreshToken
    };

    const storeResult = await this.storage.storeAccessToken(tokenData);
    if (!storeResult.success) {
      return {
        success: false,
        error: {
          error: "server_error",
          error_description: "Failed to store access token"
        }
      };
    }

    // Delete used authorization code
    await this.storage.deleteAuthorizationCode(request.code);

    return {
      success: true,
      data: {
        access_token: jwtToken,
        token_type: "Bearer",
        expires_in: config.accessTokenTtl,
        refresh_token: refreshToken,
        scope: authCode.scope
      }
    };
  }

  private async refreshAccessToken(request: TokenRequest, config: OAuthConfig): Promise<{ success: boolean; data?: OAuthTokenResponse; error?: OAuthError }> {
    if (!request.refresh_token) {
      return {
        success: false,
        error: {
          error: "invalid_request",
          error_description: "Missing refresh_token parameter"
        }
      };
    }

    // Get existing token by refresh token
    const tokenResult = await this.storage.getAccessTokenByRefresh(request.refresh_token);
    if (!tokenResult.success || !tokenResult.data) {
      return {
        success: false,
        error: {
          error: "invalid_grant",
          error_description: "Invalid refresh token"
        }
      };
    }

    const existingToken = tokenResult.data;

    // Validate client
    if (existingToken.clientId !== request.client_id) {
      return {
        success: false,
        error: {
          error: "invalid_grant",
          error_description: "Refresh token does not belong to this client"
        }
      };
    }

    // Generate new access token
    const newAccessToken = generateRandomString(64);
    const newRefreshToken = generateRandomString(64);
    const expiresAt = new Date(Date.now() + config.accessTokenTtl * 1000);

    const jwtPayload = {
      sub: existingToken.clientId,
      scope: existingToken.scope,
      val_town_token: existingToken.valTownToken,
      client_id: existingToken.clientId,
      token_use: "access"
    };

    const jwtToken = await generateJWT(jwtPayload, config);

    // Store new access token
    const tokenData: AccessToken = {
      token: jwtToken,
      clientId: existingToken.clientId,
      scope: existingToken.scope,
      expiresAt,
      valTownToken: existingToken.valTownToken,
      refreshToken: newRefreshToken
    };

    const storeResult = await this.storage.storeAccessToken(tokenData);
    if (!storeResult.success) {
      return {
        success: false,
        error: {
          error: "server_error",
          error_description: "Failed to store new access token"
        }
      };
    }

    // Revoke old tokens
    await this.storage.revokeToken(existingToken.token);

    return {
      success: true,
      data: {
        access_token: jwtToken,
        token_type: "Bearer",
        expires_in: config.accessTokenTtl,
        refresh_token: newRefreshToken,
        scope: existingToken.scope
      }
    };
  }

  async revokeToken(token: string): Promise<{ success: boolean; error?: string }> {
    return await this.storage.revokeToken(token);
  }
}