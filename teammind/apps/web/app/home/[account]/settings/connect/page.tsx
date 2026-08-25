import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tm/ui/card';
import { Trans } from '@tm/ui/trans';

import { ConnectorsContainer } from '~/home/[account]/_components/connectors';
import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { withI18n } from '~/lib/i18n/with-i18n';

interface Params {
  account: string;
}

async function ConnectPage({ params }: { params: Promise<Params> }) {
  const { account } = await params;
  const workspace = await loadTeamWorkspace(account);

  return (
    <div className="flex flex-col space-y-6 pb-32">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="connect:pageTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="connect:pageDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectorsContainer
            userId={workspace.user.id}
            accountSlug={account}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default withI18n(ConnectPage);
