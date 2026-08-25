import { redirect } from 'next/navigation';

import { MultiFactorChallengeContainer } from '@tm/auth/mfa';
import { checkRequiresMultiFactorAuthentication } from '@tm/supabase/check-requires-mfa';
import { requireUser } from '@tm/supabase/require-user';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

interface Props {
  searchParams: Promise<{
    next?: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('auth:signIn'),
  };
};

async function VerifyPage(props: Props) {
  const client = getSupabaseServerClient();
  const needsMfa = await checkRequiresMultiFactorAuthentication(client);

  if (!needsMfa) {
    redirect(pathsConfig.auth.signIn);
  }

  const searchParams = await props.searchParams;

  const redirectPath = searchParams.next ?? pathsConfig.app.home;
  const auth = await requireUser(client);

  if (auth.error) {
    redirect(auth.redirectTo);
  }

  return (
    <MultiFactorChallengeContainer
      userId={auth.data.id}
      paths={{
        redirectPath,
      }}
    />
  );
}

export default withI18n(VerifyPage);
