import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { mediaConfig } from './src/config/media';
import { buildEnv } from './src/lib/env/build';

const withNextIntl = createNextIntlPlugin();

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  images: {
    formats: [...mediaConfig.image.formats],
    qualities: [...mediaConfig.image.qualities],
    // The API's WebP renditions; product, kit and festival images all come from there.
    remotePatterns: [new URL(`${buildEnv.MEDIA_URL.replace(/\/$/, '')}/**`)],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
