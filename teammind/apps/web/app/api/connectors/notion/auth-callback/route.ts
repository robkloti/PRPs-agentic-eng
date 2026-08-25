import { redirect } from 'next/navigation';

import { DocumentAccessManager } from '@tm/ai/storage';
import { type HandlerParams, enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { loadNotionData } from '~/api/_trigger.dev/connectors/notion';
import { Database } from '~/lib/database.types';

interface TokenResponse {
  access_token: string;
  bot_id: string;
  duplicated_template_id?: string;
  owner: {
    user?: {
      id: string;
      name: string;
      avatar_url?: string;
      type: string;
      email?: string;
    };
    workspace?: boolean;
  };
  workspace_icon?: string;
  workspace_id: string;
  workspace_name: string;
}

type NotionConfigInsert =
  Database['public']['Tables']['notion_config']['Insert'];

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
    const accessManager = new DocumentAccessManager(supabase);

    try {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const error_description = searchParams.get('error_description');

      // Handle OAuth errors
      if (error ?? !code) {
        console.error('OAuth error:', error, error_description);
        return redirect(redirectUrl);
      }

      // Exchange code for access token using HTTP Basic Authentication
      const clientId = process.env.NOTION_CLIENT_ID!;
      const clientSecret = process.env.NOTION_CLIENT_SECRET!;
      const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/notion/auth-callback`;

      // Create basic auth credentials by base64 encoding "clientId:clientSecret"
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );

      const tokenResponse = await fetch(
        'https://api.notion.com/v1/oauth/token',
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
          }),
        },
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Failed to exchange code for token:', errorData);
        throw new Error(`Token exchange failed: ${errorData.error}`);
      }

      const tokenData = (await tokenResponse.json()) as TokenResponse;

      // Extract owner information
      const ownerId = tokenData.owner.user?.id;
      const ownerName = tokenData.owner.user?.name;
      const ownerEmail = tokenData.owner.user?.email;

      // Prepare config object
      const config: NotionConfigInsert = {
        user_id: userId,
        access_token: tokenData.access_token,
        bot_id: tokenData.bot_id,
        workspace_id: tokenData.workspace_id,
        workspace_name: tokenData.workspace_name,
        workspace_icon: tokenData.workspace_icon,
        owner_id: ownerId,
        owner_name: ownerName,
        owner_email: ownerEmail,
        is_syncing: true, // Set initial syncing state
      };

      // Handle adding scopes vs. creating new config
      if (state.addScopes) {
        // Check if config already exists
        const { data: existingConfig } = await supabase
          .from('notion_config')
          .select('workspace_id')
          .eq('user_id', userId)
          .single();

        if (
          existingConfig &&
          existingConfig.workspace_id !== tokenData.workspace_id
        ) {
          // Workspace changed - remove access to old workspace documents
          await accessManager.manageUserAccess(userId, 'remove', {
            source: 'notion',
            metadata: {
              workspace_id: [existingConfig.workspace_id],
            },
          });

          console.log(
            `Workspace changed from ${existingConfig.workspace_id} to ${tokenData.workspace_id}`,
          );
        }

        // Update existing configuration
        await supabase
          .from('notion_config')
          .update(config)
          .eq('user_id', userId);
      } else {
        // Regular insert for new connection
        await supabase.from('notion_config').insert(config);
      }

      // Schedule a sync after 1 minute to give notion time to add access to the integration
      await loadNotionData.trigger({
        userId,
        accessToken: tokenData.access_token,
        workspaceId: tokenData.workspace_id,
        workspaceName: tokenData.workspace_name,
        workspaceIcon: tokenData.workspace_icon,
        checkPermissionChanges: state.addScopes,
      }, {
        delay: "1m"
      });

      // Schedule another sync after 15 minutes to make sure all data is loaded
      // This is a workaround for Notion's eventual consistency model
      await loadNotionData.trigger({
        userId,
        accessToken: tokenData.access_token,
        workspaceId: tokenData.workspace_id,
        workspaceName: tokenData.workspace_name,
        workspaceIcon: tokenData.workspace_icon,
        checkPermissionChanges: state.addScopes,
      }, {
        delay: "15m"
      });

      // Redirect directly to home page - no selection step needed
      redirectUrl = `/home/${accountSlug}`;
    } catch (error) {
      console.error('Error in OAuth callback:', error);
    }

    return redirect(redirectUrl);
  },
  {
    auth: true,
  },
);
