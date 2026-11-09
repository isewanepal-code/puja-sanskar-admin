// Cookie sessions are sent by the browser on any request to this site, including
// ones another site triggers. Writes therefore must come from this site's own pages.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

type HeaderReader = { get(name: string): string | null };

export function isSameOriginWrite(method: string, headers: HeaderReader): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;

  const fetchSite = headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;

  const origin = headers.get('origin');
  if (!origin) return true; // not a browser page: it carries no ambient cookies
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// A proxied path stays inside the API: no dot segments, however they are encoded.
export function isSafeProxyPath(segments: string[]): boolean {
  return segments.every((segment) => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return false;
    }
    return (
      segment !== '' &&
      decoded !== '.' &&
      decoded !== '..' &&
      !decoded.includes('/') &&
      !decoded.includes('\\') &&
      !decoded.includes('\0')
    );
  });
}
