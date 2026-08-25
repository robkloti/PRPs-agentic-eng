import 'server-only';

import { cookies } from 'next/headers';

import { createClient } from '@supabase/supabase-js';

import { createServerClient } from '@supabase/ssr';

import { Database } from '../database.types';
import {
  getServiceRoleKey,
  warnServiceRoleKeyUsage,
} from '../get-service-role-key';
import { getSupabaseClientKeys } from '../get-supabase-client-keys';

const serviceRoleKey = getServiceRoleKey();
const keys = getSupabaseClientKeys();

/**
 * @name getSupabaseServerClient
 * @description Get a Supabase client for use in the Route Handler Routes
 */
export function getSupabaseServerClient<GenericSchema = Database>(
  params = {
    admin: false,
  },
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

  if (params.admin) {
    warnServiceRoleKeyUsage();

    return createClient<GenericSchema>(keys.url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return createServerClient<GenericSchema>(keys.url, keys.anonKey, {
    cookies: {
      async getAll() {
        return (await cookies()).getAll();
      },
      async setAll(cookiesToSet) {
        for (const cookieData of cookiesToSet) {
          const { name, value, options } = cookieData;
          (await cookies()).set(name, value, options);
        }
      },
    },
  });
}
