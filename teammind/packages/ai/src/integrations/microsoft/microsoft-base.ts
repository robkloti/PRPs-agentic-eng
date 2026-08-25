import { MicrosoftApiError, MicrosoftTokenResponse } from '../../types';

export class MicrosoftBase {
  protected readonly baseUrl: string;
  protected readonly authUrl =
    'https://login.microsoftonline.com/common/oauth2/v2.0';
  protected accessToken: string;
  protected refreshToken: string;

  constructor(accessToken: string, refreshToken: string, baseUrl: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.baseUrl = baseUrl;
  }

  public async refreshAccessToken(refreshToken: string) {
    const response = await fetch(`${this.authUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      await this.handleError(response);
    }
    return (await response.json()) as MicrosoftTokenResponse;
  }

  protected async makeRequest<T>(url: URL, options?: RequestInit): Promise<T> {
    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      const newToken = await this.refreshAccessToken(this.refreshToken);
      if (newToken) {
        this.accessToken = newToken.access_token;
        this.refreshToken = newToken.refresh_token;
        return this.makeRequest(url, options);
      }
    }

    if (!response.ok) {
      await this.handleError(response);
    }
    return response.json() as Promise<T>;
  }

  protected async handleError(response: Response): Promise<void> {
    const errorResponse = (await response.json()) as MicrosoftApiError;
    console.error('Microsoft API request failed:', errorResponse);
    throw new Error(
      `Microsoft API request failed: ${response.statusText} (${response.status}) - ${errorResponse.error.message}`,
    );
  }
}
