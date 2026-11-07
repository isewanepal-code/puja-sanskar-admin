import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

import type { getFlow } from '../api/server';

type Flow = Awaited<ReturnType<typeof getFlow>>;

const COLUMNS = [
  'bought',
  'returned',
  'transferIn',
  'transferOut',
  'sold',
  'damaged',
  'corrected',
] as const;

// Per branch over the chosen days: what came in, where it went, and what was used, plus who sent to whom.
export async function BranchFlow({ flow }: { flow: Flow }) {
  const t = await getTranslations('dashboard.branches');
  const { byBranch, transfers } = flow.stock;
  if (byBranch.length === 0) return null;

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <p className="text-xs text-muted-foreground">{t('note')}</p>
        </div>
        <Link href={routes.stock()} className="text-sm text-primary">
          {t('sendMore')}
        </Link>
      </div>

      <div className="panel overflow-x-auto !p-0">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">{t('branch')}</th>
              {COLUMNS.map((column) => (
                <th key={column} className="px-3 py-2 text-right font-medium">
                  {t(column)}
                </th>
              ))}
              <th className="px-4 py-2 text-right font-medium">{t('net')}</th>
            </tr>
          </thead>
          <tbody>
            {byBranch.map((row) => {
              const corrected = row.adjustedUp - row.adjustedDown;
              const net =
                row.purchased +
                row.returned +
                row.transferIn +
                row.adjustedUp -
                row.transferOut -
                row.sold -
                row.damaged -
                row.adjustedDown;
              const cells: Record<(typeof COLUMNS)[number], number> = {
                bought: row.purchased,
                returned: row.returned,
                transferIn: row.transferIn,
                transferOut: row.transferOut,
                sold: row.sold,
                damaged: row.damaged,
                corrected,
              };
              return (
                <tr key={row.branch.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.branch.name}</td>
                  {COLUMNS.map((column) => (
                    <td
                      key={column}
                      className={cn(
                        'px-3 py-2.5 text-right tabular-nums',
                        cells[column] === 0 && 'text-muted-foreground/60',
                      )}
                    >
                      {column === 'corrected' && corrected > 0 ? '+' : ''}
                      {cells[column]}
                    </td>
                  ))}
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-semibold tabular-nums',
                      net > 0
                        ? 'text-success'
                        : net < 0
                          ? 'text-destructive'
                          : 'text-muted-foreground',
                    )}
                  >
                    {net > 0 ? '+' : ''}
                    {net}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel grid gap-2">
        <h3 className="text-sm font-medium">{t('transfers')}</h3>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noTransfers')}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {transfers.map((route) => (
              <li
                key={`${route.from.id}-${route.to.id}`}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="font-medium">
                  {t('route', { from: route.from.name, to: route.to.name })}
                </span>
                <span className="text-muted-foreground">
                  {t('routeNote', { units: route.units, transfers: route.transfers })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
