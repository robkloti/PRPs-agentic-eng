import { NextResponse } from 'next/server';

import { DocumentAccessManager } from '@tm/ai/storage';
import { HandlerParams, enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

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
      await Promise.all([
        client.from('notion_config').delete().eq('user_id', user.id),
        accessManager.manageUserAccess(user.id, 'remove', {
          source: 'notion',
        }),
      ]);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting Notion:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 },
      );
    }
  },
  { auth: true },
);
