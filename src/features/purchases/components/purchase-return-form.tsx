'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { isApiError, request } from '@/lib/api';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';

type Line = { variantId: string; quantity: string; unitCost: string; vatRate: string };

const emptyLine = (): Line => ({ variantId: '', quantity: '1', unitCost: '', vatRate: '' });
const today = () => new Date().toISOString().slice(0, 10);
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
          </div>
          <Button variant="secondary" onClick={onClose}>
            {tf('cancel')}
          </Button>
          <Button disabled={save.isPending || !supplierId} onClick={() => save.mutate()}>
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
              onChange={(value) => setSupplierId(String(value))}
            />
          </Field>
          <Field label={t('returnBillNumber')} htmlFor="ret-bill">
            <Input
              id="ret-bill"
              value={billNumber}
              maxLength={60}
              onChange={(e) => setBillNumber(e.target.value)}
            />
          </Field>
          <Field label={t('returnDay')} htmlFor="ret-day">
            <BsDatePicker id="ret-day" value={day} onChange={setDay} />
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
                      value={line.variantId}
                      onChange={(value) => change(index, { variantId: String(value) })}
                    />
                  </td>
                  <td className="border-r border-border p-1.5">
                    <Input
                      aria-label={t('quantity')}
                      inputMode="decimal"
                      className="text-right"
                      value={line.quantity}
                      onChange={(e) => change(index, { quantity: e.target.value })}
                    />
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
