import { NextResponse } from 'next/server';

import { type HandlerParams, enhanceRouteHandler } from '@tm/next/routes';

/**
 * @name POST
 * @description Initiates Notion OAuth flow
 */
export const POST = enhanceRouteHandler(
  async ({ request }: HandlerParams<undefined, true>) => {
    try {
      const formData = await request.formData();
      const stateStr = formData.get('state') as string;

      if (!stateStr) {
        return NextResponse.json(
          { error: 'State parameter is required' },
          { status: 400 },
        );
      }

      let state: { userId: string; accountSlug: string; addScopes?: boolean };
      try {
        state = JSON.parse(stateStr);
      } catch (e) {
        console.error('Error parsing Notion state parameter:', e);
        return NextResponse.json(
          { error: 'Invalid state parameter' },
          { status: 400 },
        );
      }

      if (!state.userId || !state.accountSlug) {
        return NextResponse.json(
          { error: 'Invalid state parameter' },
          { status: 400 },
        );
      }

      // Construct the OAuth URL with state
      const clientId = process.env.NOTION_CLIENT_ID!;
      const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/notion/auth-callback`;

      // Construct the authorization URL with required parameters
      // Notion doesn't use scopes in their OAuth flow
      const searchParams = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        owner: 'user',
        state: stateStr,
      });

      const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?${searchParams.toString()}`;

      return NextResponse.redirect(notionAuthUrl, { status: 303 });
    } catch (error) {
      console.error('Error initiating Notion OAuth:', error);
      return NextResponse.json(
        { error: 'Failed to initiate OAuth flow' },
        { status: 500 },
      );
    }
  },
  {
    auth: true,
  },
);
