import { Suspense } from 'react';

import { Spinner } from '@tm/ui/spinner';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import ChatRuntime from './_components/chat-runtime';

interface Props {
  params: Promise<{
    account: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('chat:pageTitle');

  return {
    title,
  };
};

async function ChatPage({ params }: Props) {
  const { account } = await params;
  const { user } = await loadTeamWorkspace(account);
  return (
    // Add explicit flex layout and height constraints !!! THIS IS IMPORTANT FOR SCROLLING BEHAVIOR !!!
    <div className="flex h-full max-h-[calc(100vh-56px)] flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Spinner className="size-6" />
          </div>
        }
      >
        <ChatRuntime userId={user.id} accountSlug={account} />
      </Suspense>
    </div>
  );
}

export default withI18n(ChatPage);
