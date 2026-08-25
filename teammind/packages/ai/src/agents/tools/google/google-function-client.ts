import { SupabaseClient } from '@supabase/supabase-js';

import { google } from 'googleapis';
import { calendar_v3, gmail_v1 } from 'googleapis';

import { Database } from '@tm/supabase/database';

/**
 * Gets an authenticated Gmail API client for the user
 *
 * @param supabase The Supabase client
 * @param userId The user ID
 * @returns Authenticated Gmail API client
 */
export async function getGmailClient(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<gmail_v1.Gmail> {
  // Get the user's Google credentials from the database
  const { data: googleConfig } = await supabase
    .from('google_config')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .single();

  if (!googleConfig) {
    throw new Error('Google credentials not found for user');
  }

  // Create an OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  // Set credentials
  oauth2Client.setCredentials({
    access_token: googleConfig.access_token,
    refresh_token: googleConfig.refresh_token,
  });

  // Create and return the Gmail client
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Gets an authenticated Google Calendar API client for the user
 *
 * @param supabase The Supabase client
 * @param userId The user ID
 * @returns Authenticated Google Calendar API client
 */
export async function getCalendarClient(
  supabase: SupabaseClient,
  userId: string,
): Promise<calendar_v3.Calendar> {
  // Get the user's Google credentials from the database
  const { data: googleConfig } = await supabase
    .from('google_config')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .single();

  if (!googleConfig) {
    throw new Error('Google credentials not found for user');
  }

  // Create an OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  // Set credentials
  oauth2Client.setCredentials({
    access_token: googleConfig.access_token,
    refresh_token: googleConfig.refresh_token,
  });

  // Create and return the Calendar client
  return google.calendar({ version: 'v3', auth: oauth2Client });
}
