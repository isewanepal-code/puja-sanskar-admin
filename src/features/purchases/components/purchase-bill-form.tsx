'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { BsDatePicker } from '@/components/ui/bs-date-picker';
import { Button, IconButton } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { packChoices } from '@/features/products';
import { isApiError, request } from '@/lib/api';
import { formatMoney } from '@/lib/format';

import { supplierChoices, type PurchaseBill } from '../resources';

type Line = { variantId: string; quantity: string; unitCost: string; vatRate: string };

const emptyLine = (): Line => ({ variantId: '', quantity: '1', unitCost: '', vatRate: '' });
const today = () => new Date().toISOString().slice(0, 10);
const amountOf = (l: Line) => (Number(l.quantity) || 0) * (Number(l.unitCost) || 0);
const vatOf = (l: Line) => (amountOf(l) * (l.vatRate === '' ? 13 : Number(l.vatRate))) / 100;
const money = (n: number) => formatMoney(n.toFixed(2), 'en');

type PurchaseBillFormProps = {
  // Leave out to enter a new bill.
  bill?: PurchaseBill;
  open: boolean;
  onClose: () => void;
};

// A supplier's bill line by line; it stays a draft until posted.
export function PurchaseBillForm({ bill, open, onClose }: PurchaseBillFormProps) {
  const t = useTranslations('purchases');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState(bill?.supplierId ?? '');
  const [number, setNumber] = useState(bill?.supplierBillNumber ?? '');
  const [day, setDay] = useState(bill?.billDay ?? today());
  const [note, setNote] = useState(bill?.note ?? '');
  const [lines, setLines] = useState<Line[]>(
    bill?.lines.map((l) => ({
      variantId: l.variantId,
      quantity: String(l.quantity),
      unitCost: l.unitCost,
      vatRate: String(Number(l.vatRate)),
    })) ?? [emptyLine()],
  );
  const suppliers = useQuery({
    queryKey: ['options', supplierChoices.key],
    queryFn: supplierChoices.load,
  });
  const packs = useQuery({
    queryKey: ['options', packChoices.key],
    queryFn: packChoices.load,
    staleTime: 5 * 60 * 1000,
  });

  const change = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        supplierId,
        supplierBillNumber: number.trim(),
        billDay: day,
        note: note.trim() || null,
        lines: lines
          .filter((l) => l.variantId)
          .map((l) => ({
            variantId: l.variantId,
            quantity: Number(l.quantity),
            unitCost: l.unitCost,
            ...(l.vatRate !== '' && { vatRate: l.vatRate }),
          })),
      };
      return bill
        ? request('PUT', `/admin/purchase-bills/${bill.id}`, { body })
        : request('POST', '/admin/purchase-bills', { body });
    },
    onSuccess: async () => {
      toast.success(bill ? tf('saved') : t('drafted'));
      await queryClient.invalidateQueries({ queryKey: ['purchaseBills'] });
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
      title={bill ? t('editBill', { number: bill.supplierBillNumber }) : t('newBill')}
      description={t('billNote')}
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
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? tf('saving') : t('saveDraft')}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('supplier')} htmlFor="bill-supplier">
            <Select
              id="bill-supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">—</option>
              {(suppliers.data ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('billNumber')} htmlFor="bill-number">
            <Input
              id="bill-number"
              value={number}
              maxLength={60}
              onChange={(e) => setNumber(e.target.value)}
            />
          </Field>
          <Field label={t('billDay')} htmlFor="bill-day">
            <BsDatePicker id="bill-day" value={day} onChange={setDay} />
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
                    <Select
                      aria-label={t('pack')}
                      value={line.variantId}
                      onChange={(e) => change(index, { variantId: e.target.value })}
                    >
                      <option value="">—</option>
                      {(packs.data ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="border-r border-border p-1.5">
                    <Input
                      aria-label={t('quantity')}
                      inputMode="numeric"
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
                    <Select
                      aria-label={t('vat')}
                      value={line.vatRate}
                      onChange={(e) => change(index, { vatRate: e.target.value })}
                    >
                      <option value="">{t('vatAuto')}</option>
                      <option value="13">13%</option>
                      <option value="0">{t('vatNone')}</option>
                    </Select>
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
        <Field label={t('note')} htmlFor="bill-note">
          <Input
            id="bill-note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
