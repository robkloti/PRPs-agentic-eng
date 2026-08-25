import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { SupabaseClient } from '@supabase/supabase-js';

import { CsrfError, createCsrfProtect } from '@edge-csrf/nextjs';

import { createAccountsApi } from '@tm/accounts/api';
import { checkRequiresMultiFactorAuthentication } from '@tm/supabase/check-requires-mfa';
import { createMiddlewareClient } from '@tm/supabase/middleware-client';

import appConfig from '~/config/app.config';
import pathsConfig from '~/config/paths.config';

import { Database } from './lib/database.types';

// =================================================================
// Constants and Types
// =================================================================

const CSRF_SECRET_COOKIE = 'csrfSecret';
const NEXT_ACTION_HEADER = 'next-action';

type RouteHandler = (
  request: NextRequest,
  response: NextResponse,
  client: SupabaseClient<Database>,
  userId?: string,
) => Promise<NextResponse | undefined | void>;

type Route = {
  pattern: RegExp;
  handler: RouteHandler;
  requiresAuth: boolean;
};

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images (assuming /public/images folder)
     * - locales (assuming /public/locales folder)
     * - assets (assuming /public/assets folder)
     * - api (API routes)
     * - favicon.ico (favicon)
     * - robots.txt (robots file)
     */
    '/((?!_next/static|_next/image|images|locales|assets|api|favicon.ico|robots.txt).*)',
  ],
};

// =================================================================
// Core Utilities
// =================================================================

// Get authenticated user from request
async function getAuthenticatedUser(
  request: NextRequest,
  response: NextResponse,
) {
  // @ts-expect-error 
  // TODO - Next types error
  const client = createMiddlewareClient(request, response);
  const { data, error } = await client.auth.getUser();

  return {
    user: data.user,
    error,
    client,
  };
}

// Set unique request ID for tracing
function setRequestId(request: NextRequest) {
  request.headers.set('x-correlation-id', crypto.randomUUID());
}

// CSRF protection middleware
async function applyCsrfProtection(
  request: NextRequest,
  response: NextResponse,
) {
  const isAction = request.headers.has(NEXT_ACTION_HEADER);

  const csrfProtect = createCsrfProtect({
    cookie: {
      secure: appConfig.production,
      name: CSRF_SECRET_COOKIE,
    },
    ignoreMethods: isAction ? ['POST'] : ['GET', 'HEAD', 'OPTIONS'],
  });

  try {
    await csrfProtect(request, response);

    if (isAction) {
      response.headers.set('x-action-path', request.nextUrl.pathname);
    }

    return response;
  } catch (error) {
    if (error instanceof CsrfError) {
      return NextResponse.json('Invalid CSRF token', { status: 401 });
    }
    throw error;
  }
}

// Redirect to sign in page with return URL
function redirectToSignIn(request: NextRequest) {
  // Preserve the original query string
  const originalQuery = request.nextUrl.search;
  const pathname = request.nextUrl.pathname;

  // Create next parameter with both pathname and query
  const nextPath = originalQuery ? `${pathname}${originalQuery}` : pathname;

  const redirectUrl = `${pathsConfig.auth.signIn}?next=${encodeURIComponent(nextPath)}`;
  return NextResponse.redirect(new URL(redirectUrl, request.nextUrl.origin));
}

// Handle team cookie operations
function teamCookieName(userId: string): string {
  return `${userId}-selected-team-slug`;
}

function getTeamSlugFromPath(pathname: string): string | null {
  const pathParts = pathname.split('/');
  return pathParts[1] === 'home' && pathParts[2] && pathParts[2] !== 'teams'
    ? pathParts[2]
    : null;
}

// =================================================================
// Permission Checks
// =================================================================

// Check if user has permission for settings page
async function checkSettingsPermission(
  client: SupabaseClient<Database>,
  accountSlug: string,
  settingsPage: string,
  userId: string,
): Promise<boolean> {
  // Always allow access to these pages
  if (settingsPage === 'user' || settingsPage === 'connect') {
    return true;
  }

  try {
    // Get account ID from slug
    const { data: account } = await client
      .from('accounts')
      .select('id')
      .eq('slug', accountSlug)
      .single();

    if (!account) {
      console.error(`No account found for slug: ${accountSlug}`);
      return false;
    }

    // Map settings page to required permission
    let permissionName:
      | 'settings.manage'
      | 'members.manage'
      | 'billing.manage'
      | 'roles.manage'
      | 'invites.manage';

    switch (settingsPage) {
      case 'team':
        permissionName = 'settings.manage';
        break;
      case 'members':
        permissionName = 'members.manage';
        break;
      case 'billing':
        permissionName = 'billing.manage';
        break;
      default:
        return true;
    }

    // Check permission using the correct parameter name (permission_name)
    const { data: hasPermission, error } = await client.rpc('has_permission', {
      user_id: userId,
      account_id: account.id,
      permission_name: permissionName,
    });

    if (error) {
      console.error('Permission check error:', error);
      return true; // Allow access on error rather than blocking
    }

    return hasPermission === true;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return true; // Allow access on error rather than blocking
  }
}

// =================================================================
// Route Handlers
// =================================================================

// Root path handler - redirect to home if authenticated
const handleRoot: RouteHandler = async (req, _res, _client, userId) => {
  // Only redirect to home if user is authenticated
  if (userId) {
    return NextResponse.redirect(
      new URL(pathsConfig.app.home, req.nextUrl.origin),
    );
  }

  // For unauthenticated users, don't redirect
  return undefined;
};

// Admin routes - verify admin role
const handleAdmin: RouteHandler = async (req, res, client, _userId) => {
  if (!req.nextUrl.pathname.startsWith('/admin')) return undefined;

  const { data } = await client.auth.getUser();
  const user = data.user;

  if (!user?.app_metadata.role || user.app_metadata.role !== 'super-admin') {
    return NextResponse.redirect(new URL('/404', req.nextUrl.origin));
  }

  return undefined;
};

// Auth routes - redirect to home if authenticated
const handleAuth: RouteHandler = async (req, _res, _client, _userId) => {
  // If we're on an auth route and user is already authenticated,
  // redirect to home (except for MFA verification)
  if (req.nextUrl.pathname.startsWith('/auth') && _userId) {
    // Allow MFA verification page even when authenticated
    if (req.nextUrl.pathname === pathsConfig.auth.verifyMfa) {
      return undefined;
    }

    // Redirect other auth pages to home when user is authenticated
    return NextResponse.redirect(
      new URL(pathsConfig.app.home, req.nextUrl.origin),
    );
  }

  // For unauthenticated users, allow access to auth routes
  return undefined;
};

// MFA verification - check if MFA is required
const handleMfaCheck: RouteHandler = async (req, _res, client, _userId) => {
  // Only check on non-auth paths to prevent loops
  if (req.nextUrl.pathname.startsWith('/auth/')) {
    return undefined;
  }

  const requiresMfa = await checkRequiresMultiFactorAuthentication(client);

  if (requiresMfa && req.nextUrl.pathname !== pathsConfig.auth.verifyMfa) {
    return NextResponse.redirect(
      new URL(pathsConfig.auth.verifyMfa, req.nextUrl.origin),
    );
  }

  return undefined;
};

// Teams listing page
const handleTeamsPage: RouteHandler = async (req, _res, client, _userId) => {
  if (req.nextUrl.pathname !== '/home/teams') return undefined;

  const api = createAccountsApi(client);
  const accounts = await api.loadUserAccounts();

  if (accounts.length === 1 && accounts[0]) {
    return NextResponse.redirect(
      new URL(`/home/${accounts[0].value}`, req.url),
    );
  }

  return undefined;
};

// Handler to check if user has documents and redirect to connectors if needed
const handleNoDocumentsRedirect: RouteHandler = async (req, _res, client) => {
  // Skip if not on a team page or already on connectors/connect page
  const teamSlug = getTeamSlugFromPath(req.nextUrl.pathname);
  if (!teamSlug || req.nextUrl.pathname.includes('/connect')) {
    return undefined;
  }

  // Skip for specific paths we always want to allow access to
  if (
    req.nextUrl.pathname.includes('/settings/') ||
    req.nextUrl.pathname.includes('/auth/')
  ) {
    console.log('Skipping document check for settings or auth page');
    return undefined;
  }

  try {
    // Check if user has any documents
    const { data: docCounts } = await client.rpc('count_documents_by_source');

    // If no documents found, redirect to the connect page
    if (docCounts === 0) {
      console.log('No documents found, redirecting to connect page');
      return NextResponse.redirect(
        new URL(`/home/${teamSlug}/connect`, req.nextUrl.origin),
      );
    }
  } catch (error) {
    console.error('Error checking document count:', error);
    // Continue to next handler on error
  }

  return undefined;
};

// Home redirect - send to most recent team or teams page
const handleHomeRedirect: RouteHandler = async (req, _res, _client, userId) => {
  if (req.nextUrl.pathname !== '/home') return undefined;
  if (!userId) return undefined;

  const cookieName = teamCookieName(userId);
  const lastTeam = req.cookies.get(cookieName);

  if (lastTeam) {
    return NextResponse.redirect(new URL(`/home/${lastTeam.value}`, req.url));
  }

  return NextResponse.redirect(new URL('/home/teams', req.url));
};

// Team routes - store current team in cookie
const handleTeamRoutes: RouteHandler = async (req, _res, _client, userId) => {
  if (!userId) return undefined;

  const teamSlug = getTeamSlugFromPath(req.nextUrl.pathname);
  if (!teamSlug) return undefined;

  // Skip handling settings routes here to avoid conflicts
  if (req.nextUrl.pathname.includes('/settings/')) {
    console.log('Skipping team route handler for settings path');
    return undefined;
  }

  // Store team slug in cookie and continue without redirecting
  const response = NextResponse.next();
  response.cookies.set({
    name: teamCookieName(userId),
    value: teamSlug,
    path: '/',
  });

  return undefined;
};

// Settings routes - check permissions
const handleSettingsRoutes: RouteHandler = async (
  req,
  _res,
  client,
  userId,
) => {
  if (!userId) return undefined;

  const parts = req.nextUrl.pathname.split('/');
  // Check if this is a settings page that needs permission
  // Format: /home/[team]/settings/[page]
  if (parts.length >= 5 && parts[1] === 'home' && parts[3] === 'settings') {
    console.log('Processing settings route:', req.nextUrl.pathname);
    
    const teamSlug = parts[2];
    const settingsPage = parts[4];

    // Skip user settings to prevent redirect loops
    if (settingsPage === 'user' || !teamSlug || !settingsPage) {
      return undefined;
    }

    const hasPermission = await checkSettingsPermission(
      client,
      teamSlug,
      settingsPage,
      userId,
    );

    if (!hasPermission) {
      console.log('Permission denied for settings page:', settingsPage);
      return NextResponse.redirect(
        new URL(`/home/${teamSlug}/settings/user`, req.nextUrl.origin),
      );
    }
    
    console.log('Permission granted for settings page:', settingsPage);
  }

  return undefined;
};

// =================================================================
// Route Configuration
// =================================================================

// Define routes and their handlers in order of specificity
const routes: Route[] = [
  {
    pattern: /^\/$/, // Root path (/)
    handler: handleRoot,
    requiresAuth: false,
  },
  {
    pattern: /^\/auth\//, // Auth routes
    handler: handleAuth,
    requiresAuth: false, // This allows both auth and non-auth users to access the handler
  },
  {
    pattern: /^\/admin\//, // Admin routes
    handler: handleAdmin,
    requiresAuth: true,
  },
  {
    pattern: /^\/home\/teams\/?$/, // Teams listing page
    handler: handleTeamsPage,
    requiresAuth: true,
  },
  {
    pattern: /^\/home\/?$/, // Home redirect
    handler: handleHomeRedirect,
    requiresAuth: true,
  },
  // Settings route needs to be BEFORE the more general team routes
  {
    pattern: /^\/home\/[^/]+\/settings\//, // Settings pages (permission check)
    handler: handleSettingsRoutes,
    requiresAuth: true,
  },
  // Only apply MFA check to home routes, not all non-auth routes
  {
    pattern: /^\/home\//, // Home routes only
    handler: handleMfaCheck,
    requiresAuth: true,
  },
  {
    pattern: /^\/home\/[^/]+(?:\/|$)/, // No documents redirect
    handler: handleNoDocumentsRedirect,
    requiresAuth: true,
  },
  {
    pattern: /^\/home\/[^/]+(?:\/|$)/, // Team routes
    handler: handleTeamRoutes,
    requiresAuth: true,
  }
  // You can add other specific protected patterns here as needed
];

// =================================================================
// Main Middleware Function
// =================================================================

export async function middleware(request: NextRequest) {
  // Initial response and request setup
  const response = NextResponse.next();
  setRequestId(request);

  // Apply CSRF protection
  const protectedResponse = await applyCsrfProtection(request, response);
  if (protectedResponse.status !== 200) {
    return protectedResponse;
  }

  // Get authenticated user
  const { user, client } = await getAuthenticatedUser(
    request,
    protectedResponse,
  );

  // Special case: If on auth route and not authenticated, allow it through immediately
  if (request.nextUrl.pathname.startsWith('/auth') && !user) {
    return protectedResponse;
  }

  // Process routes in order
  for (const route of routes) {
    // Skip routes requiring auth if user is not authenticated
    if (route.requiresAuth && !user) {
      if (route.pattern.test(request.nextUrl.pathname)) {
        return redirectToSignIn(request);
      }
      continue;
    }

    // Execute handler if pattern matches
    if (route.pattern.test(request.nextUrl.pathname)) {
      const result = await route.handler(
        request,
        protectedResponse,
        client,
        user?.id,
      );

      // Return result if handler provided one
      if (result) {
        return result;
      }
    }
  }

  // If we get here, no route handler returned a response
  return protectedResponse;
}