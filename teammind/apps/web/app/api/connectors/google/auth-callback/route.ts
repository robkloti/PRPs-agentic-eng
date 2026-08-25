import { redirect } from 'next/navigation';

import { google } from 'googleapis';

import { type HandlerParams, enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { Database } from '~/lib/database.types';
import { loadGmail } from '~/api/_trigger.dev/connectors/google';

type GoogleConfigInsert =
  Database['public']['Tables']['google_config']['Insert'];

const supabase = getSupabaseServerClient({ admin: true });

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const DOCS_SCOPE = 'https://www.googleapis.com/auth/documents';
const GMAIL_SCOPE = 'https://mail.google.com/';

export const GET = enhanceRouteHandler(
  async ({ request }: HandlerParams<undefined, true>) => {
    // Extract state parameter
    const { searchParams } = new URL(request.url);
    const stateStr = searchParams.get('state');

    if (!stateStr) {
      console.error('No state parameter received');
      return redirect('/home?error=no_state');
    }

    let state: { userId: string; accountSlug: string; addScopes?: boolean };
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

      // Handle OAuth errors
      if (error ?? !code) {
        console.error('OAuth error:', error);
        return redirect(redirectUrl);
      }

      // Create OAuth client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/google/auth-callback`,
      );

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      // Set credentials to get user info
      oauth2Client.setCredentials(tokens);

      // Get user information
      const people = google.people({ version: 'v1', auth: oauth2Client });
      const userInfo = await people.people.get({
        resourceName: 'people/me',
        personFields: 'emailAddresses,names,photos',
      });

      // Get primary email, name, and photo
      const email = userInfo.data.emailAddresses?.[0]?.value;
      const name = userInfo.data.names?.[0]?.displayName;
      const picture = userInfo.data.photos?.[0]?.url;

      // Calculate token expiry time
      const expiryDate = new Date();
      if (tokens.expiry_date) {
        expiryDate.setTime(tokens.expiry_date);
      }

      // Extract granted scopes from token response
      const grantedScopes = tokens.scope ? tokens.scope.split(' ') : [];

      // Check if required scopes were granted
      const hasDriveScope = grantedScopes.includes(DRIVE_SCOPE);
      const hasDocsScope = grantedScopes.includes(DOCS_SCOPE);
      const hasGmailScope = grantedScopes.includes(GMAIL_SCOPE);
      const hasRequiredDriveScopes = hasDriveScope && hasDocsScope;

      // Prepare config object
      const config: GoogleConfigInsert = {
        user_id: userId,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        token_expiry: expiryDate.toISOString(),
        email: email,
        name: name,
        picture: picture,
        granted_scopes: grantedScopes,
      };

      // Track existing config for Gmail loading
      let existingConfig = null;

      // Handle adding scopes vs. creating new config
      if (state.addScopes) {
        // Check if config already exists
        const { data: fetchedConfig } = await supabase
          .from('google_config')
          .select('refresh_token, granted_scopes')
          .eq('user_id', userId)
          .single();
        
        existingConfig = fetchedConfig;

        if (existingConfig) {
          // Update existing configuration
          await supabase
            .from('google_config')
            .update({
              access_token: tokens.access_token!,
              refresh_token:
                tokens.refresh_token ?? existingConfig.refresh_token, // Keep old refresh token if no new one
              token_expiry: expiryDate.toISOString(),
              granted_scopes: grantedScopes,
            })
            .eq('user_id', userId);

          // Check if this is the first time getting required Drive scopes
          const existingScopes =
            (existingConfig.granted_scopes as string[]) || [];
          const hadDriveScope = existingScopes.includes(DRIVE_SCOPE);
          const hadDocsScope = existingScopes.includes(DOCS_SCOPE);
          const hadGmailScope = existingScopes.includes(GMAIL_SCOPE);
          const hadRequiredDriveScopes = hadDriveScope && hadDocsScope;

          // If required scopes were newly added, redirect to selector
          if (hasRequiredDriveScopes && !hadRequiredDriveScopes) {
            redirectUrl = `/connectors/google/select?accountSlug=${accountSlug}`;
          } else {
            // Otherwise just go to home
            redirectUrl = `/home/${accountSlug}`;
          }

          // Check if Gmail scope was newly added
          const isNewGmailScope = hasGmailScope && !hadGmailScope;
          if (isNewGmailScope) {
            // We'll trigger Gmail loading below
            console.log('Gmail scope newly added for user:', userId);
          }
        } else {
          // Insert new config if somehow the existing one wasn't found
          await supabase.from('google_config').insert(config);

          // If required Drive scopes were granted, redirect to selector
          if (hasRequiredDriveScopes) {
            redirectUrl = `/connectors/google/select?accountSlug=${accountSlug}`;
          } else {
            redirectUrl = `/home/${accountSlug}`;
          }
        }
      } else {
        // Regular insert for new connection
        await supabase.from('google_config').insert(config);

        // Only redirect to selector page if required Drive scopes were granted
        if (hasRequiredDriveScopes) {
          redirectUrl = `/connectors/google/select?accountSlug=${accountSlug}`;
        } else {
          redirectUrl = `/home/${accountSlug}`;
        }
      }

      // If Gmail scope was granted, trigger Gmail loading
      if (hasGmailScope) {
        try {
          await loadGmail.trigger({
            userId: userId,
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token ?? (existingConfig?.refresh_token || null),
            userEmail: email,
          });
          
          console.log('Triggered Gmail load for user:', userId);
        } catch (error) {
          console.error('Failed to trigger Gmail load:', error);
          // Don't throw - we don't want to disrupt the auth flow if Gmail loading fails
        }
      }
    } catch (error) {
      console.error('Error in OAuth callback:', error);
    }

    return redirect(redirectUrl);
  },
  {
    auth: true,
  },
);