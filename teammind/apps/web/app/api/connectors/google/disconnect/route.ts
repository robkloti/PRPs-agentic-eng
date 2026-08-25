import { NextResponse } from 'next/server';

import { HandlerParams, enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';
import { DocumentAccessManager } from '@tm/ai/storage';

export const POST = enhanceRouteHandler(
  async ({ request, user }: HandlerParams<undefined, true>) => {
    const client = getSupabaseServerClient({ admin: true });
    const accessManager = new DocumentAccessManager(client);

    const formData = await request.formData();
    const account_slug = formData.get('account_slug');

    if (!account_slug || typeof account_slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 },
      );
    }

    try {
      // Get the access token to revoke it (optional but recommended)
      const { data: googleConfig } = await client
        .from('google_config')
        .select('access_token')
        .eq('user_id', user.id)
        .single();

      // Optionally revoke the Google token if it exists
      if (googleConfig?.access_token) {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${googleConfig.access_token}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );
      }

      await Promise.all([
        client.from('google_config').delete().eq('user_id', user.id),
        accessManager.manageUserAccess(user.id, 'remove', {
          source: 'google_drive',
        }),
        accessManager.manageUserAccess(user.id, 'remove', {
          source: 'gmail',
        }),
      ]);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 },
      );
    }
  },
  { auth: true },
);
