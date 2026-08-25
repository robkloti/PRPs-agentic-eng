import { NextResponse } from 'next/server';

import { MicrosoftApi } from '@tm/ai/integrations/microsoft';
import { MicrosoftScopes } from '@tm/ai/types';
import { type HandlerParams, enhanceRouteHandler } from '@tm/next/routes';

/**
 * @name POST
 * @description Initiates Microsoft OAuth flow
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
      } catch {
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

      // Microsoft Graph API permissions required
      const scopes: MicrosoftScopes[] = [
        'openid',
        'profile',
        'email',
        'offline_access',
        'User.Read',
        'Files.Read',
        'Files.Read.All',
        'Sites.Read.All',
      ];

      const url = MicrosoftApi.getAuthUrl(scopes, stateStr);

      return NextResponse.redirect(url, { status: 303 });
    } catch (error) {
      console.error('Error initiating Microsoft OAuth:', error);
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
