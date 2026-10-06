import { clientEnv } from '@/lib/env';

export function getCanonicalUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return new URL(
    normalizedPath,
    clientEnv.NEXT_PUBLIC_SITE_URL,
  ).toString();
}
