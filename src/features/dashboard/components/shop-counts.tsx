import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

import type { getShopCounts } from '../api/server';

type Counts = Awaited<ReturnType<typeof getShopCounts>>;

type Tone = 'plain' | 'good' | 'warn' | 'bad';

const TONE: Record<Tone, string> = {
  plain: 'text-foreground',
  good: 'text-success',
  warn: 'text-warning',
  bad: 'text-destructive',
};

function Count({
  label,
  value,
  note,
  tone = 'plain',
  href,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: Tone;
  href: string;
}) {
  return (
    <Link href={href} className="panel transition-colors hover:border-primary">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn('mt-1 font-heading text-3xl font-semibold tabular-nums', TONE[tone])}>
        {value}
      </div>
      {note ? <div className="mt-1 text-xs text-muted-foreground">{note}</div> : null}
    </Link>
  );
}

// Kits and items at a glance: how many there are, how many can be sold, how many are left.
export async function ShopCounts({ counts }: { counts: Counts }) {
  const t = await getTranslations('dashboard.counts');
  const { kits, items, stock } = counts;
  if (!kits && !items && !stock) return null;

  return (
    <section className="grid gap-4">
      {kits ? (
        <div className="grid gap-3">
          <h2 className="font-semibold">{t('kits')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Count
              label={t('kitsMade')}
              value={kits.total}
              note={t('kitsActive', { count: kits.active })}
              href={routes.kits()}
            />
            <Count
              label={t('kitsReady')}
              value={kits.ready}
              note={t('kitsReadyNote')}
              tone="good"
              href={routes.kits()}
            />
            <Count
              label={t('kitsShort')}
              value={kits.active - kits.ready}
              note={t('kitsShortNote')}
              tone={kits.active - kits.ready > 0 ? 'bad' : 'plain'}
              href={routes.kits()}
            />
          </div>
          {kits.left.length > 0 ? (
            <div className="panel overflow-hidden !p-0">
              <div className="border-b border-border px-4 py-2.5 text-sm font-medium">
                {t('kitsLeft')}
              </div>
              <ul className="divide-y divide-border">
                {kits.left.map((kit) => (
                  <li key={kit.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      {kit.nameEn}
                      {kit.tier ? (
                        <span className="ml-2 text-xs text-muted-foreground">{kit.tier}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">{kit.code}</span>
                    <span
                      className={cn(
                        'w-20 text-right font-semibold tabular-nums',
                        kit.availableCount === 0
                          ? TONE.bad
                          : kit.availableCount <= 3
                            ? TONE.warn
                            : TONE.good,
                      )}
                    >
                      {t('left', { count: kit.availableCount })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {items || stock ? (
        <div className="grid gap-3">
          <h2 className="font-semibold">{t('items')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items ? (
              <Count
                label={t('itemsTotal')}
                value={items.total}
                note={t('itemsActive', { count: items.active })}
                href={routes.products()}
              />
            ) : null}
            {stock ? (
              <>
                <Count
                  label={t('packsTracked')}
                  value={stock.tracked}
                  note={t('packsTrackedNote')}
                  href={routes.stock()}
                />
                <Count
                  label={t('low')}
                  value={stock.low}
                  note={t('lowNote')}
                  tone={stock.low > 0 ? 'warn' : 'plain'}
                  href={routes.stock()}
                />
                <Count
                  label={t('out')}
                  value={stock.out}
                  note={t('outNote')}
                  tone={stock.out > 0 ? 'bad' : 'plain'}
                  href={routes.stock()}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
