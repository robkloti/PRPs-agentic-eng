import {
  MicrosoftApiError,
  MicrosoftProfileMetaData,
  MicrosoftScopes,
  MicrosoftTokenResponse,
} from '../../types/microsoft';
import { MicrosoftBase } from './microsoft-base';
import { MicrosoftProfile } from './microsoft-profile';
import { MicrosoftSite } from './microsoft-site';
import { MICROSOFT_PROFILE_SELECTS, SITES_SELECTS } from './variables';

export class MicrosoftApi extends MicrosoftBase {
  private static readonly authUrl =
    'https://login.microsoftonline.com/common/oauth2/v2.0';
  private static readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(accessToken: string, refreshToken: string) {
    super(accessToken, refreshToken, MicrosoftApi.baseUrl);
  }

  public static getAuthUrl(scopes: MicrosoftScopes[], state: string) {
    const searchParams = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      scope: scopes.join(' '),
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/microsoft/auth-callback`,
      state,
      response_type: 'code',
      response_mode: 'query',
      prompt: 'consent',
    });

    return `${this.authUrl}/authorize?${searchParams.toString()}`;
  }

  public static async getToken(code: string) {
    const response = await fetch(`${MicrosoftApi.authUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/microsoft/auth-callback`,
      }).toString(),
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    return (await response.json()) as MicrosoftTokenResponse;
  }

  public async getProfile() {
    const url = new URL(
      `${this.baseUrl}/me/?$select=${MICROSOFT_PROFILE_SELECTS}`,
    );

    const profile = await this.makeRequest<MicrosoftProfileMetaData>(url);
    if (!profile) {
      return null;
    }
    return new MicrosoftProfile(
      profile,
      this.accessToken,
      this.refreshToken,
      `${this.baseUrl}/me`,
    );
  }

  public async getRootSite() {
    const url = new URL(`${this.baseUrl}/sites/root?$select=${SITES_SELECTS}`);
    const site = await this.makeRequest<MicrosoftSite>(url);
    if (!site) {
      return null;
    }
    return new MicrosoftSite(
      site,
      this.accessToken,
      this.refreshToken,
      `${this.baseUrl}/sites/root`,
    );
  }

  public async getSites(): Promise<MicrosoftSite[]> {
    const url = new URL(
      `${this.baseUrl}/sites?search=*&$select=${SITES_SELECTS}`,
    );
    const sites = await this.makeRequest<{ value: MicrosoftSite[] }>(url);

    return (
      sites?.value?.map(
        (site) =>
          new MicrosoftSite(
            site,
            this.accessToken,
            this.refreshToken,
            `${this.baseUrl}/sites/${site.id}`,
          ),
      ) || []
    );
  }

  public async getSiteById(siteId: string): Promise<MicrosoftSite | null> {
    const url = new URL(
      `${this.baseUrl}/sites/${siteId}?$select=${SITES_SELECTS}`,
    );
    const site = await this.makeRequest<MicrosoftSite>(url);

    if (!site) {
      return null;
    }
    return new MicrosoftSite(
      site,
      this.accessToken,
      this.refreshToken,
      `${this.baseUrl}/sites/${siteId}`,
    );
  }

  protected static async handleError(response: Response): Promise<void> {
    const errorResponse = (await response.json()) as MicrosoftApiError;
    console.error('Microsoft API request failed:', errorResponse);
    throw new Error(
      `Microsoft API request failed: ${response.statusText} (${response.status}) - ${errorResponse.error.message}`,
    );
  }
}
