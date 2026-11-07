import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

import type { getShopCounts } from '../api/server';
import { BarRow } from './bar-row';

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

// Out and running low as shares of the packs counted, the rest being fine. A pack can be both
// (nothing left and under its reorder level), so the low share leaves out what is already out.
async function StockHealth({ stock }: { stock: { tracked: number; low: number; out: number } }) {
  const t = await getTranslations('dashboard.counts');
  const pct = (n: number) => (n / stock.tracked) * 100;
  const out = pct(stock.out);
  const low = Math.min(pct(stock.low), 100 - out);
  return (
    <div className="panel grid gap-3">
      <div className="text-sm font-medium">{t('health')}</div>
      <div className="flex h-3 overflow-hidden rounded-full bg-success/25" aria-hidden="true">
        <div className="bg-destructive" style={{ width: `${out}%` }} />
        <div className="bg-warning" style={{ width: `${low}%` }} />
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-destructive" />
          <dt>{t('out')}</dt>
          <dd className="font-semibold text-foreground tabular-nums">{stock.out}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning" />
          <dt>{t('low')}</dt>
          <dd className="font-semibold text-foreground tabular-nums">{stock.low}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-success/50" />
          <dt>{t('fine')}</dt>
          <dd className="font-semibold text-foreground tabular-nums">
            {Math.max(0, stock.tracked - stock.out - stock.low)}
          </dd>
        </div>
      </dl>
    </div>
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
          <h2 className="text-base font-semibold">{t('kits')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            <div className="panel grid gap-3">
              <div className="text-sm font-medium">{t('kitsLeft')}</div>
              {kits.left.map((kit) => (
                <BarRow
                  key={kit.id}
                  label={
                    <>
                      {kit.nameEn}
                      {kit.tier ? (
                        <span className="ml-2 text-xs text-muted-foreground">{kit.tier}</span>
                      ) : null}
                    </>
                  }
                  value={kit.availableCount}
                  max={Math.max(...kits.left.map((k) => k.availableCount), 1)}
                  display={t('left', { count: kit.availableCount })}
                  tone={
                    kit.availableCount === 0 ? 'bad' : kit.availableCount <= 3 ? 'warn' : 'good'
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {items || stock ? (
        <div className="grid gap-3">
          <h2 className="text-base font-semibold">{t('items')}</h2>
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
                  href={routes.stock('low')}
                />
                <Count
                  label={t('out')}
                  value={stock.out}
                  note={t('outNote')}
                  tone={stock.out > 0 ? 'bad' : 'plain'}
                  href={routes.stock('out')}
                />
              </>
            ) : null}
          </div>
          {stock && stock.tracked > 0 ? <StockHealth stock={stock} /> : null}
        </div>
      ) : null}
    </section>
  );
}
