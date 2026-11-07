'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import { useToast } from '@/components/overlays';
import { fieldErrors, isApiError, request, type Schema } from '@/lib/api';
import { routes } from '@/lib/routes';

import { CataloguePanel } from './counter/catalogue-panel';
import { TicketPanel } from './counter/ticket-panel';
import { EMPTY_FORM, type Line, type Pack, type SaleForm } from './counter/types';

type Order = Schema<'AdminOrderResponse'>;

const MONEY = /^\d{1,13}(\.\d{1,2})?$/;
const PHONE = /^\+?[0-9]{7,15}$/;

// A sale at the shop counter: tap what is sold onto the bill, then the order it becomes takes the payment.
export function CounterSale() {
  const t = useTranslations('counterSale');
  const tf = useTranslations('forms');
  const toast = useToast();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [lines, setLines] = useState<Line[]>([]);
  const [form, setForm] = useState<SaleForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // One key per sale: a resend after a lost answer gives back the same order.
  const [saleKey, setSaleKey] = useState(() => crypto.randomUUID());
  // The latest submit, for the key handler below.
  const submitRef = useRef<() => void>(() => undefined);

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
          (v) =>
            form.discountKind !== 'PERCENT' || !v.discountValue || Number(v.discountValue) <= 100,
          { path: ['discountValue'], message: t('percent') },
        ),
    [t, form.discountKind],
  );

  // Tapping a thing again adds one more of it.
  function add(pack: Pack) {
    setLines((current) =>
      current.some((line) => line.id === pack.id)
        ? current.map((line) =>
            line.id === pack.id ? { ...line, quantity: Math.min(999, line.quantity + 1) } : line,
          )
        : [...current, { ...pack, quantity: 1 }],
    );
    setErrors({});
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
    if (sell.isPending) return;
    const values = {
      lines: lines.map((line) => ({ id: line.id, kind: line.kind, quantity: line.quantity })),
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      couponCode: form.couponCode.trim(),
      discountValue: form.discountValue.trim(),
      discountReason: form.discountReason.trim(),
      note: form.note.trim(),
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
          kind: form.discountKind,
          value: values.discountValue,
          reason: values.discountReason,
        },
      }),
    });
  }

  useEffect(() => {
    submitRef.current = submit;
  });

  // "/" jumps to the search box; Ctrl or Cmd with Enter records the sale.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const typing = (event.target as HTMLElement | null)?.closest('input, textarea, select');
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        submitRef.current();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="grid gap-5 lg:h-[calc(100vh-13rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(0,1fr)_25rem]">
      <CataloguePanel onAdd={add} searchRef={searchRef} />
      <TicketPanel
        lines={lines}
        form={form}
        errors={errors}
        pending={sell.isPending}
        onQuantity={(id, quantity) =>
          setLines((current) =>
            current.map((line) => (line.id === id ? { ...line, quantity } : line)),
          )
        }
        onRemove={(id) => setLines((current) => current.filter((line) => line.id !== id))}
        onClear={() => {
          setLines([]);
          setForm(EMPTY_FORM);
          setErrors({});
        }}
        onForm={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSell={submit}
      />
    </div>
  );
}
