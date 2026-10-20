import { serverEnv } from '@/lib/env/server';

// The API lists every public page with its slugs; the website serves its sitemap as it is.
export const revalidate = 3600;

export async function GET() {
  const upstream = await fetch(`${serverEnv.API_URL}/api/v1/sitemap.xml`, {
    next: { revalidate },
  });
  if (!upstream.ok) return new Response('Sitemap unavailable', { status: 503 });
  return new Response(await upstream.text(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
