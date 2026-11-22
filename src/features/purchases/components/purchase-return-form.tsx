'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { BsDatePicker } from '@/components/ui/bs-date-picker';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';

type Bill = Schema<'PurchaseBillResponse'>;
// `bought` is how many the chosen bill had of this pack: what can go back is no more than that.
type Line = {
  variantId: string;
  quantity: string;
  unitCost: string;
  vatRate: string;
  bought?: number;
};

const MAX_QUANTITY = 1_000_000;
const MAX_MONEY = 100_000_000;

const emptyLine = (): Line => ({ variantId: '', quantity: '1', unitCost: '', vatRate: '' });
const today = () => new Date().toISOString().slice(0, 10);
// A bill's lines as the lines of a return: the whole bill to start, to be lowered to what goes back.
const fromBill = (bill: Bill): Line[] => {
  // A discount on the whole bill is taken off every rate, so goods go back at what they really cost.
  const gross = Number(bill.taxableTotal) + Number(bill.exemptTotal) + Number(bill.vatTotal);
  const share = gross > 0 ? 1 - Number(bill.discount) / gross : 1;
  return bill.lines.map((l) => ({
    variantId: l.variantId,
    quantity: String(l.quantity),
    unitCost: (Number(l.unitCost) * share).toFixed(2),
    vatRate: String(Number(l.vatRate)),
    bought: l.quantity,
  }));
};
const amountOf = (l: Line) => (Number(l.quantity) || 0) * (Number(l.unitCost) || 0);
const vatOf = (l: Line) => (amountOf(l) * (l.vatRate === '' ? 13 : Number(l.vatRate))) / 100;
const money = (n: number) => formatMoney(n.toFixed(2), 'en');

// Goods going back to a supplier: stock goes down and what we owe them goes down, at once.
export function PurchaseReturnForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('purchases');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = useRef(crypto.randomUUID());
  const [supplierId, setSupplierId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [day, setDay] = useState(today());
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [tried, setTried] = useState(false);

  // The supplier's bills in stock: pick one and its lines are filled in.
  const bills = useQuery({
    queryKey: ['purchaseBills', 'for-return', supplierId],
    queryFn: () =>
      request<{ items: Bill[] }>('GET', '/admin/purchase-bills', {
        query: { supplierId, status: 'POSTED', limit: 100 },
      }),
    enabled: Boolean(supplierId),
  });
  const picked = bills.data?.items.find((b) => b.supplierBillNumber === billNumber);

  const chooseSupplier = (id: string) => {
    setSupplierId(id);
    // Another supplier's bills and lines do not carry over.
    setBillNumber('');
    setLines([emptyLine()]);
  };
  const chooseBill = (number: string) => {
    setBillNumber(number);
    const bill = bills.data?.items.find((b) => b.supplierBillNumber === number);
    setLines(bill ? fromBill(bill) : [emptyLine()]);
  };

  const lineProblem = (l: Line, i: number): string | null => {
    if (!l.variantId) return null;
    const n = i + 1;
    const q = Number(l.quantity);
    if (!(q > 0) || !/^\d+(\.\d{1,3})?$/.test(l.quantity.trim())) return t('retQuantity', { n });
    if (q > MAX_QUANTITY) return t('retQuantity', { n });
    if (l.bought !== undefined && q > l.bought) return t('retMoreThanBought', { n, max: l.bought });
    if (!(Number(l.unitCost) > 0) || !/^\d+(\.\d{1,2})?$/.test(l.unitCost.trim()))
      return t('retRate', { n });
    if (Number(l.unitCost) > MAX_MONEY) return t('retRate', { n });
    return null;
  };
  const filled = lines.filter((l) => l.variantId);
  const problem = !supplierId
    ? tf('stillNeeded', { fields: t('supplier') })
    : filled.length === 0
      ? t('retNoLines')
      : (lines.map(lineProblem).find(Boolean) ??
        (day > today()
          ? t('retDayFuture')
          : picked && day < picked.billDay
            ? t('retDayBeforeBill')
            : null));

  const change = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: () =>
      request('POST', '/admin/purchase-returns', {
        headers: { 'Idempotency-Key': key.current },
        body: {
          supplierId,
          billNumber: billNumber.trim() || null,
          returnDay: day,
          reason: reason.trim() || null,
          lines: lines
            .filter((l) => l.variantId)
            .map((l) => ({
              variantId: l.variantId,
              quantity: Number(l.quantity),
              unitCost: l.unitCost,
              ...(l.vatRate !== '' && { vatRate: l.vatRate }),
            })),
        },
      }),
    onSuccess: async () => {
      toast.success(t('returned'));
      await Promise.all(
        ['purchaseReturns', 'suppliers', 'stock', 'products'].map((k) =>
          queryClient.invalidateQueries({ queryKey: [k] }),
        ),
      );
      onClose();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const subtotal = lines.reduce((sum, l) => sum + amountOf(l), 0);
  const vat = lines.reduce((sum, l) => sum + vatOf(l), 0);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      size="xl"
      title={t('newReturn')}
      description={t('returnNote')}
      footer={
        <>
          <div className="mr-auto text-sm text-muted-foreground">
            {t('totals', {
              subtotal: money(subtotal),
              vat: money(vat),
              total: money(subtotal + vat),
            })}
            {problem ? <div className="text-destructive">{problem}</div> : null}
          </div>
          <Button variant="secondary" onClick={onClose}>
            {tf('cancel')}
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => {
              if (problem) {
                setTried(true);
                toast.error(problem);
                return;
              }
              save.mutate();
            }}
          >
            {save.isPending ? tf('saving') : t('saveReturn')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('supplier')} htmlFor="ret-supplier">
            <SearchSelect
              id="ret-supplier"
              source={choices.suppliers}
              required
              value={supplierId}
              onChange={(value) => chooseSupplier(String(value))}
            />
          </Field>
          <Field label={t('returnBillNumber')} htmlFor="ret-bill" hint={t('returnBillHint')}>
            <SearchSelect
              id="ret-bill"
              disabled={!supplierId}
              placeholder={supplierId ? t('returnPickBill') : '—'}
              options={(bills.data?.items ?? []).map((b) => ({
                value: b.supplierBillNumber,
                label: b.supplierBillNumber,
                detail: `${b.billDay} · ${money(Number(b.total))}`,
              }))}
              value={billNumber}
              onChange={(value) => chooseBill(String(value))}
            />
          </Field>
          <Field label={t('returnDay')} htmlFor="ret-day">
            <BsDatePicker
              id="ret-day"
              value={day}
              min={picked?.billDay}
              max={today()}
              onChange={setDay}
            />
          </Field>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="border-r border-border px-2 py-2 text-left font-semibold">
                  {t('pack')}
                </th>
                <th className="w-24 border-r border-border px-2 py-2 text-right font-semibold">
                  {t('quantity')}
                </th>
                <th className="w-32 border-r border-border px-2 py-2 text-right font-semibold">
                  {t('unitCost')}
                </th>
                <th className="w-28 border-r border-border px-2 py-2 text-right font-semibold">
                  {t('vat')}
                </th>
                <th className="w-32 border-r border-border px-2 py-2 text-right font-semibold">
                  {t('amount')}
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="border-t border-border">
                  <td className="border-r border-border p-1.5">
                    <SearchSelect
                      aria-label={t('pack')}
                      source={choices.packs}
                      required
                      disabled={line.bought !== undefined}
                      value={line.variantId}
                      onChange={(value) => change(index, { variantId: String(value) })}
                    />
                  </td>
                  <td className="border-r border-border p-1.5">
                    <Input
                      aria-label={t('quantity')}
                      inputMode="decimal"
                      className="text-right"
                      aria-invalid={tried && lineProblem(line, index) ? true : undefined}
                      value={line.quantity}
                      onChange={(e) => change(index, { quantity: e.target.value })}
                    />
                    {line.bought !== undefined ? (
                      <div className="mt-0.5 text-right text-[0.7rem] text-muted-foreground">
                        {t('boughtOnBill', { n: line.bought })}
                      </div>
                    ) : null}
                  </td>
                  <td className="border-r border-border p-1.5">
                    <Input
                      aria-label={t('unitCost')}
                      inputMode="decimal"
                      className="text-right"
                      value={line.unitCost}
                      onChange={(e) => change(index, { unitCost: e.target.value })}
                    />
                  </td>
                  <td className="border-r border-border p-1.5">
                    <SearchSelect
                      aria-label={t('vat')}
                      value={line.vatRate || 'AUTO'}
                      required
                      options={[
                        { value: 'AUTO', label: t('vatAuto') },
                        { value: '13', label: '13%' },
                        { value: '0', label: t('vatNone') },
                      ]}
                      onChange={(value) =>
                        change(index, { vatRate: value === 'AUTO' ? '' : String(value) })
                      }
                    />
                  </td>
                  <td className="border-r border-border px-2 text-right">
                    {money(amountOf(line) + vatOf(line))}
                  </td>
                  <td className="px-1 text-center">
                    <IconButton
                      icon="trash"
                      variant="danger"
                      label={t('removeLine')}
                      disabled={lines.length === 1}
                      onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLines((current) => [...current, emptyLine()])}
          >
            <Icon name="plus" size={14} />
            {t('addLine')}
          </Button>
        </div>
        <Field label={t('returnReason')} htmlFor="ret-reason">
          <Input
            id="ret-reason"
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
