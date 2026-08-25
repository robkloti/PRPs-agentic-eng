import Link from 'next/link';

import { ArrowRight, ChevronDown } from 'lucide-react';

import { Button } from '@tm/ui/button';
import { Trans } from '@tm/ui/trans';

import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export const generateMetadata = async () => {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:faqTitle'),
  };
};

async function FAQPage() {
  const { t } = await createI18nServerInstance();

  // FAQ items with translation keys
  const faqItems = [
    {
      question: t('marketing:faq.question1'),
      answer: t('marketing:faq.answer1'),
    },
    {
      question: t('marketing:faq.question2'),
      answer: t('marketing:faq.answer2'),
    },
    {
      question: t('marketing:faq.question3'),
      answer: t('marketing:faq.answer3'),
    },
    {
      question: t('marketing:faq.question4'),
      answer: t('marketing:faq.answer4'),
    },
    {
      question: t('marketing:faq.question5'),
      answer: t('marketing:faq.answer5'),
    },
    {
      question: t('marketing:faq.question6'),
      answer: t('marketing:faq.answer6'),
    },
    {
      question: t('marketing:faq.question7'),
      answer: t('marketing:faq.answer7'),
    },
    {
      question: t('marketing:faq.question8'),
      answer: t('marketing:faq.answer8'),
    },
    {
      question: t('marketing:faq.question9'),
      answer: t('marketing:faq.answer9'),
    },
    {
      question: t('marketing:faq.question10'),
      answer: t('marketing:faq.answer10'),
    },
    {
      question: t('marketing:faq.question11'),
      answer: t('marketing:faq.answer11'),
    },
    {
      question: t('marketing:faq.question12'),
      answer: t('marketing:faq.answer12'),
    },
    {
      question: t('marketing:faq.question13'),
      answer: t('marketing:faq.answer13'),
    },
    {
      question: t('marketing:faq.question14'),
      answer: t('marketing:faq.answer14'),
    },
    {
      question: t('marketing:faq.question15'),
      answer: t('marketing:faq.answer15'),
    },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => {
      return {
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      };
    }),
  };

  return (
    <>
      <script
        key={'ld:json'}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className={'flex flex-col space-y-4 pt-16 xl:space-y-8'}>
        <SitePageHeader
          title={t('marketing:faqTitle')}
          subtitle={t('marketing:faqSubtitle')}
        />

        <div className={'container flex flex-col space-y-8 pb-16'}>
          <div className="flex w-full max-w-3xl flex-col">
            {faqItems.map((item, index) => {
              return <FaqItem key={index} item={item} />;
            })}
          </div>

          <div>
            <Button asChild variant={'outline'}>
              <Link href={'/contact'}>
                <span>
                  <Trans i18nKey={'marketing:contactFaq'} />
                </span>

                <ArrowRight className={'ml-2 w-4'} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default withI18n(FAQPage);

function FaqItem({
  item,
}: React.PropsWithChildren<{
  item: {
    question: string;
    answer: string;
  };
}>) {
  return (
    <details className={'group border-b px-2 py-4 last:border-b-transparent'}>
      <summary
        className={
          'flex items-center justify-between hover:cursor-pointer hover:underline'
        }
      >
        <h2
          className={
            'hover:underline-none cursor-pointer font-sans font-medium'
          }
        >
          {item.question}
        </h2>

        <div>
          <ChevronDown
            className={'h-5 transition duration-300 group-open:-rotate-180'}
          />
        </div>
      </summary>

      <div className={'flex flex-col space-y-2 py-1 text-muted-foreground'}>
        {item.answer}
      </div>
    </details>
  );
}
