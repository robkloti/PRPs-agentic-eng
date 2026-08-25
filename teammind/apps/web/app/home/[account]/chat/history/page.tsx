import { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseServerClient } from '@tm/supabase/server-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tm/ui/card';
import { PageBody } from '@tm/ui/page';
import { Trans } from '@tm/ui/trans';

import { loadUserWorkspace } from '~/home/_lib/server/load-user-workspace';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ChatHistoryClient } from './components/chat-history-client';

interface Params {
  params: Promise<{
    account: string;
  }>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  return {
    title: i18n.t('chat:history.pageTitle'),
  };
};

async function loadChatHistoryData(
  client: SupabaseClient,
  favoriteFilter = false,
) {
  const { user } = await loadUserWorkspace();

  let query = client
    .from('conversations')
    .select('id, title, created_at, favourite')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (favoriteFilter) {
    query = query.eq('favourite', true);
  }

  const { data: conversations } = await query;

  return { userId: user.id, conversations: conversations ?? [] };
}

async function ChatHistoryPage({ params, searchParams }: Params) {
  const client = getSupabaseServerClient();
  const { account } = await params;

  // Check if favorite filter is enabled in search params
  const favoriteFilter = (await searchParams)?.favorite === 'true';

  const { userId, conversations } = await loadChatHistoryData(
    client,
    favoriteFilter,
  );

  return (
    <PageBody className="flex h-full w-full flex-col items-center py-4">
      <Card className="h-full w-full max-w-4xl">
        <CardHeader>
          <CardTitle>
            <Trans
              i18nKey={
                favoriteFilter
                  ? 'chat:history.favoriteTitle'
                  : 'chat:history.title'
              }
            />
          </CardTitle>
          <CardDescription>
            <Trans
              i18nKey={
                favoriteFilter
                  ? 'chat:history.favoriteDescription'
                  : 'chat:history.description'
              }
            />
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ChatHistoryClient
            initialConversations={conversations}
            accountSlug={account}
            userId={userId}
            initialFavoriteFilter={favoriteFilter}
          />
        </CardContent>
      </Card>
    </PageBody>
  );
}

export default withI18n(ChatHistoryPage);
