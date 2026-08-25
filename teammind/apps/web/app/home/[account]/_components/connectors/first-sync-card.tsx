'use client';

import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@tm/ui/card';

export function FirstSyncCard() {
  const { t } = useTranslation('connect');

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <h3 className="text-lg font-semibold tracking-tight">
                {t('firstSync.title')}
              </h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('firstSync.description')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
