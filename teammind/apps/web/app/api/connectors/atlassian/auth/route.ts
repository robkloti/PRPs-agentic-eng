import { NextResponse } from 'next/server';

import { type HandlerParams, enhanceRouteHandler } from '@tm/next/routes';

/**
 * @name POST
 * @description Initiates Atlassian OAuth flow
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

      let state: { userId: string; accountSlug: string };
      try {
        state = JSON.parse(stateStr);
      } catch (e) {
        console.error('Error parsing Atlassian state parameter:', e);
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
      const scopes = [
        'read:confluence-user',
        'read:space:confluence',
        'read:content-details:confluence',
        'read:confluence-space.summary',
        'read:confluence-content.all',
        'write:confluence-content',
        'read:page:confluence',
        'write:page:confluence',
        'read:board-scope:jira-software',
        'read:project:jira',
        'read:jira-work',
        'write:jira-work',
        'read:me',
        'offline_access',
      ].join(' ');

      const searchParams = new URLSearchParams({
        audience: 'api.atlassian.com',
        client_id: process.env.ATLASSIAN_CLIENT_ID!,
        scope: scopes,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/atlassian/auth-callback`,
        state: stateStr,
        response_type: 'code',
        prompt: 'consent',
      });

      const url = `https://auth.atlassian.com/authorize?${searchParams.toString()}`;

      return NextResponse.redirect(url, { status: 303 });
    } catch (error) {
      console.error('Error initiating Atlassian OAuth:', error);
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
