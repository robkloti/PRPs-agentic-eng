'use client';

import { TeamAccountAccountsSelector } from '~/home/_components/navigation/team-account-accounts-selector';

interface SettingsTeamSelectorProps {
  userId: string;
  account: string;
  accounts: Array<{
    label: string | null;
    value: string | null;
    image: string | null;
  }>;
}

export function SettingsTeamSelector({
  userId,
  account,
  accounts,
}: SettingsTeamSelectorProps) {
  return (
    <TeamAccountAccountsSelector
      userId={userId}
      selectedAccount={account}
      accounts={accounts}
    />
  );
}
