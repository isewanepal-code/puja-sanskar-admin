import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { mediaConfig } from './src/config/media';
import { buildEnv } from './src/lib/env/build';

const withNextIntl = createNextIntlPlugin();

const media = new URL(buildEnv.MEDIA_URL).origin;
const isProd = process.env.NODE_ENV === 'production';

// Scripts and styles stay on this site. Next's own bootstrap is inline, so inline is allowed
// until a per-request nonce is introduced; everything else (other origins, plugins, base tag
// swaps, form posts elsewhere) is closed. Dev needs eval for hot reload.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${media}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A self-contained server folder: it is what gets uploaded to the host.
  output: 'standalone',
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
