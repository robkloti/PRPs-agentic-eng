import { cache } from 'react';

import { AdminAccountPage } from '@tm/admin/components/admin-account-page';
import { AdminGuard } from '@tm/admin/components/admin-guard';
import { getSupabaseServerClient } from '@tm/supabase/server-client';
import { PageBody } from '@tm/ui/page';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export const generateMetadata = async ({ params }: Params) => {
  const account = await loadAccount((await params).id);

  return {
    title: `Admin | ${account.name}`,
  };
};

async function AccountPage({ params }: Params) {
  const account = await loadAccount((await params).id);

  return (
    <PageBody className={'py-4'}>
      <AdminAccountPage account={account} />
    </PageBody>
  );
}

export default AdminGuard(AccountPage);

const loadAccount = cache(accountLoader);

async function accountLoader(id: string) {
  const client = getSupabaseServerClient({
    admin: true,
  });

  const { data, error } = await client
    .from('accounts')
    .select('*, memberships: accounts_memberships (*)')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
