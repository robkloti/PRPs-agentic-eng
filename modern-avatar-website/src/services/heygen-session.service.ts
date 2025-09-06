import { SessionToken } from '../types/provider';
import { PROVIDER_CONFIGS } from '../config/env';

export class HeyGenSessionManager {
  private apiKey: string;
  private baseUrl: string;
  private tokenCache: SessionToken | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = PROVIDER_CONFIGS.heygen.baseUrl;
  }

  async getSessionToken(forceRefresh: boolean = false): Promise<string> {
    if (!forceRefresh && this.tokenCache && !this.isTokenExpired(this.tokenCache)) {
      return this.tokenCache.token;
    }

    try {
      const response = await fetch(`${this.baseUrl}${PROVIDER_CONFIGS.heygen.endpoints.createToken}`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Token creation failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data?.token) {
        throw new Error('Invalid token response format');
      }

      this.tokenCache = {
        token: data.data.token,
        expiresAt: new Date(Date.now() + PROVIDER_CONFIGS.heygen.tokenRefreshInterval)
      };

      // Schedule automatic refresh
      this.scheduleTokenRefresh();

      return this.tokenCache.token;
    } catch (error) {
      console.error('HeyGen token creation error:', error);
      throw new Error(`Failed to create HeyGen session token: ${(error as Error).message}`);
    }
  }

  isTokenValid(): boolean {
    return this.tokenCache !== null && !this.isTokenExpired(this.tokenCache);
  }

  getTokenExpirationTime(): Date | null {
    return this.tokenCache?.expiresAt || null;
  }

  private isTokenExpired(token: SessionToken): boolean {
    // Add 1 minute buffer before actual expiration
    const bufferTime = 60 * 1000; // 1 minute
    return new Date(Date.now() + bufferTime) >= token.expiresAt;
  }

  private scheduleTokenRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokenCache) return;

    // Schedule refresh 1 minute before expiration
    const refreshTime = this.tokenCache.expiresAt.getTime() - Date.now() - (60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.getSessionToken(true);
          console.log('HeyGen token auto-refreshed successfully');
        } catch (error) {
          console.error('Auto token refresh failed:', error);
        }
      }, refreshTime);
    }
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.tokenCache = null;
  }
}

// Singleton instance for global token management
let globalSessionManager: HeyGenSessionManager | null = null;

export function getHeyGenSessionManager(apiKey: string): HeyGenSessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new HeyGenSessionManager(apiKey);
  }
  return globalSessionManager;
}

export function destroyHeyGenSessionManager(): void {
  if (globalSessionManager) {
    globalSessionManager.destroy();
    globalSessionManager = null;
  }
}