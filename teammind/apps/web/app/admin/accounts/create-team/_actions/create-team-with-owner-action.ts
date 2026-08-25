'use server';

import { revalidatePath } from 'next/cache';

import { addDays } from 'date-fns/addDays';
import { formatISO } from 'date-fns/formatISO';
import { adminAction } from 'node_modules/@tm/admin/src/lib/server/utils/admin-action';
import { z } from 'zod';

import { enhanceAction } from '@tm/next/actions';
import { getLogger } from '@tm/shared/logger';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

const CreateTeamWithOwnerSchema = z.object({
  teamName: z.string().min(3),
  ownerEmail: z.string().email(),
});

export const createTeamWithOwnerAction = adminAction(
  enhanceAction(
    async (data, user) => {
      const logger = await getLogger();
      const adminClient = getSupabaseServerClient({ admin: true });

      const logContext = {
        name: 'admin.create-team-with-owner',
        teamName: data.teamName,
        ownerEmail: data.ownerEmail,
      };

      try {
        logger.info(logContext, 'Creating team account as admin');

        // Get the current user's ID to use as temporary owner
        const currentUserId = user.id;

        if (!currentUserId) {
          logger.error(logContext, 'No authenticated user found');
          return { success: false, error: 'Authentication error' };
        }

        // 1. Create the team account with the admin as the temporary owner
        const { data: account, error: createError } = await adminClient
          .from('accounts')
          .insert({
            name: data.teamName,
            is_personal_account: false,
            primary_owner_user_id: currentUserId, // Explicitly set the current user as owner
          })
          .select('id, slug')
          .single();

        if (createError || !account) {
          logger.error(
            { ...logContext, error: createError },
            'Failed to create team account',
          );
          return { success: false, error: 'Failed to create team account' };
        }

        // 2. Find the owner role (highest hierarchy level role)
        const { data: roles, error: rolesError } = await adminClient
          .from('roles')
          .select('*')
          .order('hierarchy_level', { ascending: true })
          .limit(1);

        if (rolesError || !roles || roles.length === 0) {
          logger.error(
            { ...logContext, error: rolesError },
            'Failed to find owner role',
          );
          return { success: false, error: 'Failed to determine owner role' };
        }

        const ownerRole = roles[0]!.name;

        // 3. Add the current admin as a temporary member with owner privileges
        // This happens automatically via the "add_current_user_to_new_account" trigger

        // 4. Instead of using RPC, directly insert invitation with admin client to bypass RLS
        try {
          // Create invitation token
          const inviteToken = crypto.randomUUID();

          // Set expiration date (7 days from now)
          const expiresAt = formatISO(addDays(new Date(), 7));

          // Insert invitation directly using admin client
          const { data: invitation, error: inviteError } = await adminClient
            .from('invitations')
            .insert({
              email: data.ownerEmail,
              account_id: account.id,
              invited_by: currentUserId,
              role: ownerRole,
              invite_token: inviteToken,
              expires_at: expiresAt,
            })
            .select('*')
            .single();

          if (inviteError || !invitation) {
            throw inviteError || new Error('Failed to create invitation');
          }

          logger.info(
            {
              ...logContext,
              accountId: account.id,
              accountSlug: account.slug,
            },
            'Owner invitation created successfully',
          );

          // 5. Add a flag in the account metadata to indicate this is pending owner transfer
          await adminClient
            .from('accounts')
            .update({
              public_data: {
                pending_owner_email: data.ownerEmail,
              },
            })
            .eq('id', account.id);

          // Revalidate paths to update UI
          revalidatePath('/admin/accounts', 'page');

          return {
            success: true,
            accountId: account.id,
            accountSlug: account.slug,
          };
        } catch (inviteError) {
          logger.error(
            { ...logContext, error: inviteError },
            'Failed to create invitation',
          );
          return {
            success: false,
            error: 'Failed to create invitation for owner',
          };
        }
      } catch (error) {
        logger.error(
          { ...logContext, error },
          'Unexpected error creating team with owner',
        );
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        };
      }
    },
    {
      schema: CreateTeamWithOwnerSchema,
    },
  ),
);
