import type { MetadataRoute } from 'next';

// Staff only: nothing here belongs in a search engine.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
