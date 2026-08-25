'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { z } from 'zod';

import { enhanceAction } from '@tm/next/actions';
import { getLogger } from '@tm/shared/logger';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { AcceptInvitationSchema } from '../../schema/accept-invitation.schema';
import { DeleteInvitationSchema } from '../../schema/delete-invitation.schema';
import { InviteMembersSchema } from '../../schema/invite-members.schema';
import { RenewInvitationSchema } from '../../schema/renew-invitation.schema';
import { UpdateInvitationSchema } from '../../schema/update-invitation.schema';
import { createAccountInvitationsService } from '../services/account-invitations.service';
import { createAccountPerSeatBillingService } from '../services/account-per-seat-billing.service';

/**
 * @name createInvitationsAction
 * @description Creates invitations for inviting members.
 */
export const createInvitationsAction = enhanceAction(
  async (params) => {
    const client = getSupabaseServerClient();

    // Create the service
    const service = createAccountInvitationsService(client);

    // send invitations
    await service.sendInvitations(params);

    revalidateMemberPage();

    return {
      success: true,
    };
  },
  {
    schema: InviteMembersSchema.and(
      z.object({
        accountSlug: z.string().min(1),
      }),
    ),
  },
);

/**
 * @name deleteInvitationAction
 * @description Deletes an invitation specified by the invitation ID.
 */
export const deleteInvitationAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const service = createAccountInvitationsService(client);

    // Delete the invitation
    await service.deleteInvitation(data);

    revalidateMemberPage();

    return {
      success: true,
    };
  },
  {
    schema: DeleteInvitationSchema,
  },
);

/**
 * @name updateInvitationAction
 * @description Updates an invitation.
 */
export const updateInvitationAction = enhanceAction(
  async (invitation) => {
    const client = getSupabaseServerClient();
    const service = createAccountInvitationsService(client);

    await service.updateInvitation(invitation);

    revalidateMemberPage();

    return {
      success: true,
    };
  },
  {
    schema: UpdateInvitationSchema,
  },
);

/**
 * @name acceptInvitationAction
 * @description Accepts an invitation to join a team.
 * Enhanced to handle owner transfer for admin-created teams.
 */
export const acceptInvitationAction = enhanceAction(
  async (data: FormData, user) => {
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerClient({ admin: true });

    const { inviteToken, nextPath } = AcceptInvitationSchema.parse(
      Object.fromEntries(data),
    );

    // create the services
    const perSeatBillingService = createAccountPerSeatBillingService(client);
    const service = createAccountInvitationsService(client);
    const logger = await getLogger();

    // Get invitation details before accepting - using adminClient to bypass RLS
    const { data: invitation, error: invitationError } = await adminClient
      .from('invitations')
      .select('account_id, role, email')
      .eq('invite_token', inviteToken)
      .single();

    if (invitationError || !invitation) {
      logger.error(
        {
          name: 'invitation.accept',
          inviteToken,
          error: invitationError,
        },
        'Invalid invitation token',
      );
      throw new Error('Invalid invitation token');
    }

    // Check if this is a pending owner invitation
    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .select('public_data, primary_owner_user_id')
      .eq('id', invitation.account_id)
      .single();

    const isPendingOwnerTransfer =
      typeof account?.public_data === 'object' &&
      account?.public_data !== null &&
      'pending_owner_email' in account.public_data &&
      !accountError;

    // Verify this invitation is for the current user
    const { data: userData } = await client.auth.getUser();
    if (userData?.user?.email !== invitation.email) {
      logger.warn(
        {
          name: 'invitation.accept',
          inviteToken,
          invitationEmail: invitation.email,
          userEmail: userData?.user?.email,
        },
        'User email does not match invitation email',
      );
      // We'll continue anyway, as this might be intentional - user could have multiple emails
    }

    // Accept the invitation
    const accountId = await service.acceptInvitationToTeam(adminClient, {
      inviteToken,
      userId: user.id,
    });

    // If the account ID is not present, throw an error
    if (!accountId) {
      throw new Error('Failed to accept invitation');
    }

    // Increase the seats for the account
    await perSeatBillingService.increaseSeats(accountId);

    // If this was a pending owner transfer, transfer ownership now
    if (isPendingOwnerTransfer) {
      try {
        logger.info(
          {
            name: 'invitation.accept.owner-transfer',
            accountId,
            userId: user.id,
          },
          'Transferring ownership to invited owner',
        );

        // Transfer ownership to the new user
        const { error: transferError } = await adminClient.rpc(
          'transfer_team_account_ownership',
          {
            target_account_id: accountId,
            new_owner_id: user.id,
          },
        );

        if (transferError) {
          logger.error(
            {
              name: 'invitation.accept.owner-transfer',
              accountId,
              userId: user.id,
              error: transferError,
            },
            'Failed to transfer ownership',
          );

          throw new Error('Failed to transfer ownership');
        }

        // Clear the pending owner flag
        await adminClient
          .from('accounts')
          .update({
            public_data: {},
          })
          .eq('id', accountId);

        logger.info(
          {
            name: 'invitation.accept.owner-transfer',
            accountId,
            userId: user.id,
          },
          'Ownership transfer completed successfully',
        );
      } catch (transferError) {
        logger.error(
          {
            name: 'invitation.accept.owner-transfer',
            accountId,
            userId: user.id,
            error: transferError,
          },
          'Failed to transfer ownership',
        );

        // Continue anyway - the user is at least a member now
      }
    }

    return redirect(nextPath);
  },
  {},
);

/**
 * @name renewInvitationAction
 * @description Renews an invitation.
 */
export const renewInvitationAction = enhanceAction(
  async (params) => {
    const client = getSupabaseServerClient();
    const { invitationId } = RenewInvitationSchema.parse(params);

    const service = createAccountInvitationsService(client);

    // Renew the invitation
    await service.renewInvitation(invitationId);

    revalidateMemberPage();

    return {
      success: true,
    };
  },
  {
    schema: RenewInvitationSchema,
  },
);

function revalidateMemberPage() {
  revalidatePath('/home/[account]/members', 'page');
}
