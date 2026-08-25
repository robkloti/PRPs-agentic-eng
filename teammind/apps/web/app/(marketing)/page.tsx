import Image from 'next/image';
import Link from 'next/link';

import {
  BookOpen,
  Check,
  ChevronRight,
  Database,
  FileText,
  MessageSquare,
  Sparkle,
  SquareDashedKanban,
  Users,
} from 'lucide-react';

import { PricingTable } from '@tm/billing-gateway/marketing';
import billingConfig from '@tm/billing/config';
import { Button } from '@tm/ui/button';
import { Heading } from '@tm/ui/heading';
import { LazyVideo } from '@tm/ui/lazy-video';
import { Trans } from '@tm/ui/trans';
import { cn } from '@tm/ui/utils';

import pathsConfig from '~/config/paths.config';
import { withI18n } from '~/lib/i18n/with-i18n';

function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section with Problem Statement */}
      <section className="flex min-h-[60vh] items-center py-16">
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-purple/5 to-brand-blue/5 dark:opacity-10" />
          <div className="absolute right-1/4 top-20 h-64 w-64 rounded-full bg-brand-purple/10 opacity-50" />
          <div className="absolute left-1/4 top-40 h-48 w-48 rounded-full bg-brand-blue/10 opacity-50" />

          <div className="relative flex flex-col px-6 py-12 duration-500 animate-in fade-in zoom-in-95 slide-in-from-top-24 md:px-12 lg:px-16">
            <div className="flex flex-col items-center space-y-8 text-center">
              <HeroTitle>
                <span>
                  <Trans i18nKey={'marketing:heroTitle1'} />
                </span>
                <span>
                  <span>
                    <Trans i18nKey={'marketing:heroTitle2'} />
                  </span>
                </span>
              </HeroTitle>

              <Heading
                level={2}
                className="max-w-3xl text-center font-sans text-xl font-normal text-muted-foreground md:text-2xl"
              >
                <Trans i18nKey={'marketing:heroSubtitle'} />
              </Heading>

              <div className="mt-6 flex flex-col gap-4 md:flex-row">
                <MainCallToActionButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrated Workflow + User Story Section */}
      <section className="min-h-[60vh] bg-slate-50 py-24 dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <Heading level={2} className="mb-4">
              <Trans i18nKey={'marketing:workflowTitle'} />
            </Heading>
            <p className="mx-auto max-w-3xl text-muted-foreground">
              <Trans i18nKey={'marketing:workflowSubtitle'} />
            </p>
          </div>

          {/* Integrated Workflow + User Story Cards */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Capture + Product Managers */}
            <WorkflowStoryCard
              step={<Trans i18nKey={'marketing:workflowStep1Number'} />}
              title={<Trans i18nKey={'marketing:workflowStep1Title'} />}
              description={
                <Trans i18nKey={'marketing:workflowStep1Description'} />
              }
              roleIcon={
                <SquareDashedKanban className="h-5 w-5 text-brand-purple" />
              }
              roleTitle={<Trans i18nKey={'marketing:userStory1Title'} />}
              benefits={[
                <Trans key="1-1" i18nKey={'marketing:userStory1Benefit1'} />,
                <Trans key="1-2" i18nKey={'marketing:userStory1Benefit2'} />,
                <Trans key="1-3" i18nKey={'marketing:userStory1Benefit3'} />,
              ]}
            />

            {/* Organize + Technical Writers */}
            <WorkflowStoryCard
              step={<Trans i18nKey={'marketing:workflowStep2Number'} />}
              title={<Trans i18nKey={'marketing:workflowStep2Title'} />}
              description={
                <Trans i18nKey={'marketing:workflowStep2Description'} />
              }
              roleIcon={<FileText className="h-5 w-5 text-brand-blue" />}
              roleTitle={<Trans i18nKey={'marketing:userStory2Title'} />}
              benefits={[
                <Trans key="2-1" i18nKey={'marketing:userStory2Benefit1'} />,
                <Trans key="2-2" i18nKey={'marketing:userStory2Benefit2'} />,
                <Trans key="2-3" i18nKey={'marketing:userStory2Benefit3'} />,
              ]}
            />

            {/* Access + Teams */}
            <WorkflowStoryCard
              step={<Trans i18nKey={'marketing:workflowStep3Number'} />}
              title={<Trans i18nKey={'marketing:workflowStep3Title'} />}
              description={
                <Trans i18nKey={'marketing:workflowStep3Description'} />
              }
              roleIcon={<Users className="h-5 w-5 text-brand-purple" />}
              roleTitle={<Trans i18nKey={'marketing:userStory3Title'} />}
              benefits={[
                <Trans key="3-1" i18nKey={'marketing:userStory3Benefit1'} />,
                <Trans key="3-2" i18nKey={'marketing:userStory3Benefit2'} />,
                <Trans key="3-3" i18nKey={'marketing:userStory3Benefit3'} />,
              ]}
            />
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="min-h-[60vh] py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-24">
            {/* Create Feature */}
            <FeatureShowcaseContainer>
              <FeatureContainer reverse>
                <div className="flex justify-center">
                  <div className="relative w-auto overflow-hidden rounded-xl border shadow-md">
                    <LazyVideo
                      webmSrc="/videos/lp/tm-create-demo.webm"
                      mp4Src="/videos/lp/tm-create-demo.mp4"
                      posterSrc="/videos/lp/tm-create-demo.webp"
                      width={475}
                      height={550}
                      className="relative rounded-lg"
                      priority={true} // Make the first visible video load with priority
                    />
                  </div>
                </div>
              </FeatureContainer>
              <FeatureContainer>
                <div className={'flex flex-col space-y-6'}>
                  <IconContainer className="bg-brand-purple-light text-brand-purple">
                    <BookOpen size={24} />
                    <span className="ml-2 font-medium">
                      <Trans i18nKey={'marketing:createLabel'} />
                    </span>
                  </IconContainer>

                  <div className={'flex flex-col'}>
                    <Heading level={2}>
                      <Trans i18nKey={'marketing:createTitle'} />
                    </Heading>

                    <Heading
                      level={5}
                      className={'font-sans font-normal text-muted-foreground'}
                    >
                      <Trans i18nKey={'marketing:createSubtitle'} />
                    </Heading>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <FeaturePoint
                    title={<Trans i18nKey={'marketing:createFeature1Title'} />}
                    description={
                      <Trans i18nKey={'marketing:createFeature1Description'} />
                    }
                  />
                  <FeaturePoint
                    title={<Trans i18nKey={'marketing:createFeature2Title'} />}
                    description={
                      <Trans i18nKey={'marketing:createFeature2Description'} />
                    }
                  />
                  <FeaturePoint
                    title={<Trans i18nKey={'marketing:createFeature3Title'} />}
                    description={
                      <Trans i18nKey={'marketing:createFeature3Description'} />
                    }
                  />
                </div>
              </FeatureContainer>
            </FeatureShowcaseContainer>
          </div>

          <div className="mb-24">
            {/* Think Feature */}
            <FeatureShowcaseContainer>
              <FeatureContainer>
                <div className={'flex flex-col space-y-6'}>
                  <IconContainer className="bg-brand-blue-light text-brand-blue">
                    <MessageSquare size={24} />
                    <span className="ml-2 font-medium">
                      <Trans i18nKey={'marketing:thinkLabel'} />
                    </span>
                  </IconContainer>

                  <div className={'flex flex-col'}>
                    <Heading level={2}>
                      <Trans i18nKey={'marketing:thinkTitle'} />
                    </Heading>

                    <Heading
                      level={5}
                      className={'font-sans font-normal text-muted-foreground'}
                    >
                      <Trans i18nKey={'marketing:thinkSubtitle'} />
                    </Heading>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <FeaturePoint
                    title={<Trans i18nKey={'marketing:thinkFeature1Title'} />}
                    description={
                      <Trans i18nKey={'marketing:thinkFeature1Description'} />
                    }
                  />
                  <FeaturePoint
                    title={<Trans i18nKey={'marketing:thinkFeature2Title'} />}
                    description={
                      <Trans i18nKey={'marketing:thinkFeature2Description'} />
                    }
                  />
                  <FeaturePoint
                    title={<Trans i18nKey={'marketing:thinkFeature3Title'} />}
                    description={
                      <Trans i18nKey={'marketing:thinkFeature3Description'} />
                    }
                  />
                </div>
              </FeatureContainer>

              <FeatureContainer>
                <div className="flex justify-center">
                  <div className="relative w-auto overflow-hidden rounded-xl border shadow-md">
                    <LazyVideo
                      webmSrc="/videos/lp/tm-think-demo.webm"
                      mp4Src="/videos/lp/tm-think-demo.mp4"
                      posterSrc="/videos/lp/tm-think-demo.webp"
                      width={475}
                      height={550}
                      className="relative rounded-lg"
                    />
                  </div>
                </div>
              </FeatureContainer>
            </FeatureShowcaseContainer>
          </div>

          <div className="mb-12">
            {/* Cleanup Feature */}
            <FeatureShowcaseContainer>
              <FeatureContainer reverse>
                <div className="flex justify-center">
                  <div className="relative w-auto overflow-hidden rounded-xl border shadow-md">
                    <LazyVideo
                      webmSrc="/videos/lp/tm-cleanup-demo.webm"
                      mp4Src="/videos/lp/tm-cleanup-demo.mp4"
                      posterSrc="/videos/lp/tm-cleanup-demo.webp"
                      width={475}
                      height={550}
                      className="relative rounded-lg"
                    />
                  </div>
                </div>
              </FeatureContainer>

              <FeatureContainer>
                <div className={'flex flex-col space-y-6'}>
                  <IconContainer className="bg-brand-blue-light text-brand-blue">
                    <FileText size={24} />
                    <span className="ml-2 font-medium">
                      <Trans i18nKey={'marketing:cleanupLabel'} />
                    </span>
                  </IconContainer>

                  <div className={'flex flex-col'}>
                    <Heading level={2}>
                      <Trans i18nKey={'marketing:cleanupTitle'} />
                    </Heading>

                    <Heading
                      level={5}
                      className={'font-sans font-normal text-muted-foreground'}
                    >
                      <Trans i18nKey={'marketing:cleanupSubtitle'} />
                    </Heading>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <FeaturePoint
                    title={<Trans i18nKey={'marketing:cleanupFeature1Title'} />}
                    description={
                      <Trans i18nKey={'marketing:cleanupFeature1Description'} />
                    }
                  />
                  <FeaturePoint
                    title={<Trans i18nKey={'marketing:cleanupFeature2Title'} />}
                    description={
                      <Trans i18nKey={'marketing:cleanupFeature2Description'} />
                    }
                  />
                  <FeaturePoint
                    title={<Trans i18nKey={'marketing:cleanupFeature3Title'} />}
                    description={
                      <Trans i18nKey={'marketing:cleanupFeature3Description'} />
                    }
                  />
                </div>
              </FeatureContainer>
            </FeatureShowcaseContainer>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="min-h-[60vh] bg-slate-50 py-24 dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FeatureShowcaseContainer>
            <FeatureContainer>
              <div className={'flex flex-col space-y-6'}>
                <IconContainer className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Database size={24} />
                  <span className="ml-2 font-medium">
                    <Trans i18nKey={'marketing:integrationsLabel'} />
                  </span>
                </IconContainer>

                <div className={'flex flex-col'}>
                  <Heading level={2}>
                    <Trans i18nKey={'marketing:integrationsTitle'} />
                  </Heading>

                  <Heading
                    level={5}
                    className={'font-sans font-normal text-muted-foreground'}
                  >
                    <Trans i18nKey={'marketing:integrationsSubtitle'} />
                  </Heading>
                </div>
              </div>

              <div className="mt-4">
                <Trans i18nKey={'marketing:integrationsDescription'} />
              </div>
              <div className="mt-6">
                <MainCallToActionButton />
              </div>
            </FeatureContainer>

            <FeatureIconBox
              icons={[
                {
                  src: '/images/connectors/jira-icon.svg',
                  alt: 'Jira',
                  title: 'Jira',
                },
                {
                  src: '/images/connectors/confluence-icon.svg',
                  alt: 'Confluence',
                  title: 'Confluence',
                },
                {
                  src: '/images/connectors/sharepoint-icon.svg',
                  alt: 'Sharepoint',
                  title: 'Sharepoint',
                },
                {
                  src: '/images/connectors/onenote-icon.svg',
                  alt: 'Onenote',
                  title: 'Onenote',
                },
                {
                  src: '/images/connectors/google_drive-icon.svg',
                  alt: 'Google Drive',
                  title: 'Google Drive',
                },
                {
                  src: '/images/connectors/notion-icon.svg',
                  alt: 'Notion',
                  title: 'Notion',
                },
              ]}
              className="mt-4"
            />
          </FeatureShowcaseContainer>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start lg:flex-row lg:items-center lg:space-x-16">
            <div className="mb-8 lg:mb-0 lg:w-1/3">
              <IconPill>
                <Image
                  src="/images/icons/security-eu-check.svg"
                  alt="EU Security Compliance"
                  width={70}
                  height={70}
                  className="dark:invert"
                />
                <Image
                  src="/images/icons/security-iso.svg"
                  alt="ISO Certification"
                  width={70}
                  height={70}
                  className="dark:invert"
                />
                <Image
                  src="/images/icons/security-soc2.svg"
                  alt="SOC2 Compliance"
                  width={70}
                  height={70}
                  className="dark:invert"
                />
              </IconPill>
            </div>

            <div className="flex flex-col lg:w-2/3">
              <HeroTitle className="mb-6 !text-left">
                <span>
                  <Trans i18nKey={'marketing:securityTitle'} />
                </span>
              </HeroTitle>

              <Heading
                level={5}
                className={
                  'max-w-3xl font-sans font-normal text-muted-foreground'
                }
              >
                <Trans i18nKey={'marketing:securityDescription'} />
              </Heading>

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <SecurityFeature
                  title={<Trans i18nKey={'marketing:securityFeature1Title'} />}
                  description={
                    <Trans i18nKey={'marketing:securityFeature1Description'} />
                  }
                />
                <SecurityFeature
                  title={<Trans i18nKey={'marketing:securityFeature3Title'} />}
                  description={
                    <Trans i18nKey={'marketing:securityFeature3Description'} />
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-16">
            <div className="flex flex-col items-center space-y-8 text-center">
              <Pill>
                <Trans i18nKey={'marketing:pricingTagline'} />
              </Pill>

              <div className="flex flex-col space-y-2">
                <Heading level={1}>
                  <Trans i18nKey={'marketing:pricingTitle'} />
                </Heading>

                <Heading
                  level={2}
                  className="font-sans font-normal text-muted-foreground"
                >
                  <Trans i18nKey={'marketing:pricingSubtitle'} />
                </Heading>
              </div>
            </div>

            <div className="w-full">
              <PricingTable
                config={billingConfig}
                paths={{
                  signUp: pathsConfig.auth.signUp,
                  return: pathsConfig.app.home,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - with animated gradient background */}
      <section className="relative overflow-hidden py-24">
        {/* Animated gradient background */}
        <div className="animated-gradient-background absolute inset-0 opacity-90" />

        {/* Content with glass morphism effect */}
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-8 text-center">
            <Heading level={2} className="text-white">
              <Trans i18nKey={'marketing:ctaTitle'} />
            </Heading>

            <Heading
              level={5}
              className="max-w-2xl font-sans font-normal text-white/80"
            >
              <Trans i18nKey={'marketing:ctaDescription'} />
            </Heading>

            <div className="mt-8">
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="bg-white/90 text-brand-purple shadow-xl backdrop-blur-sm hover:bg-white"
              >
                <Link href={'/get-access'}>
                  <span className="flex items-center space-x-2">
                    <span>
                      <Trans i18nKey={'marketing:ctaButton'} />
                    </span>
                    <ChevronRight className="h-5 w-5" />
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default withI18n(Home);

// New Combined Workflow + User Story Card
function WorkflowStoryCard({
  step,
  title,
  description,
  roleIcon,
  roleTitle,
  benefits,
}: {
  step: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  roleIcon: React.ReactNode;
  roleTitle: React.ReactNode;
  benefits: React.ReactNode[];
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      {/* Workflow Part */}
      <div className="border-b p-6 dark:border-slate-700">
        <div className="mb-4 flex items-center">
          <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple/10 font-bold text-brand-purple">
            {step}
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* User Story Part */}
      <div className="flex-grow bg-slate-50 p-6 dark:bg-slate-800/50">
        <div className="mb-4 flex items-center">
          <div className="mr-3 rounded-full bg-slate-100 p-2 dark:bg-slate-700">
            {roleIcon}
          </div>
          <h4 className="font-medium">{roleTitle}</h4>
        </div>

        <ul className="space-y-2">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-start">
              <Check className="mr-2 mt-1 h-4 w-4 flex-shrink-0 text-brand-purple" />
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Helper Components
function HeroTitle({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <h1
      className={cn(
        'flex flex-col text-center font-heading text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl',
        'overflow-wrap-break-word word-break-break-word max-w-full hyphens-auto',
        className,
      )}
    >
      {children}
    </h1>
  );
}

function Pill(props: React.PropsWithChildren) {
  return (
    <h2
      className={
        'rounded-full bg-white px-4 py-2 text-center text-sm text-muted-foreground shadow transition-all hover:shadow-md dark:bg-slate-800 dark:shadow-primary/20'
      }
    >
      <Sparkle className={'mr-1 inline-block h-4'} />
      {props.children}
    </h2>
  );
}

function IconPill(props: React.PropsWithChildren) {
  return (
    <div
      className={
        'mx-auto flex h-[100px] w-fit items-center justify-center rounded-full bg-white/90 px-6 shadow backdrop-blur-sm transition-all hover:shadow-lg dark:bg-slate-800/90 dark:shadow-primary/20'
      }
    >
      <div className="flex space-x-4">{props.children}</div>
    </div>
  );
}

function FeatureShowcaseContainer(props: React.PropsWithChildren) {
  return (
    <div className="flex flex-col items-start justify-between space-y-12 lg:flex-row lg:space-x-24 lg:space-y-0">
      {props.children}
    </div>
  );
}

function FeatureContainer(
  props: React.PropsWithChildren<{
    className?: string;
    reverse?: boolean;
  }>,
) {
  return (
    <div
      className={cn('flex w-full flex-col space-y-6 lg:w-6/12', {
        'order-2 mt-8 lg:order-none lg:mt-0': props.reverse,
      })}
    >
      {props.children}
    </div>
  );
}

function FeatureIconBox({
  icons,
  className,
}: {
  icons: { src: string; alt: string; title?: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-[600px] grid-cols-2 gap-5',
        className,
      )}
    >
      {icons.map((icon, index) => (
        <div
          key={index}
          className="flex h-[120px] flex-col items-center justify-center rounded-xl border bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:bg-slate-50 hover:shadow-md dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          {icon.title && (
            <h4 className="mb-3 text-center text-sm font-medium">
              {icon.title}
            </h4>
          )}
          <Image
            src={icon.src}
            alt={icon.alt}
            width={40}
            height={40}
            className="dark:invert"
          />
        </div>
      ))}
    </div>
  );
}

function MainCallToActionButton() {
  return (
    <div className={'flex space-x-2'}>
      <Button
        asChild
        size="lg"
        className="btn-brand-primary shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl"
      >
        <Link href={'/get-access'}>
          <span className={'flex items-center space-x-2'}>
            <span>
              <Trans i18nKey={'marketing:getStartedButton'} />
            </span>

            <ChevronRight className="h-5 w-5" />
          </span>
        </Link>
      </Button>
    </div>
  );
}

function IconContainer(
  props: React.PropsWithChildren<{
    className?: string;
  }>,
) {
  return (
    <div className={'flex'}>
      <span
        className={cn(
          'flex items-center justify-center rounded-lg p-3 transition-all hover:shadow-md',
          props.className,
        )}
      >
        {props.children}
      </span>
    </div>
  );
}

function FeaturePoint({
  title,
  description,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-bold">{title}</h4>
      <p className="pl-4 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SecurityFeature({
  title,
  description,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-slate-800">
      <div className="mb-3 flex items-center">
        <div className="bg-brand-purple-light mr-3 rounded-full p-2">
          <Check className="h-5 w-5 text-brand-purple" />
        </div>
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
