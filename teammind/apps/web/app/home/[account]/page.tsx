import { getSupabaseServerClient } from '@tm/supabase/server-client';
import { PageBody } from '@tm/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { loadTeamWorkspace } from './_lib/server/team-account-workspace.loader';
import { Database } from '~/lib/database.types';
import { fetchAvailableSources } from '~/lib/available-sources';
import { ChatInput } from './_components/home-page/chat-input';
import { RecentConversationsCollapsible } from './_components/home-page/recent-conversations-collapsible';

type CountDocumentsBySourceType = 
  Database['public']['Functions']['count_documents_by_source_type'];

interface Props {
  params: Promise<{
    account: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('teams:home.pageTitle');

  return {
    title,
  };
};

async function TeamAccountHomePage({ params }: Props) {
  const { account } = await params;
  const workspace = await loadTeamWorkspace(account);
  const personalAccountId = workspace.user.id;

  const supabase = getSupabaseServerClient();

  const availableSources = await fetchAvailableSources(supabase);

  return (
    <>
      <PageBody className="flex flex-col items-center p-2">
        <div className="w-full max-w-3xl space-y-8 pt-8">
          <ChatInput
            personalAccountId={personalAccountId}
            accountSlug={account}
            connectorCount={availableSources.length}
            availableSources={availableSources}
          />
          <RecentConversationsCollapsible
            userId={personalAccountId}
            account={account}
          />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountHomePage);
