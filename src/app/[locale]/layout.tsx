import type { Metadata } from 'next';
import { Noto_Sans_Devanagari, Noto_Serif_Devanagari } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { ThemeScript } from '@/components/theme';
import { siteConfig } from '@/config/site';
import { routing } from '@/i18n/routing';
import { resolveLocale } from '@/i18n/server';
import { AppProviders } from '@/providers';

import '../globals.css';

// The approved design's type: Noto Sans Devanagari for text, Noto Serif Devanagari for headings.
const notoSans = Noto_Sans_Devanagari({
  variable: '--font-noto-sans',
  subsets: ['devanagari', 'latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const notoSerif = Noto_Serif_Devanagari({
  variable: '--font-noto-serif',
  subsets: ['devanagari', 'latin'],
  display: 'swap',
  weight: ['600', '700'],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const locale = await resolveLocale(params);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${notoSans.variable} ${notoSerif.variable}`}>
        <NextIntlClientProvider>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
