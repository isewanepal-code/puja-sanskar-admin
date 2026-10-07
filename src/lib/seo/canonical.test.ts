import { describe, expect, it } from 'vitest';

import { clientEnv } from '@/lib/env';

import { getCanonicalUrl, getLanguageAlternates } from './canonical';

const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

describe('getCanonicalUrl', () => {
  it('omits the prefix for the default locale', () => {
    expect(getCanonicalUrl('ne')).toBe(`${siteUrl}/`);
    expect(getCanonicalUrl('ne', 'pujas')).toBe(`${siteUrl}/pujas`);
  });

  it('prefixes other locales', () => {
    expect(getCanonicalUrl('en', '/pujas')).toBe(`${siteUrl}/en/pujas`);
  });
});

describe('getLanguageAlternates', () => {
  it('lists every locale and an x-default', () => {
    expect(getLanguageAlternates('/pujas')).toEqual({
      ne: `${siteUrl}/pujas`,
      en: `${siteUrl}/en/pujas`,
      'x-default': `${siteUrl}/pujas`,
    });
  });
});
