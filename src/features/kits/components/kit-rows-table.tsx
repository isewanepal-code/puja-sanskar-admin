'use client';

import { useTranslations } from 'next-intl';

import { SearchSelect } from '@/components/controls';
import { Icon } from '@/components/icons';
import { Button, IconButton } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';

import { blankRows, inSection, type Pkg, type Row, type Section } from './kit-package';

// One table of a package (its items, or its hawan samagri): choose the packs, say how many, and read
// what each costs, sells at, and comes to after the discount.
export function KitRowsTable({
  section,
  pkg,
  change,
  changeRow,
  dropRow,
  setRemoving,
  priceOf,
  costOf,
  itemOf,
  repeated,
  lineTotal,
  afterOf,
}: {
  section: Section;
  pkg: Pkg;
  change: (patch: Partial<Pkg>) => void;
  changeRow: (index: number, patch: Partial<Row>) => void;
  dropRow: (index: number) => void;
  setRemoving: (index: number) => void;
  priceOf: (variantId: string) => number;
  costOf: (variantId: string) => number;
  // The item a row's pack belongs to (known at once when chosen here, fetched when filled from a puja).
  itemOf: (row: Row) => string;
  repeated: Set<number>;
  lineTotal: (row: Row) => number;
  afterOf: (row: Row) => number | null;
}) {
  const t = useTranslations('kitPage');
  // Every other row of the package: what this row's choices must leave out.
  const others = (index: number) => pkg.rows.filter((r, i) => i !== index && r.variantId);
  const list = pkg.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => inSection(row, section));
  const sellSum = list.reduce((sum, { row }) => sum + lineTotal(row), 0);
  const afterSum = list.reduce((sum, { row }) => sum + (afterOf(row) ?? 0), 0);
  const costSum = list.reduce(
    (sum, { row }) => sum + costOf(row.variantId) * (Number(row.quantity) || 0),
    0,
  );
  return (
    <div key={section} className="grid gap-2">
      <h3 className="text-sm font-semibold">
        {section === 'hawan' ? t('hawanTitle') : t('itemsTitle')}
      </h3>
      <p className="text-xs text-muted-foreground">
        {section === 'hawan' ? t('hawanNote') : t('itemsNote')}
      </p>
      {section === 'hawan' ? (
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={pkg.hawanOptional}
            onChange={(e) => change({ hawanOptional: e.target.checked })}
            className="size-4"
          />
          {t('hawanOptional')}
        </label>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="w-8 px-2 py-2 text-left font-semibold">#</th>
              <th className="px-2 py-2 text-left font-semibold">{t('pack')}</th>
              {section === 'hawan' ? null : (
                <th className="w-20 px-2 py-2 text-center font-semibold">{t('optional')}</th>
              )}
              <th className="w-20 px-2 py-2 text-right font-semibold">{t('quantity')}</th>
              <th className="w-24 px-2 py-2 text-right font-semibold">{t('buyPrice')}</th>
              <th className="w-24 px-2 py-2 text-right font-semibold">{t('sellPrice')}</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">{t('lineTotal')}</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">{t('afterCol')}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td
                  colSpan={section === 'hawan' ? 8 : 9}
                  className="px-3 py-4 text-center text-muted-foreground"
                >
                  {t('noneYet')}
                </td>
              </tr>
            ) : null}
            {list.map(({ row, index }, at) => (
              <tr key={index} className="border-t border-border">
                <td className="px-2 text-muted-foreground tabular-nums">{at + 1}</td>
                <td className="p-1.5">
                  <SearchSelect
                    aria-label={t('pack')}
                    source={choices.packs}
                    exclude={others(index).map((r) => r.variantId)}
                    excludeProducts={others(index).map((r) => itemOf(r))}
                    required
                    invalid={repeated.has(index)}
                    value={row.variantId}
                    onChange={(value, chosen) =>
                      changeRow(index, {
                        variantId: String(value),
                        productId: chosen[0]?.productId,
                      })
                    }
                  />
                </td>
                {section === 'hawan' ? null : (
                  <td className="px-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={t('optional')}
                      checked={row.optional}
                      onChange={(e) => changeRow(index, { optional: e.target.checked })}
                      className="size-4"
                    />
                  </td>
                )}
                <td className="p-1.5">
                  <QuantityStepper
                    label={t('quantity')}
                    value={row.quantity}
                    onChange={(quantity) => changeRow(index, { quantity })}
                  />
                </td>
                <td className="px-2 text-right text-muted-foreground tabular-nums">
                  {row.variantId && costOf(row.variantId) > 0
                    ? formatMoney(String(costOf(row.variantId)), 'en')
                    : '—'}
                </td>
                <td className="px-2 text-right tabular-nums">
                  {row.variantId ? formatMoney(String(priceOf(row.variantId)), 'en') : '—'}
                </td>
                <td className="px-2 text-right font-medium tabular-nums">
                  {row.variantId ? formatMoney(String(lineTotal(row)), 'en') : '—'}
                </td>
                <td className="px-2 text-right tabular-nums">
                  {row.variantId && afterOf(row) !== null
                    ? formatMoney(String(afterOf(row)), 'en')
                    : '—'}
                </td>
                <td className="px-1 text-center">
                  <IconButton
                    icon="trash"
                    variant="danger"
                    label={t('remove')}
                    onClick={() => (row.variantId ? setRemoving(index) : dropRow(index))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          {list.length > 0 ? (
            <tfoot className="border-t border-border bg-muted/30 text-sm font-semibold">
              <tr>
                <td colSpan={section === 'hawan' ? 3 : 4} className="px-2 py-2 text-right">
                  {t('sectionTotal')}
                </td>
                <td className="px-2 text-right text-muted-foreground tabular-nums">
                  {costSum > 0 ? formatMoney(String(costSum), 'en') : '—'}
                </td>
                <td />
                <td className="px-2 text-right tabular-nums">
                  {formatMoney(String(sellSum), 'en')}
                </td>
                <td className="px-2 text-right tabular-nums">
                  {formatMoney(String(afterSum), 'en')}
                </td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 5].map((count) => (
          <Button
            key={count}
            variant="secondary"
            size="sm"
            onClick={() => change({ rows: [...pkg.rows, ...blankRows(section, count)] })}
          >
            <Icon name="plus" size={14} />
            {t('addRows', { count })}
          </Button>
        ))}
      </div>
    </div>
  );
}
