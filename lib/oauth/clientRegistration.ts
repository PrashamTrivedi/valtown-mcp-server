import { OAuthClient, OAuthError } from "../types.ts";
import { generateRandomString } from "./crypto.ts";
import { OAuthStorage } from "./storage.ts";

export interface ClientRegistrationRequest {
  redirect_uris: string[];
  client_id?: string; // Allow custom client_id for auto-registration
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  scope?: string;
  contacts?: string[];
  tos_uri?: string;
  policy_uri?: string;
  jwks_uri?: string;
  software_id?: string;
  software_version?: string;
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
}

export interface ClientRegistrationResponse {
  client_id: string;
  client_secret?: string;
  client_id_issued_at?: number;
  client_secret_expires_at?: number;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  scope?: string;
  contacts?: string[];
  tos_uri?: string;
  policy_uri?: string;
  jwks_uri?: string;
  token_endpoint_auth_method: string;
  software_id?: string;
  software_version?: string;
}

export class ClientRegistrationService {
  private storage: OAuthStorage;

  constructor() {
    this.storage = new OAuthStorage();
  }

  async registerClient(request: ClientRegistrationRequest): Promise<{ success: boolean; data?: ClientRegistrationResponse; error?: OAuthError }> {
    try {
      // Validate required fields
      if (!request.redirect_uris || request.redirect_uris.length === 0) {
        return {
          success: false,
          error: {
            error: "invalid_redirect_uri",
            error_description: "redirect_uris is required and must be a non-empty array"
          }
        };
      }

      // Validate redirect URIs
      for (const uri of request.redirect_uris) {
        if (!this.isValidRedirectUri(uri)) {
          return {
            success: false,
            error: {
              error: "invalid_redirect_uri",
              error_description: `Invalid redirect URI: ${uri}`
            }
          };
        }
      }

      // Generate client credentials
      const clientId = request.client_id || generateRandomString(32);
      const tokenEndpointAuthMethod = request.token_endpoint_auth_method || "client_secret_basic";
      let clientSecret: string | undefined;

      if (tokenEndpointAuthMethod !== "none") {
        clientSecret = generateRandomString(64);
      }

      // Set default values
      const grantTypes = request.grant_types || ["authorization_code"];
      const responseTypes = request.response_types || ["code"];
      const scopes = request.scope && request.scope.trim() ? request.scope.split(" ") : ["read"];

      // Validate grant types
      const supportedGrantTypes = ["authorization_code", "refresh_token"];
      for (const grantType of grantTypes) {
        if (!supportedGrantTypes.includes(grantType)) {
          return {
            success: false,
            error: {
              error: "invalid_grant_type",
              error_description: `Unsupported grant type: ${grantType}`
            }
          };
        }
      }

      // Validate response types
      const supportedResponseTypes = ["code"];
      for (const responseType of responseTypes) {
        if (!supportedResponseTypes.includes(responseType)) {
          return {
            success: false,
            error: {
              error: "invalid_response_type",
              error_description: `Unsupported response type: ${responseType}`
            }
          };
        }
      }

      // Create client
      const now = new Date();
      const client: OAuthClient = {
        clientId,
        clientSecret,
        redirectUris: request.redirect_uris,
        scopes,
        grantTypes,
        tokenEndpointAuthMethod,
        createdAt: now,
        updatedAt: now
      };

      // Store client
      const storeResult = await this.storage.storeClient(client);
      if (!storeResult.success) {
        return {
          success: false,
          error: {
            error: "server_error",
            error_description: storeResult.error || "Failed to store client"
          }
        };
      }

      // Return registration response
      const response: ClientRegistrationResponse = {
        client_id: clientId,
        client_secret: clientSecret,
        client_id_issued_at: Math.floor(now.getTime() / 1000),
        redirect_uris: request.redirect_uris,
        grant_types: grantTypes,
        response_types: responseTypes,
        token_endpoint_auth_method: tokenEndpointAuthMethod,
        scope: scopes.join(" "),
        client_name: request.client_name,
        client_uri: request.client_uri,
        logo_uri: request.logo_uri,
        contacts: request.contacts,
        tos_uri: request.tos_uri,
        policy_uri: request.policy_uri,
        jwks_uri: request.jwks_uri,
        software_id: request.software_id,
        software_version: request.software_version
      };

      return { success: true, data: response };

    } catch (error) {
      console.error("Client registration error:", error);
      return {
        success: false,
        error: {
          error: "server_error",
          error_description: "Internal server error during client registration"
        }
      };
    }
  }

  async getClient(clientId: string): Promise<{ success: boolean; data?: OAuthClient; error?: string }> {
    return await this.storage.getClient(clientId);
  }

  async deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    return await this.storage.deleteClient(clientId);
  }

  private isValidRedirectUri(uri: string): boolean {
    try {
      const url = new URL(uri);
      
      // Must be HTTPS or localhost for security
      if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        return false;
      }

      // Must not contain fragments
      if (url.hash) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}