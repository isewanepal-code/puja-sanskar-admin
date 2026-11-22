'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';
import { pagedSource } from '@/lib/choices';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { cn } from '@/lib/utils';

import { REASONS, type Reason } from '../resources';

type Order = Schema<'AdminOrderResponse'>;
type Returnable = Schema<'ReturnableResponse'>;
type Outcome = 'RESTOCK' | 'WRITE_OFF';
type Line = { qty: string; outcome: Outcome };

const METHODS = ['CASH', 'QR', 'ESEWA', 'KHALTI', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const;
type Method = (typeof METHODS)[number];

const key = (line: { variantId: string; bundleNo: number }) => `${line.variantId}:${line.bundleNo}`;
const cents = (value: number) => Math.round(value * 100) / 100;
const box =
  'h-9 w-24 rounded-md border border-input bg-card px-2 text-right text-sm outline-none focus:border-primary aria-invalid:border-destructive';

// Orders to pick from: by number, name or phone.
const orders = pagedSource<Order>('orders-return', {
  path: '/admin/orders',
  toChoices: (order) => [
    {
      value: order.id,
      label: `${order.number}${order.contactName ? ` · ${order.contactName}` : ''}`,
      detail: formatMoney(order.total, 'en'),
      sub: order.status,
    },
  ],
  find: (id) => `/admin/orders/${id}`,
});

// A customer brings goods back: choose what, why, whether it goes back on the shelf, and whether the
// money goes back now.
export function NewReturnPage() {
  const t = useTranslations('customerReturn');
  const tr = useTranslations('resources.salesReturns');
  const tm = useTranslations('resources.refund.methods');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fromUrl = useSearchParams().get('order') ?? '';
  const [orderId, setOrderId] = useState(fromUrl);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [reason, setReason] = useState<Reason | ''>('');
  const [note, setNote] = useState('');
  const [payBack, setPayBack] = useState(true);
  const [method, setMethod] = useState<Method>('CASH');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [tried, setTried] = useState(false);

  const order = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => request<Order>('GET', `/admin/orders/${orderId}`),
    enabled: Boolean(orderId),
  });
  const returnable = useQuery({
    queryKey: ['sales-returns', 'returnable', orderId],
    queryFn: () => request<Returnable>('GET', `/admin/sales-returns/orders/${orderId}/returnable`),
    enabled: Boolean(orderId),
  });

  const rows = returnable.data?.lines ?? [];
  const chosen = rows
    .map((row) => ({ row, line: lines[key(row)], qty: Number(lines[key(row)]?.qty ?? 0) }))
    .filter(({ qty }) => qty > 0);
  const credit = cents(chosen.reduce((sum, { row, qty }) => sum + qty * Number(row.unitCredit), 0));
  // No more than the customer has paid beyond what the order is still owed once this credit is off.
  const mostBack = cents(Number(returnable.data?.refundable ?? 0) + credit);
  const refundAmount = amount.trim() === '' ? mostBack : Number(amount);

  const rowProblem = (row: Returnable['lines'][number]): string | null => {
    const raw = lines[key(row)]?.qty ?? '';
    if (raw.trim() === '') return null;
    if (!/^\d+(\.\d{1,3})?$/.test(raw.trim())) return t('qtyFormat');
    if (Number(raw) > row.remaining) return t('qtyTooMany', { max: row.remaining });
    return null;
  };
  const problems = {
    order: !orderId ? t('needOrder') : null,
    lines:
      chosen.length === 0 ? t('needLines') : rows.some((r) => rowProblem(r)) ? t('fixLines') : null,
    reason: !reason ? t('needReason') : null,
    amount: !payBack
      ? null
      : !(refundAmount > 0)
        ? t('needAmount')
        : refundAmount > mostBack + 0.001
          ? t('amountTooBig', { max: formatMoney(mostBack.toFixed(2), 'en') })
          : !/^\d+(\.\d{1,2})?$/.test(
                String(amount.trim() === '' ? mostBack.toFixed(2) : amount.trim()),
              )
            ? t('amountFormat')
            : null,
    reference: payBack && method !== 'CASH' && !reference.trim() ? t('needReference') : null,
  };
  const firstProblem = Object.values(problems).find(Boolean) ?? null;

  const dirty = chosen.length > 0 || note.trim() !== '' || reason !== '';
  const save = useMutation({
    mutationFn: () =>
      request<Schema<'SalesReturnResponse'>>('POST', '/admin/sales-returns', {
        body: {
          orderId,
          reason,
          ...(note.trim() && { note: note.trim() }),
          lines: chosen.map(({ row, line, qty }) => ({
            variantId: row.variantId,
            bundleNo: row.bundleNo,
            quantity: qty,
            outcome: line?.outcome ?? 'RESTOCK',
          })),
          ...(payBack && {
            refund: {
              method,
              amount: (amount.trim() === '' ? mostBack : Number(amount)).toFixed(2),
              ...(reference.trim() && { reference: reference.trim() }),
            },
          }),
        },
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    onSuccess: async (saved) => {
      toast.success(t('saved', { number: saved.displayNumber }));
      await Promise.all(
        ['sales-returns', 'orders', 'stock', 'products', 'payments'].map((k) =>
          queryClient.invalidateQueries({ queryKey: [k] }),
        ),
      );
      router.push(routes.customerReturns());
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  const guard = useUnsavedGuard(dirty && !save.isPending && !save.isSuccess);

  const set = (row: Returnable['lines'][number], patch: Partial<Line>) =>
    setLines((all) => ({
      ...all,
      [key(row)]: { ...(all[key(row)] ?? { qty: '', outcome: 'RESTOCK' as Outcome }), ...patch },
    }));
  const submit = () => {
    if (firstProblem) {
      setTried(true);
      toast.error(firstProblem);
      return;
    }
    save.mutate();
  };

  return (
    <div className="grid max-w-5xl gap-6">
      {guard}
      <p className="text-sm text-muted-foreground">{t('note')}</p>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <Field
          label={`${t('order')} *`}
          htmlFor="return-order"
          error={tried ? (problems.order ?? undefined) : undefined}
          hint={t('orderHint')}
        >
          <SearchSelect
            id="return-order"
            source={orders}
            value={orderId}
            onChange={(value) => {
              setOrderId(String(value));
              setLines({});
              setAmount('');
            }}
          />
        </Field>
        {order.data ? (
          <dl className="grid content-start gap-0.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('customer')}</dt>
              <dd>{order.data.contactName ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('orderTotal')}</dt>
              <dd className="tabular-nums">{formatMoney(order.data.total, 'en')}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('status')}</dt>
              <dd>{order.data.status}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      {orderId && returnable.isPending ? (
        <p className="text-sm text-muted-foreground">{tf('saving').replace('...', '…')}</p>
      ) : null}

      {rows.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-heading text-base font-semibold">{t('whatReturned')}</h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t('item')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('sold')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('alreadyBack')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('returnNow')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('outcome')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('credit')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const line = lines[key(row)];
                  const problem = rowProblem(row);
                  const qty = Number(line?.qty ?? 0);
                  return (
                    <tr key={key(row)} className="border-t border-border align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.productNameNe}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.productNameEn} · {row.variantLabel}
                          {row.kitNameEn ? ` · ${row.kitNameEn}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.sold}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.returned}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          inputMode="decimal"
                          aria-label={t('returnNowFor', { name: row.productNameEn })}
                          aria-invalid={problem ? true : undefined}
                          disabled={row.remaining <= 0}
                          value={line?.qty ?? ''}
                          placeholder="0"
                          onChange={(e) => set(row, { qty: e.target.value })}
                          className={box}
                        />
                        {problem ? (
                          <p role="alert" className="mt-1 max-w-40 text-xs text-destructive">
                            {problem}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="w-48">
                          <SearchSelect
                            required
                            aria-label={t('outcomeFor', { name: row.productNameEn })}
                            disabled={qty <= 0}
                            options={[
                              { value: 'RESTOCK', label: tr('outcomes.RESTOCK') },
                              { value: 'WRITE_OFF', label: tr('outcomes.WRITE_OFF') },
                            ]}
                            value={line?.outcome ?? 'RESTOCK'}
                            onChange={(value) => set(row, { outcome: String(value) as Outcome })}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {qty > 0 && !problem
                          ? formatMoney((qty * Number(row.unitCredit)).toFixed(2), 'en')
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {tried && problems.lines ? (
            <p role="alert" className="text-sm text-destructive">
              {problems.lines}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">{t('outcomeNote')}</p>
        </section>
      ) : null}

      {rows.length > 0 ? (
        <>
          <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
            <Field
              label={`${t('reason')} *`}
              htmlFor="return-reason"
              error={tried ? (problems.reason ?? undefined) : undefined}
            >
              <SearchSelect
                id="return-reason"
                required
                invalid={tried && Boolean(problems.reason)}
                placeholder={t('chooseReason')}
                options={REASONS.map((r) => ({ value: r, label: tr(`reasons.${r}`) }))}
                value={reason}
                onChange={(value) => setReason(String(value) as Reason | '')}
              />
            </Field>
            <Field label={t('noteLabel')} htmlFor="return-note" hint={t('noteHint')}>
              <Input
                id="return-note"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </section>

          <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={payBack}
                onChange={(e) => setPayBack(e.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              {t('payBack')}
            </label>
            {payBack ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t('method')} htmlFor="return-method">
                  <SearchSelect
                    id="return-method"
                    required
                    options={METHODS.map((m) => ({ value: m, label: tm(m) }))}
                    value={method}
                    onChange={(value) => setMethod(String(value) as Method)}
                  />
                </Field>
                <Field
                  label={t('amount')}
                  htmlFor="return-amount"
                  hint={t('amountHint', { max: formatMoney(mostBack.toFixed(2), 'en') })}
                  error={tried ? (problems.amount ?? undefined) : undefined}
                >
                  <Input
                    id="return-amount"
                    inputMode="decimal"
                    value={amount}
                    placeholder={mostBack.toFixed(2)}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Field
                  label={method === 'CASH' ? t('reference') : `${t('reference')} *`}
                  htmlFor="return-ref"
                  error={tried ? (problems.reference ?? undefined) : undefined}
                >
                  <Input
                    id="return-ref"
                    value={reference}
                    maxLength={100}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('payLater')}</p>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p
              className={cn('text-sm', firstProblem ? 'text-destructive' : 'text-muted-foreground')}
            >
              {firstProblem ?? t('summary', { credit: formatMoney(credit.toFixed(2), 'en') })}
            </p>
            <Button disabled={save.isPending} onClick={submit}>
              {save.isPending ? tf('saving') : t('submit')}
            </Button>
          </div>
        </>
      ) : orderId && !returnable.isPending ? (
        <p className="text-sm text-muted-foreground">{t('nothing')}</p>
      ) : null}
    </div>
  );
}
