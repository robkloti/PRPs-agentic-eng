import { cookies } from 'next/headers';

import { Toaster } from '@tm/ui/sonner';
import { cn } from '@tm/ui/utils';

import { RootProviders } from '~/components/root-providers';
import { heading, sans } from '~/lib/fonts';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { generateRootMetadata } from '~/lib/root-metdata';

import '../styles/globals.css';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language } = await createI18nServerInstance();
  const theme = await getTheme();
  const className = getClassName(theme);

  return (
    <html lang={language} className={className}>
      <link rel="icon" href="/images/favicon/favicon.ico" sizes="any" />
      <body>
        <RootProviders theme={theme} lang={language}>
          {children}
        </RootProviders>

        <Toaster richColors={false} />
      </body>
    </html>
  );
}

function getClassName(theme?: string) {
  const dark = theme === 'dark';
  const light = !dark;

  return cn(
    'min-h-screen bg-background antialiased',
    sans.variable,
    heading.variable,
    {
      dark,
      light,
    },
  );
}

async function getTheme() {
  return (await cookies()).get('theme')?.value;
}

export const generateMetadata = generateRootMetadata;
