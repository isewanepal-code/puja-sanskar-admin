'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { request, type Schema } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

import { ArchiveModal, RestoreModal, type ArchiveTarget } from './archive-modals';

type Summary = Schema<'ArchiveSummaryResponse'>;
type Item = Schema<'ArchivedItemResponse'>;
type Kit = Schema<'ArchivedKitResponse'>;
type Suggestions = Schema<'SuggestionsResponse'>;
type Tab = 'kits' | 'items' | 'suggestions';

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="panel">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">{value}</div>
      {note ? <div className="mt-1 text-xs text-muted-foreground">{note}</div> : null}
    </div>
  );
}

function Thumb({ src, name }: { src: string | null; name: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- an uploaded photo, already resized
    <img src={src} alt="" className="size-10 shrink-0 rounded-md bg-muted object-cover" />
  ) : (
    <div
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 font-semibold text-primary"
    >
      {[...name][0]}
    </div>
  );
}

// Everything retired and what it still holds, with a way back, and what could be retired next.
export function ArchiveScreen() {
  const t = useTranslations('archive');
  const [tab, setTab] = useState<Tab>('kits');
  const [days, setDays] = useState(180);
  const [search, setSearch] = useState('');
  const [restoring, setRestoring] = useState<ArchiveTarget | null>(null);
  const [archiving, setArchiving] = useState<ArchiveTarget | null>(null);

  const summary = useQuery({
    queryKey: ['archive', 'summary'],
    queryFn: () => request<Summary>('GET', '/admin/archive/summary'),
  });
  const kits = useQuery({
    queryKey: ['archive', 'kits'],
    queryFn: () => request<Kit[]>('GET', '/admin/archive/kits'),
  });
  const items = useQuery({
    queryKey: ['archive', 'items'],
    queryFn: () => request<Item[]>('GET', '/admin/archive/items'),
  });
  const suggestions = useQuery({
    queryKey: ['archive', 'suggestions', days],
    queryFn: () => request<Suggestions>('GET', '/admin/archive/suggestions', { query: { days } }),
    enabled: tab === 'suggestions',
  });

  const s = summary.data;
  const q = search.trim().toLowerCase();
  const match = (row: { nameEn: string; nameNe: string; code: string }) =>
    !q || [row.nameEn, row.nameNe, row.code].some((text) => text.toLowerCase().includes(q));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'kits', label: t('tabs.kits'), count: s?.kits.archived },
    { key: 'items', label: t('tabs.items'), count: s?.items.archived },
    { key: 'suggestions', label: t('tabs.suggestions') },
  ];

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Tile
          label={t('tiles.kits')}
          value={String(s?.kits.archived ?? '–')}
          note={t('tiles.kitsNote', { active: s?.kits.active ?? 0, lines: s?.kits.itemLines ?? 0 })}
        />
        <Tile
          label={t('tiles.items')}
          value={String(s?.items.archived ?? '–')}
          note={t('tiles.itemsNote', { active: s?.items.active ?? 0, packs: s?.items.packs ?? 0 })}
        />
        <Tile
          label={t('tiles.units')}
          value={String(s?.items.unitsOnHand ?? '–')}
          note={t('tiles.unitsNote')}
        />
        <Tile
          label={t('tiles.value')}
          value={s ? formatMoney(s.items.stockValue, 'en') : '–'}
          note={t('tiles.valueNote')}
        />
        <Tile
          label={t('tiles.live')}
          value={String((s?.kits.active ?? 0) + (s?.items.active ?? 0))}
          note={t('tiles.liveNote')}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl bg-muted p-1" role="tablist">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                tab === key ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              {count !== undefined ? (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {tab !== 'suggestions' ? (
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('search')}
            aria-label={t('search')}
            className="sm:w-72"
          />
        ) : (
          <label className="flex items-center gap-2 text-sm">
            {t('notSoldFor')}
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm"
            >
              {[60, 90, 180, 365].map((value) => (
                <option key={value} value={value}>
                  {t('days', { count: value })}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {tab === 'kits' ? (
        <List
          empty={t('noKits')}
          rows={(kits.data ?? []).filter(match).map((kit) => ({
            id: kit.id,
            image: kit.imageUrl,
            title: kit.nameNe,
            sub: `${kit.nameEn} · ${kit.code}${kit.tier ? ` · ${kit.tier}` : ''}`,
            facts: [
              t('itemLines', { count: kit.itemLines }),
              kit.pujaName ?? '',
              kit.reason ?? '',
              t('archivedOn', {
                date: formatDate(kit.archivedAt, 'en'),
                by: kit.archivedByName ?? '—',
              }),
            ],
            action: (
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() => setRestoring({ kind: 'kit', id: kit.id, name: kit.nameNe })}
              >
                {t('restore')}
              </Button>
            ),
          }))}
          loading={kits.isPending}
        />
      ) : null}

      {tab === 'items' ? (
        <List
          empty={t('noItems')}
          rows={(items.data ?? []).filter(match).map((item) => ({
            id: item.id,
            image: item.imageUrl,
            title: item.nameNe,
            sub: `${item.nameEn} · ${item.code}`,
            facts: [
              t('packsCount', { count: item.packs }),
              item.unitsOnHand > 0 ? t('stillHeld', { count: item.unitsOnHand }) : t('noStock'),
              item.reason ?? '',
              t('archivedOn', {
                date: formatDate(item.archivedAt, 'en'),
                by: item.archivedByName ?? '—',
              }),
            ],
            action: (
              <Button
                variant="secondary"
                icon="refresh"
                onClick={() => setRestoring({ kind: 'item', id: item.id, name: item.nameNe })}
              >
                {t('restore')}
              </Button>
            ),
          }))}
          loading={items.isPending}
        />
      ) : null}

      {tab === 'suggestions' ? (
        <div className="grid gap-6">
          <p className="text-sm text-muted-foreground">{t('suggestionsNote', { days })}</p>
          {(['kits', 'items'] as const).map((kind) => (
            <section key={kind} className="grid gap-2">
              <h2 className="text-base font-semibold">{t(`tabs.${kind}`)}</h2>
              <List
                empty={t('nothingToSuggest')}
                loading={suggestions.isPending}
                rows={(suggestions.data?.[kind] ?? []).map((row) => ({
                  id: row.id,
                  image: null,
                  title: row.nameNe,
                  sub: `${row.nameEn} · ${row.code}`,
                  facts: [
                    row.lastSoldOn
                      ? t('lastSold', { date: formatDate(row.lastSoldOn, 'en') })
                      : t('neverSold'),
                    kind === 'items' && row.unitsOnHand > 0
                      ? t('stillHeld', { count: row.unitsOnHand })
                      : '',
                  ],
                  action: (
                    <Button
                      variant="secondary"
                      icon="archive"
                      onClick={() =>
                        setArchiving({
                          kind: kind === 'kits' ? 'kit' : 'item',
                          id: row.id,
                          name: row.nameNe,
                        })
                      }
                    >
                      {t('archive')}
                    </Button>
                  ),
                }))}
              />
            </section>
          ))}
        </div>
      ) : null}

      <RestoreModal target={restoring} onClose={() => setRestoring(null)} />
      <ArchiveModal target={archiving} onClose={() => setArchiving(null)} />
    </div>
  );
}

type Row = {
  id: string;
  image: string | null;
  title: string;
  sub: string;
  facts: string[];
  action: React.ReactNode;
};

function List({ rows, empty, loading }: { rows: Row[]; empty: string; loading?: boolean }) {
  if (loading) return <p className="text-sm text-muted-foreground">…</p>;
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Thumb src={row.image} name={row.title} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{row.title}</div>
            <div className="truncate text-xs text-muted-foreground">{row.sub}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {row.facts.filter(Boolean).map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
            </div>
          </div>
          {row.action}
        </li>
      ))}
    </ul>
  );
}
