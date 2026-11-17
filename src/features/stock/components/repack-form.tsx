'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';

type Level = Schema<'StockLevelResponse'>;
type Product = Schema<'AdminProductResponse'>;

const round = (n: number) => Math.round(n * 1000) / 1000;
type Output = { variantId: string; quantity: string; amount: string; unitId: string };
const NEW = 'NEW';
const blank = (): Output => ({ variantId: '', quantity: '', amount: '', unitId: '' });

// Opens some of a bulk pack and makes smaller packs of the same item; the cost goes with it.
export function RepackForm({ level, onClose }: { level: Level | null; onClose: () => void }) {
  const t = useTranslations('repack');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = useRef(crypto.randomUUID());
  const [opened, setOpened] = useState('1');
  const [outputs, setOutputs] = useState<Output[]>([blank()]);
  const [note, setNote] = useState('');
  // The item's other packs: the only ones a bulk pack can be opened into.
  const product = useQuery({
    queryKey: ['products', 'repack', level?.product.id],
    queryFn: () => request<Product>('GET', `/admin/products/${level!.product.id}`),
    enabled: Boolean(level),
  });

  const save = useMutation({
    mutationFn: () =>
      request('POST', '/admin/stock-repacks', {
        headers: { 'Idempotency-Key': key.current },
        body: {
          sourceVariantId: level!.variant.id,
          sourceQuantity: Number(opened),
          note: note.trim() || null,
          outputs: outputs
            .filter((o) => o.variantId && Number(o.quantity) > 0)
            .map((o) =>
              o.variantId === NEW
                ? {
                    newPack: { packQuantity: Number(o.amount), packUnitId: o.unitId },
                    quantity: Number(o.quantity),
                  }
                : { variantId: o.variantId, quantity: Number(o.quantity) },
            ),
        },
      }),
    onSuccess: async () => {
      toast.success(t('done'));
      await Promise.all(
        ['stock', 'products'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })),
      );
      onClose();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  if (!level) return null;
  const packs = product.data?.variants ?? [];
  const source = packs.find((pack) => pack.id === level.variant.id);
  const others = packs.filter((pack) => pack.id !== level.variant.id);
  // Where every pack states its size in one unit, what goes in can be set against what comes out.
  const sized =
    source?.pack &&
    outputs.every((o) => {
      if (o.variantId === NEW) return o.unitId === source.pack?.unit.id;
      const pack = packs.find((p) => p.id === o.variantId);
      return !o.variantId || (pack?.pack && pack.pack.unit.id === source.pack?.unit.id);
    });
  const openedAmount = source?.pack ? source.pack.quantity * (Number(opened) || 0) : 0;
  const madeAmount = outputs.reduce((sum, o) => {
    if (o.variantId === NEW) return sum + (Number(o.amount) || 0) * (Number(o.quantity) || 0);
    const pack = packs.find((p) => p.id === o.variantId);
    return sum + (pack?.pack ? pack.pack.quantity * (Number(o.quantity) || 0) : 0);
  }, 0);
  const wasted = round(openedAmount - madeAmount);
  const symbol = source?.pack?.unit.symbol ?? '';
  const tooMuch = Boolean(sized) && madeAmount > openedAmount + 0.0005;
  const change = (index: number, patch: Partial<Output>) =>
    setOutputs((current) => current.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  const ready =
    !tooMuch &&
    outputs.every((o) => o.variantId !== NEW || (Number(o.amount) > 0 && o.unitId)) &&
    Number(opened) > 0 &&
    outputs.some((o) => o.variantId && Number(o.quantity) > 0);

  return (
    <Modal
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      size="lg"
      title={t('title', { name: `${level.product.nameNe} · ${level.variant.label}` })}
      description={t('note')}
      footer={
        <>
          <div className="mr-auto text-sm text-muted-foreground">
            {t('onHand', { count: level.available })}
          </div>
          <Button variant="secondary" onClick={onClose}>
            {tf('cancel')}
          </Button>
          <Button disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? tf('saving') : t('submit')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={t('opened')} htmlFor="repack-opened">
          <Input
            id="repack-opened"
            inputMode="decimal"
            className="max-w-32"
            value={opened}
            onChange={(e) => setOpened(e.target.value)}
          />
        </Field>
        <div className="grid gap-2">
          <div className="text-sm font-medium">{t('into')}</div>
          {outputs.map((output, index) => (
            <div key={index} className="grid gap-2">
              <div className="grid grid-cols-[1fr_7rem_2.5rem] items-center gap-2">
                <SearchSelect
                  aria-label={t('pack')}
                  placeholder={t('choosePack')}
                  value={output.variantId}
                  options={[
                    ...others.map((pack) => ({ value: pack.id, label: pack.label })),
                    { value: NEW, label: t('newPack') },
                  ]}
                  onChange={(value) => change(index, { variantId: String(value) })}
                />
                <Input
                  aria-label={t('howMany')}
                  inputMode="decimal"
                  placeholder={t('howMany')}
                  className="text-right"
                  value={output.quantity}
                  onChange={(e) => change(index, { quantity: e.target.value })}
                />
                <IconButton
                  icon="trash"
                  variant="danger"
                  label={t('remove')}
                  disabled={outputs.length === 1}
                  onClick={() => setOutputs((current) => current.filter((_, i) => i !== index))}
                />
              </div>
              {output.variantId === NEW ? (
                <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-2">
                  <Input
                    aria-label={t('newAmount')}
                    inputMode="decimal"
                    placeholder={t('newAmount')}
                    value={output.amount}
                    onChange={(e) => change(index, { amount: e.target.value })}
                  />
                  <SearchSelect
                    aria-label={t('newUnit')}
                    placeholder={t('newUnit')}
                    source={choices.units}
                    value={output.unitId}
                    onChange={(value) => change(index, { unitId: String(value) })}
                  />
                </div>
              ) : null}
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOutputs((current) => [...current, blank()])}
            >
              <Icon name="plus" size={14} />
              {t('addPack')}
            </Button>
          </div>
        </div>
        {sized && openedAmount > 0 ? (
          <div
            role="status"
            className={`rounded-md border px-3 py-2 text-sm ${tooMuch ? 'border-destructive text-destructive' : 'border-border'}`}
          >
            {tooMuch
              ? t('tooMuch', { made: round(madeAmount), opened: round(openedAmount), unit: symbol })
              : t('balance', {
                  opened: round(openedAmount),
                  made: round(madeAmount),
                  wasted,
                  percent: ((Math.max(wasted, 0) / openedAmount) * 100).toFixed(1),
                  unit: symbol,
                })}
          </div>
        ) : null}
        <Field label={t('noteLabel')} htmlFor="repack-note">
          <Input
            id="repack-note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
