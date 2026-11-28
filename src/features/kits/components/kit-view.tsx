'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatMoney } from '@/lib/format';

import type { KitSetRow } from '../lib/kit-set';
import { kitPriceFor } from '../lib/kit-offer-price';

const money = (amount: string | number) => formatMoney(String(amount), 'en');

// A kit as it is saved, read top to bottom: each package with its items, its discount and what it
// costs by how many are bought. Nothing here changes; the row's pencil does that.
export function KitView({ row, onClose }: { row: KitSetRow | null; onClose: () => void }) {
  const t = useTranslations('kitView');
  return (
    <Modal
      open={row !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      size="lg"
      title={row?.nameNe ?? ''}
      description={row ? [row.nameEn, row.puja?.nameNe].filter(Boolean).join(' · ') : undefined}
    >
      <div className="grid gap-3">
        {(row?.set ?? []).map((kit, index) => {
          const main = kit.items.filter((line) => !line.isHawan);
          const hawan = kit.items.filter((line) => line.isHawan);
          const lines = (title: string, list: typeof kit.items) =>
            list.length > 0 ? (
              <div className="grid gap-1">
                <h4 className="text-sm font-semibold">{title}</h4>
                <ul className="text-sm">
                  {list.map((line) => (
                    <li
                      key={line.sku.variantId}
                      className="flex items-center justify-between gap-3 border-b border-border/60 py-1"
                    >
                      <span>
                        {line.product.nameNe}
                        <span className="ml-2 text-xs text-muted-foreground">{line.sku.sku}</span>
                        {line.isOptional ? (
                          <Badge tone="info" className="ml-2">
                            {t('optional')}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {line.quantity} × →{' '}
                        <b className="text-foreground">{money(line.lineTotal)}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          const counts = [...new Set(kit.offerTiers.map((tier) => tier.minKits))];
          return (
            <details key={kit.id} open={index === 0} className="rounded-md border border-border">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm font-medium">
                <span>{kit.tier ?? kit.nameNe}</span>
                <span className="tabular-nums">
                  {money(kit.salePrice)}
                  {kit.salePrice !== kit.price ? (
                    <span className="ml-2 text-xs text-muted-foreground line-through">
                      {money(kit.price)}
                    </span>
                  ) : null}
                </span>
              </summary>
              <div className="grid gap-3 border-t border-border px-3 py-3">
                {lines(t('items'), main)}
                {lines(t('hawan'), hawan)}
                <dl className="text-sm">
                  <div className="flex justify-between gap-4 py-1">
                    <dt className="text-muted-foreground">{t('discount')}</dt>
                    <dd className="font-medium">
                      {kit.discountKind === 'PERCENT'
                        ? `${Number(kit.discountPercent)}%`
                        : money(kit.discountAmount)}
                    </dd>
                  </div>
                  {counts.map((count) => (
                    <div key={count} className="flex justify-between gap-4 py-1">
                      <dt className="text-muted-foreground">{t('kitsBought', { count })}</dt>
                      <dd className="font-medium tabular-nums">
                        {money(kitPriceFor(kit, count).price)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </details>
          );
        })}
      </div>
    </Modal>
  );
}
