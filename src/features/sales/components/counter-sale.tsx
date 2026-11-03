'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { Field } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { Button, IconButton } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { fieldErrors, isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

type Product = Schema<'AdminProductResponse'>;
type Kit = Schema<'AdminKitResponse'>;
type Order = Schema<'AdminOrderResponse'>;
// A pack sold on its own, or a whole kit sold as one.
type Pack = { id: string; label: string; price: string; kind: 'pack' | 'kit' };
type Line = Pack & { quantity: number };

const MONEY = /^\d{1,13}(\.\d{1,2})?$/;
const PHONE = /^\+?[0-9]{7,15}$/;

// Every kit and pack on sale with its price; kits first, as the shop sells them most.
async function loadPacks(): Promise<Pack[]> {
  const [kits, page] = await Promise.all([
    request<{ items: Kit[] }>('GET', '/admin/kits', { query: { limit: 100 } }),
    request<{ items: Product[] }>('GET', '/admin/products', {
      query: { limit: 100, isActive: true },
    }),
  ]);
  return [
    ...kits.items
      .filter((kit) => kit.isActive)
      .map((kit) => ({
        id: kit.id,
        label: `Kit · ${kit.code} · ${kit.nameNe}`,
        price: kit.price,
        kind: 'kit' as const,
      })),
    ...page.items.flatMap((product) =>
      product.variants
        .filter((variant) => variant.isActive)
        .map((variant) => ({
          id: variant.id,
          label: `${variant.sku} · ${product.nameNe} · ${variant.label}`,
          price: variant.price,
          kind: 'pack' as const,
        })),
    ),
  ];
}

// A sale at the shop counter: packs and quantities, then the order it becomes takes the payment.
export function CounterSale() {
  const t = useTranslations('counterSale');
  const tf = useTranslations('forms');
  const toast = useToast();
  const router = useRouter();
  const packs = useQuery({
    queryKey: ['options', 'counter-packs'],
    queryFn: loadPacks,
    staleTime: 60 * 1000,
  });

  const [packId, setPackId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lines, setLines] = useState<Line[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discountKind, setDiscountKind] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // One key per sale: a resend after a lost answer gives back the same order.
  const [saleKey, setSaleKey] = useState(() => crypto.randomUUID());

  const schema = useMemo(
    () =>
      z
        .object({
          lines: z
            .array(
              z.object({
                id: z.string(),
                kind: z.string(),
                quantity: z.number().int().min(1).max(999),
              }),
            )
            .min(1, t('noLines')),
          contactName: z.string().max(120),
          contactPhone: z.union([z.literal(''), z.string().regex(PHONE, t('phone'))]),
          couponCode: z.string().max(40),
          discountValue: z.union([z.literal(''), z.string().regex(MONEY, t('amount'))]),
          discountReason: z.string().max(300),
          note: z.string().max(500),
        })
        .refine((v) => !v.discountValue || v.discountReason.trim(), {
          path: ['discountReason'],
          message: t('reasonNeeded'),
        })
        .refine(
          (v) => discountKind !== 'PERCENT' || !v.discountValue || Number(v.discountValue) <= 100,
          {
            path: ['discountValue'],
            message: t('percent'),
          },
        ),
    [t, discountKind],
  );

  const subtotal = lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);

  function addLine() {
    const pack = packs.data?.find((p) => p.id === packId);
    const count = Number(quantity);
    if (!pack || !Number.isInteger(count) || count < 1) return;
    setLines((current) =>
      current.some((line) => line.id === pack.id)
        ? current.map((line) =>
            line.id === pack.id ? { ...line, quantity: line.quantity + count } : line,
          )
        : [...current, { ...pack, quantity: count }],
    );
    setPackId('');
    setQuantity('1');
  }

  const sell = useMutation({
    mutationFn: (body: unknown) =>
      request<Order>('POST', '/admin/store-sales', {
        body,
        headers: { 'Idempotency-Key': saleKey },
      }),
    onSuccess: (order) => {
      toast.success(t('sold', { number: order.number }));
      setSaleKey(crypto.randomUUID());
      router.push(routes.order(order.id));
    },
    onError: (error) => {
      setErrors(fieldErrors(error));
      toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  function submit() {
    const values = {
      lines: lines.map((line) => ({ id: line.id, kind: line.kind, quantity: line.quantity })),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      couponCode: couponCode.trim(),
      discountValue: discountValue.trim(),
      discountReason: discountReason.trim(),
      note: note.trim(),
    };
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setErrors({});
    sell.mutate({
      lines: values.lines
        .filter((line) => line.kind === 'pack')
        .map((line) => ({ variantId: line.id, quantity: line.quantity })),
      kits: values.lines
        .filter((line) => line.kind === 'kit')
        .map((line) => ({ kitId: line.id, quantity: line.quantity })),
      ...(values.contactName && { contactName: values.contactName }),
      ...(values.contactPhone && { contactPhone: values.contactPhone }),
      ...(values.couponCode && { couponCode: values.couponCode.toUpperCase() }),
      ...(values.note && { note: values.note }),
      ...(values.discountValue && {
        discount: {
          kind: discountKind,
          value: values.discountValue,
          reason: values.discountReason,
        },
      }),
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="grid content-start gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('pack')} htmlFor="sale-pack" className="min-w-72 flex-1">
            <Select id="sale-pack" value={packId} onChange={(e) => setPackId(e.target.value)}>
              <option value="">{packs.isPending ? t('loading') : t('choose')}</option>
              {(['kit', 'pack'] as const).map((kind) => (
                <optgroup key={kind} label={t(kind === 'kit' ? 'kits' : 'packs')}>
                  {(packs.data ?? [])
                    .filter((pack) => pack.kind === kind)
                    .map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.label} — {formatMoney(pack.price, 'en')}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label={t('quantity')} htmlFor="sale-qty" className="w-24">
            <Input
              id="sale-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Button icon="plus" onClick={addLine} disabled={!packId}>
            {t('add')}
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="py-2 font-medium">{t('pack')}</th>
              <th className="py-2 text-right font-medium">{t('price')}</th>
              <th className="w-24 py-2 text-right font-medium">{t('quantity')}</th>
              <th className="py-2 text-right font-medium">{t('total')}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-border/60">
                <td className="py-2">{line.label}</td>
                <td className="py-2 text-right">{formatMoney(line.price, 'en')}</td>
                <td className="py-2 text-right">
                  <Input
                    type="number"
                    min={1}
                    aria-label={t('quantity')}
                    value={line.quantity}
                    className="ml-auto h-8 w-20 text-right"
                    onChange={(e) => {
                      const count = Math.max(1, Number(e.target.value) || 1);
                      setLines((current) =>
                        current.map((l) => (l.id === line.id ? { ...l, quantity: count } : l)),
                      );
                    }}
                  />
                </td>
                <td className="py-2 text-right font-medium">
                  {formatMoney((Number(line.price) * line.quantity).toFixed(2), 'en')}
                </td>
                <td className="py-2 text-right">
                  <IconButton
                    icon="trash"
                    variant="danger"
                    label={t('remove')}
                    onClick={() => setLines((current) => current.filter((l) => l.id !== line.id))}
                  />
                </td>
              </tr>
            ))}
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted-foreground">
                  {errors.lines ?? t('empty')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="text-right text-sm">
          {t('subtotal')}{' '}
          <strong className="text-base">{formatMoney(subtotal.toFixed(2), 'en')}</strong>
        </p>
      </section>

      <aside className="grid content-start gap-4 rounded-lg bg-card p-5 ring-1 ring-border">
        <Field
          label={`${t('customer')} (${tf('optional')})`}
          htmlFor="sale-name"
          error={errors.contactName}
        >
          <Input
            id="sale-name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </Field>
        <Field
          label={`${t('phone')} (${tf('optional')})`}
          htmlFor="sale-phone"
          error={errors.contactPhone}
        >
          <Input
            id="sale-phone"
            inputMode="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </Field>
        <Field
          label={`${t('coupon')} (${tf('optional')})`}
          htmlFor="sale-coupon"
          error={errors.couponCode}
        >
          <Input
            id="sale-coupon"
            className="uppercase"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <Field
            label={`${t('discount')} (${tf('optional')})`}
            htmlFor="sale-discount"
            error={errors.discountValue}
          >
            <Input
              id="sale-discount"
              inputMode="decimal"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </Field>
          <Field label={t('discountKind')} htmlFor="sale-discount-kind">
            <Select
              id="sale-discount-kind"
              value={discountKind}
              onChange={(e) => setDiscountKind(e.target.value as 'PERCENT' | 'FLAT')}
            >
              <option value="PERCENT">%</option>
              <option value="FLAT">Rs</option>
            </Select>
          </Field>
        </div>
        {discountValue ? (
          <Field label={t('reason')} htmlFor="sale-reason" error={errors.discountReason}>
            <Input
              id="sale-reason"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
            />
          </Field>
        ) : null}
        <Field label={`${t('note')} (${tf('optional')})`} htmlFor="sale-note" error={errors.note}>
          <Input id="sale-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button size="lg" icon="check" disabled={sell.isPending} onClick={submit}>
          {sell.isPending ? tf('saving') : t('sell')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('afterNote')}</p>
      </aside>
    </div>
  );
}
