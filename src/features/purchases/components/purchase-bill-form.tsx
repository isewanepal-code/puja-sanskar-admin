'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Fragment, useState } from 'react';

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

import { packInfo } from '../pack-info';
import type { PurchaseBill } from '../resources';

type Line = {
  variantId: string;
  quantity: string;
  unitCost: string;
  vatRate: string;
  // How much one sack / box / roll holds (said once, kept on the pack), and in which unit.
  holds: string;
  holdsUnit: string;
};

const emptyLine = (): Line => ({
  variantId: '',
  quantity: '1',
  unitCost: '',
  vatRate: '',
  holds: '',
  holdsUnit: '',
});
const today = () => new Date().toISOString().slice(0, 10);
const amountOf = (l: Line) => (Number(l.quantity) || 0) * (Number(l.unitCost) || 0);
const vatOf = (l: Line) => (amountOf(l) * (l.vatRate === '' ? 13 : Number(l.vatRate))) / 100;
const money = (n: number) => formatMoney(n.toFixed(2), 'en');

type PurchaseBillFormProps = {
  // Leave out to enter a new bill.
  bill?: PurchaseBill;
  // A new bill that starts with these packs (from an item's page), quantity to be filled in.
  packs?: Array<{ value: string; label: string; detail?: string }>;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

// A supplier's bill line by line; it stays a draft until posted.
export function PurchaseBillForm({ bill, packs, open, onClose, onSaved }: PurchaseBillFormProps) {
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
      holds: '',
      holdsUnit: '',
    })) ??
      (packs?.length
        ? packs.map((pack) => ({ ...emptyLine(), variantId: pack.value, quantity: '' }))
        : [emptyLine()]),
  );

  // The bill names its packs, so a draft opens without looking them up.
  const packNames = [
    ...(bill?.lines ?? []).map((l) => ({
      value: l.variantId,
      label: l.packName,
      detail: l.sku,
    })),
    ...(packs ?? []),
  ];
  const supplierName = bill ? [{ value: bill.supplierId, label: bill.supplierName }] : undefined;

  const change = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const save = useMutation<boolean, unknown, boolean>({
    mutationFn: async (andPost: boolean) => {
      // A sack, box or roll that says how much it holds: kept on the pack, which is then named by it.
      const sized = lines.filter((l) => l.variantId && Number(l.holds) > 0);
      if (sized.length > 0) {
        const units = (
          await request<{ items: Array<{ id: string; symbol: string }> }>('GET', '/admin/units', {
            query: { limit: 100 },
          })
        ).items;
        for (const l of sized) {
          const info = await queryClient.fetchQuery({
            queryKey: ['packInfo', l.variantId],
            queryFn: () => packInfo(l.variantId),
            staleTime: 60_000,
          });
          const unitId = l.holdsUnit || info?.defaultUnitId;
          const symbol = units.find((u) => u.id === unitId)?.symbol;
          if (!info?.container || !unitId || !symbol) continue;
          await request('PATCH', `/admin/products/${info.productId}/variants/${l.variantId}`, {
            body: {
              packQuantity: Number(l.holds),
              packUnitId: unitId,
              label: `${Number(l.holds)} ${symbol} ${info.containerName}`,
            },
          });
        }
      }
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
      const saved = bill
        ? await request<{ id: string }>('PUT', `/admin/purchase-bills/${bill.id}`, { body })
        : await request<{ id: string }>('POST', '/admin/purchase-bills', { body });
      // Posting puts what came in on the shelf, so it carries an Idempotency-Key: a retry posts once.
      if (andPost)
        await request('POST', `/admin/purchase-bills/${saved.id}/post`, {
          headers: { 'Idempotency-Key': `post-${saved.id}` },
        });
      return andPost;
    },
    onSuccess: async (posted) => {
      toast.success(posted ? t('posted') : bill ? tf('saved') : t('drafted'));
      await queryClient.invalidateQueries({ queryKey: ['purchaseBills'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      onSaved?.();
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
          <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate(false)}>
            {save.isPending ? tf('saving') : t('saveDraft')}
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate(true)}>
            {t('saveAndPost')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('supplier')} htmlFor="bill-supplier">
            <SearchSelect
              id="bill-supplier"
              source={choices.suppliers}
              known={supplierName}
              required
              value={supplierId}
              onChange={(value) => setSupplierId(String(value))}
            />
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
                <Fragment key={index}>
                  <tr className="border-t border-border">
                    <td className="border-r border-border p-1.5">
                      <SearchSelect
                        aria-label={t('pack')}
                        source={choices.packs}
                        known={packNames}
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
                  <HoldsRow
                    variantId={line.variantId}
                    holds={line.holds}
                    unitId={line.holdsUnit}
                    onChange={(patch) => change(index, patch)}
                  />
                </Fragment>
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

// Under a line that is a sack, box or roll of something weighed: how much one holds, written once.
function HoldsRow({
  variantId,
  holds,
  unitId,
  onChange,
}: {
  variantId: string;
  holds: string;
  unitId: string;
  onChange: (patch: Partial<Line>) => void;
}) {
  const t = useTranslations('purchases');
  const info = useQuery({
    queryKey: ['packInfo', variantId],
    queryFn: () => packInfo(variantId),
    enabled: Boolean(variantId),
    staleTime: 60_000,
  });
  const units = useQuery({
    queryKey: ['units', 'all'],
    queryFn: () =>
      request<{ items: Array<{ id: string; symbol: string; nameNe: string; dimension: string }> }>(
        'GET',
        '/admin/units',
        { query: { limit: 100 } },
      ),
    enabled: Boolean(info.data?.container),
    staleTime: 600_000,
  });
  if (!info.data?.container) return null;
  const options = (units.data?.items ?? [])
    .filter((u) => u.dimension === info.data!.sellBy)
    .map((u) => ({ value: u.id, label: `${u.nameNe} (${u.symbol})` }));
  return (
    <tr className="bg-primary/5">
      <td colSpan={6} className="px-3 py-2">
        <div className="grid gap-1">
          <p className="text-sm font-medium">
            {t('holdsTitle', { container: info.data.containerName })}
          </p>
          <div className="grid max-w-md grid-cols-[7rem_1fr] gap-2">
            <Input
              aria-label={t('holdsTitle', { container: info.data.containerName })}
              inputMode="decimal"
              placeholder="25"
              value={holds}
              onChange={(e) => onChange({ holds: e.target.value })}
            />
            <SearchSelect
              aria-label={t('holdsUnit')}
              options={options}
              value={unitId || info.data.defaultUnitId}
              onChange={(value) => onChange({ holdsUnit: String(value) })}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('holdsHint')}</p>
        </div>
      </td>
    </tr>
  );
}
