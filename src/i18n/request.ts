import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import en from './messages/en.json';
import { routing } from './routing';

type Tree = { [key: string]: string | Tree };

function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const have = out[key];
    out[key] =
      typeof value === 'object' && typeof have === 'object'
        ? merge(have, value)
        : (value as string);
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // Nepali is laid over English, so anything not yet translated still shows (in English).
    messages: locale === 'en' ? en : merge(en, (await import('./messages/ne.json')).default),
  };
});
