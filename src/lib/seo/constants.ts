import { siteConfig } from '@/config/site';

export const SEO_DEFAULTS = {
  name: siteConfig.name,
  title: siteConfig.name,
  description: siteConfig.description,
  locale: 'ne_NP',
  type: 'website',
} as const;
