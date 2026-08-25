'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { enhanceAction } from '@tm/next/actions';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import {
  BanUserSchema,
  DeleteAccountSchema,
  DeleteUserSchema,
  ImpersonateUserSchema,
  ReactivateUserSchema,
} from './schema/admin-actions.schema';
import { createAdminAccountsService } from './services/admin-accounts.service';
import { createAdminAuthUserService } from './services/admin-auth-user.service';
import { adminAction } from './utils/admin-action';

/**
 * @name banUserAction
 * @description Ban a user from the system.
 */
export const banUserAction = adminAction(
  enhanceAction(
    async ({ userId }) => {
      const service = await getAdminAuthService();

      await service.banUser(userId);

      revalidateAdmin();

      return {
        success: true,
      };
    },
    {
      schema: BanUserSchema,
    },
  ),
);

/**
 * @name reactivateUserAction
 * @description Reactivate a user in the system.
 */
export const reactivateUserAction = adminAction(
  enhanceAction(
    async ({ userId }) => {
      const service = await getAdminAuthService();

      await service.reactivateUser(userId);

      revalidateAdmin();

      return {
        success: true,
      };
    },
    {
      schema: ReactivateUserSchema,
    },
  ),
);

/**
 * @name impersonateUserAction
 * @description Impersonate a user in the system.
 */
export const impersonateUserAction = adminAction(
  enhanceAction(
    async ({ userId }) => {
      const service = await getAdminAuthService();

      return await service.impersonateUser(userId);
    },
    {
      schema: ImpersonateUserSchema,
    },
  ),
);

/**
 * @name deleteUserAction
 * @description Delete a user from the system.
 */
export const deleteUserAction = adminAction(
  enhanceAction(
    async ({ userId }) => {
      const service = await getAdminAuthService();

      await service.deleteUser(userId);

      revalidateAdmin();

      return redirect('/admin/accounts');
    },
    {
      schema: DeleteUserSchema,
    },
  ),
);

/**
 * @name deleteAccountAction
 * @description Delete an account from the system.
 */
export const deleteAccountAction = adminAction(
  enhanceAction(
    async ({ accountId }) => {
      const service = await getAdminAccountsService();

      await service.deleteAccount(accountId);

      revalidateAdmin();

      return redirect('/admin/accounts');
    },
    {
      schema: DeleteAccountSchema,
    },
  ),
);

async function getAdminAuthService() {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerClient({ admin: true });

  return createAdminAuthUserService(client, adminClient);
}

async function getAdminAccountsService() {
  const adminClient = getSupabaseServerClient({ admin: true });

  return createAdminAccountsService(adminClient);
}

function revalidateAdmin() {
  revalidatePath('/admin', 'layout');
}
