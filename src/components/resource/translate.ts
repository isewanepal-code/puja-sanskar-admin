'use client';

import { useTranslations } from 'next-intl';

// Resource labels are looked up by name at run time; the messages test keeps them complete.
export type Translate = {
  (key: string, values?: Record<string, string | number>): string;
  has: (key: string) => boolean;
};

export function useResourceText(key: string): Translate {
  return useTranslations(`resources.${key}` as never) as unknown as Translate;
}
