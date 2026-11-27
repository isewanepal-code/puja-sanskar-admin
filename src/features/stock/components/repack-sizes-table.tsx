import { useTranslations } from 'next-intl';

import { IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';

import { round, type Pack } from './repack-math';

// The sizes that can be made: what each sells at, about what it costs, and how many were made.
export function RepackSizesTable({
  sizes,
  counts,
  costOf,
  canFill,
  onCount,
  onFill,
}: {
  sizes: Pack[];
  counts: Record<string, string>;
  costOf: (pack: Pack) => number | null;
  canFill: (pack: Pack) => boolean;
  onCount: (id: string, value: string) => void;
  onFill: (pack: Pack) => void;
}) {
  const t = useTranslations('repack');
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">{t('colSize')}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('colSells')}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('colCost')}</th>
            <th className="w-32 px-3 py-2 text-right font-semibold">{t('colMade')}</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {sizes.map((pack) => {
            const cost = costOf(pack);
            const sells = Number(pack.price);
            const losing = cost !== null && sells > 0 && sells < cost - 0.005;
            return (
              <tr key={pack.id} className="border-t border-border">
                <td className="px-3 py-1.5 font-medium">{pack.label}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {sells > 0 ? formatMoney(String(sells), 'en') : '—'}
                </td>
                <td
                  className={`px-3 py-1.5 text-right tabular-nums ${losing ? 'text-destructive' : 'text-muted-foreground'}`}
                  title={losing ? t('belowCost') : undefined}
                >
                  {cost !== null ? `≈ ${formatMoney(String(round(cost)), 'en')}` : '—'}
                </td>
                <td className="px-2 py-1">
                  <Input
                    aria-label={`${pack.label}: ${t('howMany')}`}
                    inputMode="decimal"
                    placeholder="0"
                    className="h-8 text-right"
                    value={counts[pack.id] ?? ''}
                    onChange={(e) => onCount(pack.id, e.target.value)}
                  />
                </td>
                <td className="px-1 text-center">
                  <IconButton
                    icon="refresh"
                    label={t('fill')}
                    disabled={!canFill(pack)}
                    onClick={() => onFill(pack)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
