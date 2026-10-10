import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { mediaConfig } from './src/config/media';

const withNextIntl = createNextIntlPlugin();

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  images: {
    formats: [...mediaConfig.image.formats],
    qualities: [...mediaConfig.image.qualities],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
