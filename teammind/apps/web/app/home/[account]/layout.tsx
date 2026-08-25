import { withI18n } from '~/lib/i18n/with-i18n';

import { WorkspaceLayout } from '../_components/navigation/workspace-layout';

interface Params {
  account: string;
}

async function TeamWorkspaceLayout({
  children,
  params,
}: React.PropsWithChildren<{
  params: Promise<Params>;
}>) {
  return (
    <WorkspaceLayout account={(await params).account}>
      {children}
    </WorkspaceLayout>
  );
}

export default withI18n(TeamWorkspaceLayout);
