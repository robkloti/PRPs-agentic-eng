// apps/web/app/api/connectors/google/auth/route.ts
import { NextResponse } from 'next/server';

import { type HandlerParams, enhanceRouteHandler } from '@tm/next/routes';

/**
 * @name POST
 * @description Initiates Google OAuth flow for Gmail, Calendar, and Drive access
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
        console.error('Error parsing Google state parameter:', e);
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
      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/google/auth-callback`;

      // Include necessary scopes for Gmail, Google Calendar, and Google Drive
      const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents',
      ];

      // Construct the authorization URL with required parameters
      const searchParams = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        access_type: 'offline', // Request a refresh token
        prompt: 'consent', // Force consent screen to ensure getting refresh token
        scope: scopes.join(' '),
        state: stateStr,
      });

      // If we're adding scopes, ensure we include previously granted scopes
      if (state.addScopes) {
        searchParams.set('include_granted_scopes', 'true');
      }

      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${searchParams.toString()}`;

      return NextResponse.redirect(googleAuthUrl, { status: 303 });
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
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
