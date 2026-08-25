import { getSupabaseServerClient } from '@tm/supabase/server-client';

interface TokenRefreshConfig {
  cloudId: string;
  accessToken: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Utility function to refresh an expired Atlassian access token
 * @returns New access token or null if refresh failed
 */
export async function refreshAtlassianToken(
  config: TokenRefreshConfig,
): Promise<string | null> {
  try {
    // Get supabase client
    const supabase = getSupabaseServerClient({ admin: true });

    // Get the latest token info from the database
    const { data: configData } = await supabase
      .from('atlassian_config')
      .select('id,refresh_token')
      .eq('atlassian_cloud_id', config.cloudId)
      .single();

    if (!configData) return null;

    // Refresh the token
    const tokenResponse = await fetch(
      'https://auth.atlassian.com/oauth/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: process.env.ATLASSIAN_CLIENT_ID,
          client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
          refresh_token: configData.refresh_token,
        }),
      },
    );

    if (!tokenResponse.ok) {
      console.error(`Failed to refresh token: ${tokenResponse.statusText}`);
      return null;
    }

    const tokenData = (await tokenResponse.json()) as TokenResponse;
    const now = new Date();

    // Update DB with new tokens
    await supabase
      .from('atlassian_config')
      .update({
        access_token: tokenData.access_token,
        access_token_expires_at: new Date(
          Math.floor(now.getTime() + tokenData.expires_in * 1000),
        ).toISOString(),
        refresh_token: tokenData.refresh_token,
        refresh_token_inactivity_expires_at: new Date(
          Math.floor(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        ).toISOString(),
      })
      .eq('id', configData.id);

    return tokenData.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}
