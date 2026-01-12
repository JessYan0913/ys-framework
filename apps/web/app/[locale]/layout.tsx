import '../globals.css';

import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import { setStaticParamsLocale } from 'next-international/server';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';
import { I18nProviderClient } from '@/locales/client';
import { getStaticParams } from '@/locales/server';

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: 'Next.js App',
  description: 'Next.js App with Authentication',
};

export const viewport = {
  maximumScale: 1,
};

export function generateStaticParams() {
  return getStaticParams();
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);
  return (
    <html lang={locale} suppressHydrationWarning className="scrollbar-hide">
      <body suppressHydrationWarning className="antialiased">
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <Toaster position="top-center" />
            <I18nProviderClient locale={locale}>{children}</I18nProviderClient>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
