'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

// Import useEffect
import { useTranslation } from 'react-i18next';

import { Button } from '@tm/ui/button';
import { Card, CardContent } from '@tm/ui/card';

// Card dismissal key for localStorage
const CREATE_TUTORIAL_CARD_DISMISSED = 'createPage_activeTab';

export function TutorialCard() {
  const { t } = useTranslation('create');
  // Initialize visibility to true, check storage later
  const [isVisible, setIsVisible] = useState(true);

  // Check sessionStorage on mount (client-side only)
  useEffect(() => {
    if (sessionStorage.getItem(CREATE_TUTORIAL_CARD_DISMISSED) === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(CREATE_TUTORIAL_CARD_DISMISSED, 'true'); // Store dismissal in sessionStorage
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-stretch space-x-4">
          <div className="flex-1 p-6 pb-4 md:w-2/3">
            <h3 className="text-lg font-semibold tracking-tight">
              {t('getStartedWithTeamMindCreate')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('tutorialDescription')}
            </p>
            <Button size="sm" className="mt-4" onClick={handleDismiss}>
              {t('gotIt')}
            </Button>
          </div>
          <div className="relative mt-3 hidden h-[160px] flex-shrink-0 md:block md:w-1/3">
            <Image
              src="/images/illustrations/create-tutorial-humans.svg"
              alt="Create tutorial illustration"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
