import Link from 'next/link';

import { ServerDataLoader } from '@makerkit/data-loader-supabase-nextjs';
import { PlusCircle } from 'lucide-react';

import { AdminAccountsTable } from '@tm/admin/components/admin-accounts-table';
import { AdminGuard } from '@tm/admin/components/admin-guard';
import { getSupabaseServerClient } from '@tm/supabase/server-client';
import { Button } from '@tm/ui/button';
import { PageBody, PageHeader } from '@tm/ui/page';

interface SearchParams {
  page?: string;
  account_type?: 'all' | 'team' | 'personal';
  query?: string;
}

export const metadata = {
  title: `Accounts`,
};

async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const client = getSupabaseServerClient({
    admin: true,
  });

  const search = await searchParams;

  const page = search.page ? parseInt(search.page) : 1;
  const filters = getFilters(search);

  return (
    <>
      <PageHeader
        title={'Accounts'}
        description={`Below is the list of all the accounts in your application.`}
      >
        <Button asChild>
          <Link href="/admin/accounts/create-team">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Team Account
          </Link>
        </Button>
      </PageHeader>

      <PageBody>
        <ServerDataLoader
          table={'accounts'}
          client={client}
          page={page}
          where={filters}
        >
          {({ data, page, pageSize, pageCount }) => {
            return (
              <AdminAccountsTable
                page={page}
                pageSize={pageSize}
                pageCount={pageCount}
                data={data}
                filters={{
                  type: search.account_type ?? 'all',
                }}
              />
            );
          }}
        </ServerDataLoader>
      </PageBody>
    </>
  );
}

function getFilters(params: SearchParams) {
  const filters: Record<
    string,
    {
      eq?: boolean | string;
      like?: string;
    }
  > = {};

  if (params.account_type && params.account_type !== 'all') {
    filters.is_personal_account = {
      eq: params.account_type === 'personal',
    };
  }

  if (params.query) {
    filters.name = {
      like: `%${params.query}%`,
    };
  }

  return filters;
}

export default AdminGuard(AccountsPage);
