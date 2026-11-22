'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ResourceScreen, useResourceText } from '@/components/resource';
import { buttonVariants, IconButton } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Modal } from '@/components/ui/modal';
import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

import { salesReturnsResource, type SalesReturn } from '../resources';

// What customers brought back, with a way in to record a new return.
export function ReturnsScreen() {
  const t = useTranslations('customerReturn');
  const tr = useResourceText('salesReturns');
  const resource = useMemo(() => salesReturnsResource(tr), [tr]);
  const [open, setOpen] = useState<SalesReturn | null>(null);

  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <Link
            href={routes.newCustomerReturn()}
            className={buttonVariants({ variant: 'primary' })}
          >
            <Icon name="plus" size={16} />
            {t('record')}
          </Link>
        }
        rowActions={(row) => (
          <IconButton icon="book" label={t('view')} onClick={() => setOpen(row)} />
        )}
      />
      <Modal
        open={open !== null}
        onOpenChange={(next) => (next ? undefined : setOpen(null))}
        size="md"
        title={
          open ? t('detailTitle', { number: open.displayNumber, order: open.orderNumber }) : ''
        }
        description={
          open ? `${tr(`reasons.${open.reason}`)}${open.note ? ` · ${open.note}` : ''}` : ''
        }
      >
        {open ? (
          <div className="grid gap-3">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 text-left font-medium">{t('item')}</th>
                  <th className="py-1 text-right font-medium">{t('quantity')}</th>
                  <th className="py-1 text-left font-medium">{t('outcome')}</th>
                  <th className="py-1 text-right font-medium">{t('credit')}</th>
                </tr>
              </thead>
              <tbody>
                {open.lines.map((line) => (
                  <tr key={`${line.variantId}-${line.bundleNo}`} className="border-t border-border">
                    <td className="py-2">
                      <div>{line.productNameNe}</div>
                      <div className="text-xs text-muted-foreground">
                        {line.productNameEn} · {line.variantLabel}
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums">{line.quantity}</td>
                    <td className="py-2">{tr(`outcomes.${line.outcome}`)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(line.lineCredit, 'en')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right text-sm font-semibold">
              {t('creditTotal')}: {formatMoney(open.creditTotal, 'en')}
            </p>
            <p className="text-xs text-muted-foreground">{t('detailNote')}</p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
