import type { MetadataRoute } from 'next';

import { clientEnv } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: clientEnv.NEXT_PUBLIC_SITE_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
