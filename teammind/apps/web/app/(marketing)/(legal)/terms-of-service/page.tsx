import { PageBody } from '@tm/ui/page';
import { Trans } from '@tm/ui/trans';

import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:termsOfService'),
  };
}

async function TermsOfServicePage() {
  const { t } = await createI18nServerInstance();

  return (
    <div className="pt-16">
      <SitePageHeader
        title={t(`marketing:termsOfService`)}
        subtitle={t(`marketing:termsOfServiceDescription`)}
      />

      <div className={'container mx-auto py-8'}>
        <div className="whitespace-pre-wrap">
          <Trans i18nKey="marketing:termsText" />
        </div>
      </div>
    </div>
  );
}

export default withI18n(TermsOfServicePage);
