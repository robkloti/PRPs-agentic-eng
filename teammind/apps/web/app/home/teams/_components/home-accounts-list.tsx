import Link from 'next/link';

import {
  CardButton,
  CardButtonHeader,
  CardButtonTitle,
} from '@tm/ui/card-button';
import { Heading } from '@tm/ui/heading';
import { Trans } from '@tm/ui/trans';

import { loadUserWorkspace } from '~/home/_lib/server/load-user-workspace';

import { HomeAddAccountButton } from './home-add-account-button';

export async function HomeAccountsList() {
  const { accounts } = await loadUserWorkspace();

  if (!accounts.length) {
    return <HomeAccountsListEmptyState />;
  }

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accounts.map((account) => (
          <CardButton key={account.value} asChild>
            <Link href={`/home/${account.value}`}>
              <CardButtonHeader>
                <CardButtonTitle>{account.label}</CardButtonTitle>
              </CardButtonHeader>
            </Link>
          </CardButton>
        ))}
      </div>
    </div>
  );
}

function HomeAccountsListEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-24">
      <div className="flex flex-col items-center space-y-1">
        <Heading level={2}>
          <Trans i18nKey={'account:noTeamsYet'} />
        </Heading>

        <Heading
          className="font-sans font-medium text-muted-foreground"
          level={4}
        >
          <Trans i18nKey={'account:createTeam'} />
        </Heading>
      </div>

      <HomeAddAccountButton />
    </div>
  );
}
