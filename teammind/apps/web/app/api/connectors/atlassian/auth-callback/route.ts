import { redirect } from 'next/navigation';

import { type HandlerParams, enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { Database } from '~/lib/database.types';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

type AtlassianScope =
  | 'read:jira-work'
  | 'read:project:jira'
  | 'write:jira-work'
  | 'read:board-scope:jira-software'
  | 'read:content-details:confluence'
  | 'read:page:confluence'
  | 'write:confluence-content'
  | 'read:confluence-user'
  | 'read:confluence-space.summary'
  | 'write:page:confluence'
  | 'read:confluence-content.all';

interface AccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes: AtlassianScope[];
  avatarUrl: string;
}

interface ConfluenceUser {
  account_id: string;
  email: string;
  display_name: string;
}

type AtlassianConfigInsert =
  Database['public']['Tables']['atlassian_config']['Insert'];

const supabase = getSupabaseServerClient({ admin: true });

export const GET = enhanceRouteHandler(
  async ({ request }: HandlerParams<undefined, true>) => {
    // Extract state parameter
    const { searchParams } = new URL(request.url);
    const stateStr = searchParams.get('state');

    if (!stateStr) {
      console.error('No state parameter received');
      return redirect('/home?error=no_state');
    }

    let state: { userId: string; accountSlug: string };
    try {
      state = JSON.parse(stateStr);
    } catch (e) {
      console.error('Invalid state parameter:', e);
      return redirect('/home?error=invalid_state');
    }

    if (!state.userId || !state.accountSlug) {
      console.error('Invalid state parameter structure');
      return redirect('/home?error=invalid_state');
    }

    const { userId, accountSlug } = state;
    let redirectUrl = `/home/${accountSlug}/settings/connect?error=oauth_failed`;

    try {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const error_description = searchParams.get('error_description');

      // Handle OAuth errors
      if (error ?? !code) {
        console.error('OAuth error:', error, error_description);
        return redirect(redirectUrl);
      }

      // Exchange code for access token
      const tokenResponse = await fetch(
        'https://auth.atlassian.com/oauth/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: process.env.ATLASSIAN_CLIENT_ID,
            client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
            code,
            redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/atlassian/auth-callback`,
          }),
        },
      );

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = (await tokenResponse.json()) as TokenResponse;

      // Get Atlassian resources and user info in parallel
      const [resourcesResponse, userResponse] = await Promise.all([
        fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
          },
        }),
        fetch('https://api.atlassian.com/me', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
          },
        }),
      ]);

      if (!resourcesResponse.ok || !userResponse.ok) {
        throw new Error('Failed to fetch Atlassian resources or user info');
      }

      const [accessibleResources, userData] = await Promise.all([
        resourcesResponse.json() as Promise<AccessibleResource[]>,
        userResponse.json() as Promise<ConfluenceUser>,
      ]);

      // Check for resources with Confluence and Jira access
      const confluenceResource = accessibleResources.find((r) =>
        r.scopes.some((scope) => scope.includes('confluence')),
      );
      const jiraResource = accessibleResources.find((r) =>
        r.scopes.some((scope) => scope.includes('jira')),
      );

      if (!confluenceResource && !jiraResource) {
        throw new Error('No Confluence or Jira resources found');
      }

      // Save Atlassian config
      const now = new Date();

      // Validate token expiration data
      if (!tokenData.expires_in || typeof tokenData.expires_in !== 'number') {
        throw new Error('Invalid expires_in value in token response');
      }

      // Calculate access token expiration (expires_in is in seconds)
      const accessTokenExpiresAt = new Date(
        Math.floor(now.getTime() + tokenData.expires_in * 1000),
      );

      if (isNaN(accessTokenExpiresAt.getTime())) {
        throw new Error('Invalid access token expiration date calculation');
      }

      // Validate refresh token
      if (!tokenData.refresh_token) {
        throw new Error(
          'No refresh token received. Make sure offline_access scope is included in the authorization request.',
        );
      }

      // Calculate refresh token expiration (90 days from now for inactivity)
      const refreshTokenExpiresAt = new Date(
        Math.floor(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 365 days in milliseconds (absolute expiry)
      );

      const refreshTokenInactivityExpiresAt = new Date(
        Math.floor(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days in milliseconds (inactivity expiry)
      );

      if (isNaN(refreshTokenExpiresAt.getTime())) {
        throw new Error('Invalid refresh token expiration date calculation');
      }

      if (isNaN(refreshTokenInactivityExpiresAt.getTime())) {
        throw new Error(
          'Invalid refresh token inactivity expiration date calculation',
        );
      }

      // Save Atlassian config with both Confluence and Jira data
      const config: AtlassianConfigInsert = {
        user_id: userId,
        access_token: tokenData.access_token,
        access_token_expires_at: accessTokenExpiresAt.toISOString(),
        refresh_token: tokenData.refresh_token,
        refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
        refresh_token_inactivity_expires_at:
          refreshTokenInactivityExpiresAt.toISOString(),
        atlassian_account_id: userData.account_id,
        atlassian_email: userData.email,
        atlassian_display_name: userData.display_name,
        atlassian_cloud_id: (confluenceResource?.id && jiraResource?.id)!,
        atlassian_base_url: (confluenceResource?.url && jiraResource?.url)!,
      };

      // Save config first
      await supabase.from('atlassian_config').insert(config);

      // Redirect to the connector selection page after successful connection
      redirectUrl = `/connectors/atlassian/select?accountSlug=${accountSlug}`;
    } catch (error) {
      console.error('Error in OAuth callback:', error);
    }

    return redirect(redirectUrl);
  },
  {
    auth: true,
  },
);
