'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Modal } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

import type { Product } from './use-product';

// How many quantities (and their prices) the list shows before "+N more"; the popup has all of them.
const SHOWN = 4;

// The name of one quantity: its colours and sizes, else its amount (200 g, 1 kg).
const nameOf = (v: Product['variants'][number]) =>
  v.options.length ? v.options.map((o) => o.valueEn).join(' · ') : v.label;

// The quantities of an item, or their selling prices, one under the other in the same order so a
// quantity and its price line up. Pressing either opens every quantity and price of the item.
export function ItemSizes({ product, show }: { product: Product; show: 'quantity' | 'price' }) {
  const t = useTranslations('itemSizes');
  const [open, setOpen] = useState(false);
  const rows = product.variants;
  if (rows.length === 0) return <span className="text-muted-foreground">—</span>;
  const extra = rows.length - SHOWN;

  return (
    <>
      <button
        type="button"
        title={t('open', { name: product.nameNe })}
        onClick={() => setOpen(true)}
        className={
          show === 'price'
            ? 'grid text-right leading-6 tabular-nums hover:text-primary'
            : 'grid text-left leading-6 hover:text-primary'
        }
      >
        {rows.slice(0, SHOWN).map((v) => (
          <span
            key={v.id}
            className={v.isActive ? undefined : 'text-muted-foreground line-through'}
          >
            {show === 'price'
              ? Number(v.price) > 0
                ? formatMoney(v.price, 'en')
                : '—'
              : nameOf(v)}
          </span>
        ))}
        {extra > 0 ? (
          <span className="text-xs text-primary">{t('more', { count: extra })}</span>
        ) : null}
      </button>

      <Modal open={open} onOpenChange={setOpen} title={product.nameNe}>
        <div className="grid gap-4 p-1">
          <div>
            <h2 className="font-heading text-lg font-semibold">{product.nameNe}</h2>
            <p className="text-sm text-muted-foreground">{product.nameEn}</p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">{t('quantity')}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t('price')}</th>
                  <th className="px-3 py-2 text-center font-semibold">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{nameOf(v)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {Number(v.price) > 0 ? formatMoney(v.price, 'en') : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {!v.isActive ? (
                        <Badge tone="warning">{t('off')}</Badge>
                      ) : v.showOnWebsite ? (
                        <Badge tone="success">{t('onWeb')}</Badge>
                      ) : (
                        <Badge>{t('counterOnly')}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Link
              href={routes.quantityPrice(product.id)}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              {t('change')}
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
