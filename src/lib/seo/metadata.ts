import type { Metadata } from 'next';

import { siteConfig } from '@/config/site';
import { localeMeta } from '@/i18n/locales';
import type { Locale } from '@/i18n/routing';
import { clientEnv } from '@/lib/env';

import { getCanonicalUrl, getLanguageAlternates } from './canonical';

type CreateMetadataOptions = {
  locale: Locale;
  description: string;
  title?: string;
  pathname?: string;
};

export function createMetadata({
  locale,
  description,
  title,
  pathname = '/',
}: CreateMetadataOptions): Metadata {
  const url = getCanonicalUrl(locale, pathname);
  const resolvedTitle = title ?? siteConfig.name;

  return {
    metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),
    title: title ?? { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
    description,
    applicationName: siteConfig.name,
    alternates: {
      canonical: url,
      languages: getLanguageAlternates(pathname),
    },
    openGraph: {
      type: 'website',
      locale: localeMeta[locale].ogLocale,
      siteName: siteConfig.name,
      title: resolvedTitle,
      description,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
