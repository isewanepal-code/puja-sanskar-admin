import type { Metadata } from 'next';

import { clientEnv } from '@/lib/env';
import { SEO_DEFAULTS } from './constants';

export function createMetadata(overrides: Metadata = {}): Metadata {
  return {
    metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),

    title: {
      default: SEO_DEFAULTS.title,
      template: `%s | ${SEO_DEFAULTS.name}`,
    },

    description: SEO_DEFAULTS.description,

    applicationName: SEO_DEFAULTS.name,

    openGraph: {
      type: SEO_DEFAULTS.type,
      locale: SEO_DEFAULTS.locale,
      siteName: SEO_DEFAULTS.name,
      title: SEO_DEFAULTS.title,
      description: SEO_DEFAULTS.description,
    },

    twitter: {
      card: 'summary_large_image',
      title: SEO_DEFAULTS.title,
      description: SEO_DEFAULTS.description,
    },

    robots: {
      index: true,
      follow: true,
    },

    ...overrides,
  };
}
