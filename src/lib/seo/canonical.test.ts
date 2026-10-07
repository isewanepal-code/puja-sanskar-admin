import { describe, expect, it } from 'vitest';

import { clientEnv } from '@/lib/env';

import { getCanonicalUrl } from './canonical';

const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

describe('getCanonicalUrl', () => {
  it('returns the site root by default', () => {
    expect(getCanonicalUrl()).toBe(`${siteUrl}/`);
  });

  it('normalizes paths without a leading slash', () => {
    expect(getCanonicalUrl('pujas')).toBe(`${siteUrl}/pujas`);
  });
});
