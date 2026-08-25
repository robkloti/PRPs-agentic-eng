'use server';

import { redirect } from 'next/navigation';

import { enhanceAction } from '@tm/next/actions';
import { getLogger } from '@tm/shared/logger';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { CreateTeamSchema } from '../../schema/create-team.schema';
import { createCreateTeamAccountService } from '../services/create-team-account.service';

export const createTeamAccountAction = enhanceAction(
  async ({ name }, user) => {
    const logger = await getLogger();
    const client = getSupabaseServerClient();
    const service = createCreateTeamAccountService(client);

    const ctx = {
      name: 'team-accounts.create',
      userId: user.id,
      accountName: name,
    };

    logger.info(ctx, `Creating team account...`);

    const { data, error } = await service.createNewOrganizationAccount({
      name,
      userId: user.id,
    });

    if (error) {
      logger.error({ ...ctx, error }, `Failed to create team account`);

      throw new Error('Error creating team account');
    }

    logger.info(ctx, `Team account created`);

    const accountHomePath = '/home/' + data.slug;

    redirect(accountHomePath);
  },
  {
    schema: CreateTeamSchema,
  },
);
