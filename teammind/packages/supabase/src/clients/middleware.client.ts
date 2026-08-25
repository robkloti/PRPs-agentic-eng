import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

import { Database } from '../database.types';
import { getSupabaseClientKeys } from '../get-supabase-client-keys';

/**
 * Creates a middleware client for Supabase.
 *
 * @param {NextRequest} request - The Next.js request object.
 * @param {NextResponse} response - The Next.js response object.
 */
export function createMiddlewareClient<GenericSchema = Database>(
  request: NextRequest,
  response: NextResponse,
) {
  // Suppress Supabase auth session warnings
  if (typeof console !== 'undefined') {
    const originalConsoleWarn = console.warn;
    console.warn = function (...args) {
      const supabaseWarningPatterns = [
        'This is a simple warning to let you know you are using the Supabase Service Role.',
        'Using supabase.auth.getSession() is potentially insecure',
        'Using the user object as returned from supabase.auth.getSession()',
      ];

      const shouldSuppress = args.some(
        (arg) =>
          typeof arg === 'string' &&
          supabaseWarningPatterns.some((pattern) => arg.includes(pattern)),
      );

      if (!shouldSuppress) {
        originalConsoleWarn.apply(console, args);
      }
    };
  }

  const keys = getSupabaseClientKeys();

  return createServerClient<GenericSchema>(keys.url, keys.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Set directly on the response object
          response.cookies.set({
            name,
            value,
            ...options,
          });
        });
      },
    },
  });
}
