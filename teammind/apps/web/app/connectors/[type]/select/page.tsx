import { notFound, redirect } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { requireUser } from '@tm/supabase/require-user';
import { getSupabaseServerClient } from '@tm/supabase/server-client';
import { Button } from '@tm/ui/button';
import { Heading } from '@tm/ui/heading';
import { Trans } from '@tm/ui/trans';

import { AppLogo } from '~/components/app-logo';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ConnectorSelect } from './_components/connector-select';
import { ConnectorSelectLayoutShell } from './_components/connector-select-layout';

interface Context {
  params: Promise<{
    type: string;
  }>;
  searchParams: Promise<{
    accountSlug: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('connect:connectors.selectSources'),
  };
};

// Connectors that need selection UI
const SELECTION_CONNECTORS = ['atlassian', 'microsoft', 'google'];

// Connectors that are valid but don't need selection UI
const DIRECT_CONNECTORS = ['notion'];

// Connectors that need a wide layout
const WIDE_LAYOUT_CONNECTORS = ['google'];

// All supported connectors
const SUPPORTED_CONNECTORS = [...SELECTION_CONNECTORS, ...DIRECT_CONNECTORS];

// Get the appropriate layout variant based on connector type
function getLayoutVariant(type: string): 'small' | 'wide' {
  return WIDE_LAYOUT_CONNECTORS.includes(type) ? 'wide' : 'small';
}

async function ConnectorSelectPage({ params, searchParams }: Context) {
  const { type } = await params;
  const { accountSlug } = await searchParams;

  if (!SUPPORTED_CONNECTORS.includes(type)) {
    notFound();
  }

  if (!accountSlug) {
    redirect(pathsConfig.app.home);
  }

  // For Notion, redirect directly to home since selection is handled in OAuth flow
  if (DIRECT_CONNECTORS.includes(type)) {
    redirect(`/home/${accountSlug}`);
  }

  const client = getSupabaseServerClient();
  const auth = await requireUser(client);

  if (auth.error ?? !auth.data) {
    redirect(pathsConfig.auth.signIn);
  }

  return (
    <ConnectorSelectLayoutShell Logo={AppLogo} variant={getLayoutVariant(type)}>
      <div className="flex w-full flex-col space-y-8">
        <div className="flex flex-col space-y-2">
          <Heading level={4}>
            <Trans i18nKey={`connect:connectors.${type}.selectSources`} />
          </Heading>

          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey={`connect:connectors.${type}.selectSourcesDescription`}
            />
          </p>
        </div>

        <ConnectorSelect type={type} accountSlug={accountSlug} />

        <Button variant="outline" className="w-full" asChild>
          <a href={`/home/${accountSlug}/settings/connect`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <Trans i18nKey="common:cancel" />
          </a>
        </Button>
      </div>
    </ConnectorSelectLayoutShell>
  );
}

export default withI18n(ConnectorSelectPage);
