import { OAuthClient, AuthorizationCode, AccessToken } from "../types.ts";
import { getErrorMessage } from "../errorUtils.ts";

class OAuthMemoryStorage {
  private clients: Map<string, OAuthClient> = new Map();
  private authorizationCodes: Map<string, AuthorizationCode> = new Map();
  private accessTokens: Map<string, AccessToken> = new Map();
  private refreshTokens: Map<string, AccessToken> = new Map();

  async storeClient(client: OAuthClient): Promise<void> {
    this.clients.set(client.clientId, client);
  }

  async getClient(clientId: string): Promise<OAuthClient | null> {
    return this.clients.get(clientId) || null;
  }

  async deleteClient(clientId: string): Promise<boolean> {
    return this.clients.delete(clientId);
  }

  async storeAuthorizationCode(code: AuthorizationCode): Promise<void> {
    this.authorizationCodes.set(code.code, code);
    
    setTimeout(() => {
      this.authorizationCodes.delete(code.code);
    }, 10 * 60 * 1000);
  }

  async getAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
    const authCode = this.authorizationCodes.get(code);
    if (!authCode) return null;
    
    if (authCode.expiresAt < new Date()) {
      this.authorizationCodes.delete(code);
      return null;
    }
    
    return authCode;
  }

  async deleteAuthorizationCode(code: string): Promise<boolean> {
    return this.authorizationCodes.delete(code);
  }

  async storeAccessToken(token: AccessToken): Promise<void> {
    this.accessTokens.set(token.token, token);
    
    if (token.refreshToken) {
      this.refreshTokens.set(token.refreshToken, token);
    }
    
    setTimeout(() => {
      this.accessTokens.delete(token.token);
      if (token.refreshToken) {
        this.refreshTokens.delete(token.refreshToken);
      }
    }, (token.expiresAt.getTime() - Date.now()));
  }

  async getAccessToken(token: string): Promise<AccessToken | null> {
    const accessToken = this.accessTokens.get(token);
    if (!accessToken) return null;
    
    if (accessToken.expiresAt < new Date()) {
      this.accessTokens.delete(token);
      if (accessToken.refreshToken) {
        this.refreshTokens.delete(accessToken.refreshToken);
      }
      return null;
    }
    
    return accessToken;
  }

  async getAccessTokenByRefresh(refreshToken: string): Promise<AccessToken | null> {
    return this.refreshTokens.get(refreshToken) || null;
  }

  async revokeToken(token: string): Promise<boolean> {
    const accessToken = this.accessTokens.get(token);
    if (accessToken) {
      this.accessTokens.delete(token);
      if (accessToken.refreshToken) {
        this.refreshTokens.delete(accessToken.refreshToken);
      }
      return true;
    }
    
    const refreshAccessToken = this.refreshTokens.get(token);
    if (refreshAccessToken) {
      this.accessTokens.delete(refreshAccessToken.token);
      this.refreshTokens.delete(token);
      return true;
    }
    
    return false;
  }
}

export class OAuthStorage {
  private storage = new OAuthMemoryStorage();

  async storeClient(client: OAuthClient): Promise<{ success: boolean; error?: string }> {
    try {
      await this.storage.storeClient(client);
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getClient(clientId: string): Promise<{ success: boolean; data?: OAuthClient; error?: string }> {
    try {
      const client = await this.storage.getClient(clientId);
      return { success: true, data: client || undefined };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleted = await this.storage.deleteClient(clientId);
      return { success: deleted };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async storeAuthorizationCode(code: AuthorizationCode): Promise<{ success: boolean; error?: string }> {
    try {
      await this.storage.storeAuthorizationCode(code);
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getAuthorizationCode(code: string): Promise<{ success: boolean; data?: AuthorizationCode; error?: string }> {
    try {
      const authCode = await this.storage.getAuthorizationCode(code);
      return { success: true, data: authCode || undefined };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async deleteAuthorizationCode(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleted = await this.storage.deleteAuthorizationCode(code);
      return { success: deleted };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async storeAccessToken(token: AccessToken): Promise<{ success: boolean; error?: string }> {
    try {
      await this.storage.storeAccessToken(token);
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getAccessToken(token: string): Promise<{ success: boolean; data?: AccessToken; error?: string }> {
    try {
      const accessToken = await this.storage.getAccessToken(token);
      return { success: true, data: accessToken || undefined };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getAccessTokenByRefresh(refreshToken: string): Promise<{ success: boolean; data?: AccessToken; error?: string }> {
    try {
      const accessToken = await this.storage.getAccessTokenByRefresh(refreshToken);
      return { success: true, data: accessToken || undefined };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async revokeToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const revoked = await this.storage.revokeToken(token);
      return { success: revoked };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }
}