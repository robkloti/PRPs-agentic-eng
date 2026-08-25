import { Clock, Lock, Sparkle } from 'lucide-react';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { AccessForm } from './_components/access-form';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:getAccess'),
    description: t('marketing:getAccessDescription'),
  };
}

async function GetAccessPage() {
  const { t } = await createI18nServerInstance();

  return (
    <div className="relative flex flex-col pt-16">
      <div className="absolute inset-0 opacity-5 dark:opacity-10" />

      {/* Hero section with big heading */}
      <div className="relative py-16 text-center">
        <div className="container mx-auto px-4">
          <h1 className="mb-4 font-heading text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
            {t('marketing:getAccessHeading')}
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground">
            {t('marketing:getAccessSubheading')}
          </p>

          {/* Centered email form */}
          <div className="relative mx-auto max-w-lg">
            <AccessForm />
          </div>
        </div>
      </div>

      {/* Three benefits section */}
      <div className="container relative mx-auto py-16 backdrop-blur-sm">
        <div className="grid gap-8 md:grid-cols-3">
          <BenefitItem
            icon={<Sparkle className="h-6 w-6 text-brand-purple" />}
            title={t('marketing:benefit1Title')}
            description={t('marketing:benefit1Description')}
          />

          <BenefitItem
            icon={<Clock className="h-6 w-6 text-brand-blue" />}
            title={t('marketing:benefit2Title')}
            description={t('marketing:benefit2Description')}
          />

          <BenefitItem
            icon={<Lock className="h-6 w-6 text-brand-coral" />}
            title={t('marketing:benefit3Title')}
            description={t('marketing:benefit3Description')}
          />
        </div>
      </div>
    </div>
  );
}

function BenefitItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group flex flex-col items-center text-center">
      <div className="mb-4 rounded-full bg-primary/5 p-4 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-brand-purple/10">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default withI18n(GetAccessPage);
