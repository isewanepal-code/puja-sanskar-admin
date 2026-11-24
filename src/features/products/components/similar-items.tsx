'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { request, type Schema } from '@/lib/api';
import { routes } from '@/lib/routes';

type Similar = Schema<'SimilarItemResponse'>;

// Items that look like the name being typed (dhup, dhoop, धूप), so one item is not made twice.
export function SimilarItems({ nameEn, nameNe }: { nameEn: string; nameNe: string }) {
  const t = useTranslations('itemPage');
  const [typed, setTyped] = useState({ nameEn: '', nameNe: '' });
  // Not on every key: a short pause after the last one.
  useEffect(() => {
    const timer = setTimeout(() => setTyped({ nameEn: nameEn.trim(), nameNe: nameNe.trim() }), 350);
    return () => clearTimeout(timer);
  }, [nameEn, nameNe]);
  const found = useQuery({
    queryKey: ['items', 'similar', typed.nameEn, typed.nameNe],
    queryFn: () => request<Similar[]>('GET', '/admin/items/similar', { query: typed }),
    enabled: typed.nameEn.length >= 2 || typed.nameNe.length >= 1,
  });
  const list = found.data ?? [];
  if (list.length === 0) return null;
  const same = list.some((item) => item.match === 'SAME');
  return (
    <section
      className={`mb-4 grid gap-2 rounded-lg border p-4 text-sm ${same ? 'border-warning/50 bg-warning/10' : 'border-border bg-muted/40'}`}
    >
      <p className="font-semibold">{t('similarTitle')}</p>
      <p className="text-muted-foreground">{same ? t('similarSameWarn') : t('similarNote')}</p>
      <ul className="grid gap-1.5">
        {list.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
          >
            <span className="min-w-0">
              <span className="font-medium">{item.nameEn}</span>
              <span className="ml-2 text-muted-foreground">{item.nameNe}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {item.packs.length ? item.packs.join(' · ') : t('similarNoPacks')}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${item.match === 'SAME' ? 'bg-warning/20' : 'bg-muted'}`}
              >
                {item.match === 'SAME' ? t('similarSame') : t('similarLike')}
              </span>
              <Link href={routes.quantityPrice(item.id)} className="text-primary underline">
                {t('similarOpen')}
              </Link>
              <Link href={routes.buy(item.id)} className="text-primary underline">
                {t('similarBuy')}
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
