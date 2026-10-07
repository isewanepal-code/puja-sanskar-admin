import type { Metadata } from 'next';
import { DM_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import { resolveLocale } from '@/i18n/server';
import { createMetadata } from '@/lib/seo';
import { AppProviders } from '@/providers';

import '../globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: '--font-noto-devanagari',
  subsets: ['devanagari'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return createMetadata({ locale, description: t('description') });
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const locale = await resolveLocale(params);

  return (
    <html lang={locale}>
      <body className={`${dmSans.variable} ${notoSansDevanagari.variable} antialiased`}>
        <NextIntlClientProvider>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
