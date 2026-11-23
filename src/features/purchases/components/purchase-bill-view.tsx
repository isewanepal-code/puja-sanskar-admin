'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';
import { Link } from '@/i18n/navigation';
import { request, type Schema } from '@/lib/api';
import { formatBsDate, formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

type Bill = Schema<'PurchaseBillResponse'>;
type Supplier = Schema<'SupplierResponse'>;

const money = (amount: string) => formatMoney(amount, 'en');

// A posted bill as it was entered: who it came from, every line, and the totals. Nothing here is
// edited; goods that go back are a return, and a new purchase is made on the Buy page.
export function PurchaseBillView({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const t = useTranslations('purchases');
  const supplier = useQuery({
    queryKey: ['suppliers', bill.supplierId],
    queryFn: () => request<Supplier>('GET', `/admin/suppliers/${bill.supplierId}`),
  });
  const s = supplier.data;
  const hasDiscount = Number(bill.discount) > 0;

  return (
    <Modal
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      size="xl"
      title={t('billTitle', { number: bill.supplierBillNumber })}
      description={t('billViewNote')}
    >
      <div className="grid gap-5">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">{t('supplier')}</dt>
            <dd className="font-medium">{bill.supplierName}</dd>
            {s ? (
              <dd className="text-xs text-muted-foreground">
                {[s.phone, s.panNumber ? `PAN ${s.panNumber}` : null, s.address]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('billDay')}</dt>
            <dd>
              {bill.billDay}{' '}
              <span className="text-xs text-muted-foreground">
                {formatBsDate(bill.billDay, 'en')}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('billNumber')}</dt>
            <dd className="font-medium">{bill.supplierBillNumber}</dd>
          </div>
        </dl>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-2 py-2 text-left font-semibold">{t('pack')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('quantity')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('unitCost')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('vat')}</th>
                <th className="px-2 py-2 text-left font-semibold">{t('expiresOn')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((l) => (
                <tr key={l.id} className="border-t border-border align-top">
                  <td className="px-2 py-2">
                    <div className="font-medium">{l.packName}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.sku}
                      {l.remarks ? ` · ${l.remarks}` : ''}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.quantity}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(l.unitCost)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{Number(l.vatRate)}%</td>
                  <td className="px-2 py-2">{l.expiresOn ?? '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-sm tabular-nums">
          <dt className="text-muted-foreground">{t('beforeVat')}</dt>
          <dd className="text-right">
            {money((Number(bill.taxableTotal) + Number(bill.exemptTotal)).toFixed(2))}
          </dd>
          <dt className="text-muted-foreground">{t('vat')}</dt>
          <dd className="text-right">{money(bill.vatTotal)}</dd>
          {hasDiscount ? (
            <>
              <dt className="text-muted-foreground">{t('discount')}</dt>
              <dd className="text-right">− {money(bill.discount)}</dd>
            </>
          ) : null}
          <dt className="font-semibold">{t('totalToPay')}</dt>
          <dd className="text-right font-semibold">{money(bill.total)}</dd>
        </dl>

        {bill.note ? <p className="text-sm text-muted-foreground">{bill.note}</p> : null}
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href={routes.supplierStatement()} className="text-primary hover:underline">
            {t('statementLink')}
          </Link>
          <Link href={routes.supplierPayments()} className="text-primary hover:underline">
            {t('paymentsLink')}
          </Link>
          <Link href={routes.purchaseReturns()} className="text-primary hover:underline">
            {t('returnLink')}
          </Link>
        </div>
      </div>
    </Modal>
  );
}
