import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';
import { getCanonicalUrl, getLanguageAlternates } from '@/lib/seo';

const pathnames = ['/'];

export default function sitemap(): MetadataRoute.Sitemap {
  return pathnames.flatMap((pathname) =>
    routing.locales.map((locale) => ({
      url: getCanonicalUrl(locale, pathname),
      changeFrequency: 'weekly' as const,
      priority: pathname === '/' ? 1 : 0.8,
      alternates: { languages: getLanguageAlternates(pathname) },
    })),
  );
}
