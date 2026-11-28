import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { groupKitSets, type Kit } from '@/features/kits';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';

const money = (amount: string | number) => formatMoney(String(amount), 'en');
const TIERS = ['BASIC', 'STANDARD', 'PREMIUM'] as const;
const tierName = (tier: string) => tier.charAt(0) + tier.slice(1).toLowerCase();

// The packages are told apart by their column, not by colour.
const TIER_STYLE = {
  BASIC: { head: '', cell: '' },
  STANDARD: { head: '', cell: '' },
  PREMIUM: { head: '', cell: '' },
} as const;

type Cell = { quantity: number; optional: boolean; total: string };

// The kits of a puja in one table: a kit is a line with its name on the left and what each package
// costs; opening it lists the items under it, once each, with how many each package takes. Closed, only
// the lines show, so many kits stay easy to scan. Nothing here changes; a kit is changed on its page.
export function PujaKitTable({ kits }: { kits: Kit[] }) {
  const t = useTranslations('pujaKits');
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const sets = groupKitSets(kits);
  const toggle = (key: string) =>
    setOpen((now) => {
      const next = new Set(now);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  return (
    <div className="max-h-[32rem] overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-card text-xs uppercase">
          <tr>
            <th className="w-52 px-3 py-2 text-left font-semibold text-muted-foreground">
              {t('kit')}
            </th>
            <th className="min-w-64 px-3 py-2 text-left font-semibold text-muted-foreground">
              {t('item')}
            </th>
            {TIERS.map((tier) => (
              <th
                key={tier}
                className={cn('w-36 px-3 py-2 text-right font-semibold', TIER_STYLE[tier].head)}
              >
                {tierName(tier)}
              </th>
            ))}
          </tr>
        </thead>
        {sets.map((set) => {
          const rows = new Map<
            string,
            { name: string; hawan: boolean; byTier: Map<string, Cell> }
          >();
          for (const kit of set.kits) {
            for (const line of kit.items) {
              const row = rows.get(line.product.id) ?? {
                name: line.product.nameNe,
                hawan: line.isHawan,
                byTier: new Map<string, Cell>(),
              };
              row.byTier.set(kit.tier ?? 'BASIC', {
                quantity: line.quantity,
                optional: line.isOptional,
                total: line.lineTotal,
              });
              rows.set(line.product.id, row);
            }
          }
          const isOpen = open.has(set.key);
          const kitOf = (tier: string) => set.kits.find((kit) => (kit.tier ?? 'BASIC') === tier);
          return (
            <tbody key={set.key} className="border-t border-border">
              <tr
                className="cursor-pointer bg-muted/40 hover:bg-muted/70"
                onClick={() => toggle(set.key)}
              >
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-2 text-left font-medium"
                  >
                    <Icon name={isOpen ? 'down' : 'right'} size={14} aria-hidden="true" />
                    <span className="min-w-0">
                      {set.lead.nameNe}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({set.key})
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-3">
                  <Badge>{t('itemCount', { count: rows.size })}</Badge>
                </td>
                {TIERS.map((tier) => {
                  const kit = kitOf(tier);
                  return (
                    <td
                      key={tier}
                      className={cn(
                        'px-3 text-right font-semibold tabular-nums',
                        TIER_STYLE[tier].head,
                      )}
                    >
                      {kit ? money(kit.salePrice) : <span className="opacity-40">—</span>}
                    </td>
                  );
                })}
              </tr>
              {isOpen
                ? [...rows.entries()].map(([id, row]) => (
                    <tr key={id} className="border-t border-border/50">
                      <td className="border-l-2 border-primary/40 pl-6" />
                      <td className="px-3 py-1.5">
                        {row.name}
                        {row.hawan ? <Badge className="ml-2">{t('hawan')}</Badge> : null}
                      </td>
                      {TIERS.map((tier) => {
                        const cell = row.byTier.get(tier);
                        return (
                          <td
                            key={tier}
                            className={cn('px-3 text-right tabular-nums', TIER_STYLE[tier].cell)}
                          >
                            {cell ? (
                              <>
                                <span className="text-muted-foreground">{cell.quantity} ×</span>{' '}
                                <b>{money(cell.total)}</b>
                                {cell.optional ? (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    ({t('optional')})
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                : null}
              {isOpen ? (
                <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                  <td className="border-l-2 border-primary/40" />
                  <td className="px-3 py-2">{t('kitPrice')}</td>
                  {TIERS.map((tier) => {
                    const kit = kitOf(tier);
                    return (
                      <td key={tier} className="px-3 text-right tabular-nums">
                        {kit ? money(kit.salePrice) : <span className="opacity-40">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ) : null}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
