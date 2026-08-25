'use client';

import { useState } from 'react';

import { CreateTeamAccountDialog } from '@tm/team-accounts/components';
import { Button } from '@tm/ui/button';
import { Trans } from '@tm/ui/trans';

export function HomeAddAccountButton() {
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setIsAddingAccount(true)}>
          <Trans i18nKey={'account:createTeamButtonLabel'} />
        </Button>

        <Button size="sm" onClick={() => setIsAddingAccount(true)}>
          <Trans i18nKey={'account:joinTeamButtonLabel'} />
        </Button>
      </div>

      <CreateTeamAccountDialog
        isOpen={isAddingAccount}
        setIsOpen={setIsAddingAccount}
      />
    </>
  );
}
