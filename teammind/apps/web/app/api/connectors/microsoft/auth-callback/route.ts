import { redirect } from 'next/navigation';

import { MicrosoftApi } from '@tm/ai/integrations/microsoft';
import { type HandlerParams, enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { Database } from '~/lib/database.types';

type MicrosoftConfigInsert =
  Database['public']['Tables']['microsoft_config']['Insert'];

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

      const tokenData = await MicrosoftApi.getToken(code);

      const msApi = new MicrosoftApi(
        tokenData.access_token,
        tokenData.refresh_token,
      );
      // Get Microsoft user info
      const [rootSiteData, userData] = await Promise.all([
        msApi.getRootSite(),
        msApi.getProfile(),
      ]);

      if (!userData) {
        throw new Error('No user data received from Microsoft API');
      }

      if (!rootSiteData) {
        throw new Error('No SharePoint root site data found');
      }

      // Save Microsoft config
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

      // Calculate refresh token expiration (assuming 24 hours for Microsoft)
      const refreshTokenExpiresAt = new Date(
        Math.floor(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours in milliseconds
      );

      if (isNaN(refreshTokenExpiresAt.getTime())) {
        throw new Error('Invalid refresh token expiration date calculation');
      }

      const refreshTokenInactivityExpiresAt = new Date(
        Math.floor(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours for inactivity expiry
      );

      if (isNaN(refreshTokenInactivityExpiresAt.getTime())) {
        throw new Error(
          'Invalid refresh token inactivity expiration date calculation',
        );
      }

      const config: MicrosoftConfigInsert = {
        user_id: userId,
        access_token: tokenData.access_token,
        access_token_expires_at: accessTokenExpiresAt.toISOString(),
        refresh_token: tokenData.refresh_token,
        refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
        refresh_token_inactivity_expires_at:
          refreshTokenInactivityExpiresAt.toISOString(),
        microsoft_account_id: userData.id,
        microsoft_display_name: userData.displayName,
        microsoft_email: userData.email,
        sharepoint_root_id: rootSiteData.id,
        sharepoint_base_url: rootSiteData.webUrl,
      };

      // // Save config
      await supabase.from('microsoft_config').insert(config);

      // Redirect to the connector selection page after successful connection
      redirectUrl = `/connectors/microsoft/select?accountSlug=${accountSlug}`;
    } catch (error) {
      console.error('Error in OAuth callback:', error);
    }

    return redirect(redirectUrl);
  },
  {
    auth: true,
  },
);
