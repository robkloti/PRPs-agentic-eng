import { Auth, drive_v3, google } from 'googleapis';

import { getSupabaseServerClient } from '@tm/supabase/server-client';

export class GoogleBase {
  protected auth: Auth.OAuth2Client;
  protected accessToken: string;
  protected refreshToken: string;
  protected userId: string; // Optional userId to identify which record to update
  // Shared drive instance
  protected static driveInstance: drive_v3.Drive;

  get authClient() {
    return this.auth;
  }

  constructor(accessToken: string, refreshToken: string, userId: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.userId = userId;

    // Initialize OAuth client
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/connectors/google/auth-callback`,
    );

    this.auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Fix for ESLint error: Use a void function that calls the async function
    this.auth.on('tokens', (tokens) => {
      // Log token refresh
      console.info('Google OAuth token refresh triggered', {
        userId: this.userId,
      });

      // Update the instance tokens
      if (tokens.access_token) {
        this.accessToken = tokens.access_token;
      }

      if (tokens.refresh_token) {
        this.refreshToken = tokens.refresh_token;
      }

      // Only attempt database update if we have user and config IDs
      if (this.userId) {
        // Call the async function without awaiting in the event handler
        this.updateTokensInDatabase(tokens).catch((error) => {
          console.error('Failed to update tokens in database', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: this.userId,
          });
        });
      }
    });
  }

  // Separate async function for database updates
  private async updateTokensInDatabase(
    tokens: Auth.Credentials,
  ): Promise<void> {
    // Skip if we don't have both userId and configId
    if (!this.userId) return;

    try {
      const supabase = getSupabaseServerClient({ admin: true });

      // Calculate new expiration time
      const expiryDate = new Date();
      if (tokens.expiry_date) {
        expiryDate.setTime(tokens.expiry_date);
      } else {
        // Default expiry to 1 hour if not provided
        expiryDate.setTime(Date.now() + 3600 * 1000);
      }

      const { error } = await supabase
        .from('google_config')
        .update({
          access_token: this.accessToken,
          ...(tokens.refresh_token ? { refresh_token: this.refreshToken } : {}),
          token_expiry: expiryDate.toISOString(),
        })
        .eq('user_id', this.userId);

      if (error) {
        console.error('Failed to update tokens in database', {
          error,
          userId: this.userId,
        });
      } else {
        console.info('Successfully updated tokens in database', {
          userId: this.userId,
          expiryDate: expiryDate.toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating Google tokens in database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: this.userId,
      });
      throw error;
    }
  }

  // Shared method to get Drive service with proper caching
  protected getDriveService() {
    if (!GoogleBase.driveInstance) {
      GoogleBase.driveInstance = google.drive({
        version: 'v3',
        auth: this.auth,
      });
    }
    return GoogleBase.driveInstance;
  }

  // Simple helper method to force token refresh if needed
  protected async refreshTokenIfNeeded(): Promise<void> {
    try {
      await this.auth.getAccessToken();
    } catch (error) {
      console.error('Error refreshing token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: this.userId,
      });
      throw error;
    }
  }
}
