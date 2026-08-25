import Link from 'next/link';

import {
  Check,
  ChevronRight,
  Clock,
  FileText,
  ListTodo,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@tm/ui/button';
import { Card, CardContent } from '@tm/ui/card';

// CTA Landing Page Component for users without meeting hours in their plan
export function CreateFeatureCTA() {
  const { t } = useTranslation('create');

  return (
    <div className="h-full w-full max-w-5xl space-y-8">
      <Card className="overflow-hidden border-2 border-primary">
        <div className="bg-primary p-6">
          <h1 className="text-3xl font-bold text-primary-foreground">
            {t('transformYourMeetings')}
          </h1>
          <p className="mt-2 text-primary-foreground/80">
            {t('turnMeetingConversations')}
          </p>
        </div>

        <CardContent className="p-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">
                {t('whyYouNeedTeamMindCreate')}
              </h2>
              <p className="text-muted-foreground">
                {t('stopLosingImportantDecisions')}
              </p>

              <div className="space-y-4">
                <FeatureItem
                  icon={Clock}
                  title={t('saveTime')}
                  description={t('eliminateManualNoteTaking')}
                />
                <FeatureItem
                  icon={FileText}
                  title={t('automaticDocumentUpdates')}
                  description={t('updatesYourKnowledgeBase')}
                />
                <FeatureItem
                  icon={ListTodo}
                  title={t('ticketCreationUpdates')}
                  description={t('automaticallyCreateAndUpdateTickets')}
                />
                <FeatureItem
                  icon={Zap}
                  title={t('enhancedProductivity')}
                  description={t('focusOnDiscussionsNotDocumentation')}
                />
              </div>

              <Button asChild size="lg" className="mt-4 w-full">
                <Link href="settings/support">
                  {t('upgradeToTeamMindCreate')}{' '}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-lg bg-muted p-6">
              <h3 className="mb-4 text-xl font-medium">{t('whatsIncluded')}</h3>

              <div className="space-y-4">
                <div className="rounded-lg bg-background p-4">
                  <h4 className="font-medium">{t('thinkAndCreate')}</h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li className="flex items-center">
                      <div className="mr-2 rounded-full bg-green-500/20 p-1">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <span>{t('everythingInThinkPlan')}</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 rounded-full bg-green-500/20 p-1">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <span>{t('aiPoweredKnowledgeHub')}</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 rounded-full bg-green-500/20 p-1">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <span>{t('fiveHoursOfSmartMeetingCoverage')}</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 rounded-full bg-green-500/20 p-1">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <span>{t('intelligentDocumentGeneration')}</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg bg-background p-4">
                  <h4 className="font-medium">{t('thinkAndCreatePro')}</h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li className="flex items-center">
                      <div className="mr-2 rounded-full bg-green-500/20 p-1">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <span>{t('everythingInThinkAndCreatePlan')}</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 rounded-full bg-green-500/20 p-1">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <span>{t('tenHoursOfSmartMeetingCoverage')}</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 rounded-full bg-green-500/20 p-1">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <span>{t('advancedAnalyticsAndReporting')}</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 rounded-full bg-green-500/20 p-1">
                        <Check className="h-3 w-3 text-green-500" />
                      </div>
                      <span>
                        {t('prioritySupportAndImplementationAssistance')}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Feature item component for the CTA page
function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start">
      <div className="mr-4 rounded-lg bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
