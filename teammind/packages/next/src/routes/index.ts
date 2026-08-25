import 'server-only';

import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

import { User } from '@supabase/supabase-js';

import { z } from 'zod';

import { verifyCaptchaToken } from '@tm/auth/captcha/server';
import { Database } from '@tm/supabase/database';
import { requireUser } from '@tm/supabase/require-user';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { captureException, zodParseFactory } from '../utils';

interface Config<Schema> {
  auth?: boolean;
  captcha?: boolean;
  captureException?: boolean;
  schema?: Schema;
}

export type TeamAccount = Database['public']['Views']['user_accounts']['Row'];

export interface HandlerParams<
  Schema extends z.ZodType | undefined,
  RequireAuth extends boolean | undefined,
> {
  request: NextRequest;
  user: RequireAuth extends false ? undefined : User;
  body: Schema extends z.ZodType ? z.infer<Schema> : undefined;
  teamAccount: RequireAuth extends false ? undefined : TeamAccount | null;
  params: Record<string, string>;
}

/**
 * Enhanced route handler function.
 *
 * This function takes a request and parameters object as arguments and returns a route handler function.
 * The route handler function can be used to handle HTTP requests and apply additional enhancements
 * based on the provided parameters.
 *
 * Usage:
 * export const POST = enhanceRouteHandler(
 *   ({ request, body, user, teamAccount }) => {
 *     return new Response(`Hello, ${body.name}! Your team is ${teamAccount?.name || 'None'}`);
 *   },
 *   {
 *     schema: z.object({
 *       name: z.string(),
 *     }),
 *   },
 * );
 *
 */
export const enhanceRouteHandler = <
  Body,
  Params extends Config<z.ZodType<Body, z.ZodTypeDef>>,
>(
  // Route handler function
  handler:
    | ((
        params: HandlerParams<Params['schema'], Params['auth']>,
      ) => NextResponse | Response)
    | ((
        params: HandlerParams<Params['schema'], Params['auth']>,
      ) => Promise<NextResponse | Response>),
  // Parameters object
  params?: Params,
) => {
  /**
   * Route handler function.
   *
   * This function takes a request object as an argument and returns a response object.
   */
  return async function routeHandler(
    request: NextRequest,
    routeParams: {
      params: Record<string, string>;
    },
  ) {
    type UserParam = Params['auth'] extends false ? undefined : User;
    type TeamAccountParam = Params['auth'] extends false
      ? undefined
      : TeamAccount | null;

    let user: UserParam = undefined as UserParam;
    // Initialize teamAccount with appropriate type using as keyword
    let teamAccount = null as unknown as TeamAccountParam;

    // Check if the captcha token should be verified
    const shouldVerifyCaptcha = params?.captcha ?? false;

    // Verify the captcha token if required and setup
    if (shouldVerifyCaptcha) {
      const token = captchaTokenGetter(request);

      // If the captcha token is not provided, return a 400 response.
      if (token) {
        await verifyCaptchaToken(token);
      } else {
        return new Response('Captcha token is required', { status: 400 });
      }
    }

    const client = getSupabaseServerClient();

    const shouldVerifyAuth = params?.auth ?? true;

    // Check if the user should be authenticated
    if (shouldVerifyAuth) {
      // Get the authenticated user
      const auth = await requireUser(client);

      // If the user is not authenticated, redirect to the specified URL.
      if (auth.error) {
        return redirect(auth.redirectTo);
      }

      user = auth.data as UserParam;

      // Fetch the team account associated with the authenticated user
      if (user) {
        // Query the user_accounts view which contains team accounts
        const { data: userAccounts, error } = await client
          .from('user_accounts')
          .select('id, name, picture_url, role, slug')
          .limit(1);

        // If user has a team account, assign it
        if (!error && userAccounts && userAccounts.length > 0) {
          // This cast works because we're specifying exactly the columns we need from the view
          teamAccount = userAccounts[0] as TeamAccountParam;
        } else {
          // This is safe because we've properly typed teamAccount above
          teamAccount = null as TeamAccountParam;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;

    if (params?.schema) {
      // clone the request to read the body
      // so that we can pass it to the handler safely
      const json = await request.clone().json();

      body = zodParseFactory(params.schema)(json);
    }

    const shouldCaptureException = params?.captureException ?? true;

    if (shouldCaptureException) {
      try {
        return await handler({
          request,
          body,
          user,
          teamAccount,
          params: routeParams.params,
        });
      } catch (error) {
        if (isRedirectError(error)) {
          throw error;
        }

        // capture the exception
        await captureException(error);

        throw error;
      }
    } else {
      return handler({
        request,
        body,
        user,
        teamAccount,
        params: routeParams.params,
      });
    }
  };
};

/**
 * Get the captcha token from the request headers.
 * @param request
 */
function captchaTokenGetter(request: NextRequest) {
  return request.headers.get('x-captcha-token');
}
