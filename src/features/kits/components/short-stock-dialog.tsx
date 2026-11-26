'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { buttonVariants } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { routes } from '@/lib/routes';
import { shortStock, useShortStock } from '@/lib/short-stock';

// Shown when a kit is switched on while compulsory items are out of stock: each item says how many are
// needed and on the shelf, and a button goes straight to buying it, then comes back to the kit.
export function ShortStockDialog() {
  const t = useTranslations('kitShortStock');
  const shown = useShortStock();
  return (
    <Modal
      open={shown !== null}
      onOpenChange={(next) => (next ? undefined : shortStock.close())}
      size="lg"
      title={t('title')}
      description={t('note')}
    >
      <ul className="grid gap-2">
        {(shown?.items ?? []).map((item) => (
          <li
            key={item.variantId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
          >
            <div className="grid gap-0.5">
              <span className="font-medium">
                {item.nameNe} · {item.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.onSale
                  ? t('counts', { needed: item.needed, available: item.available })
                  : t('notOnSale')}
              </span>
            </div>
            <Link
              href={routes.buy(item.productId, shown?.back)}
              onClick={() => shortStock.close()}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              {t('buy')}
            </Link>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
