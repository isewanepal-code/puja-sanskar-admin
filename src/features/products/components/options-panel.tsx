'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request } from '@/lib/api';

import type { OptionType } from '../options';
import type { Product } from './use-product';

type Picked = Record<string, string[]>;

const MAX_OPTIONS = 3;

function Dot({ type, hex }: { type: OptionType; hex: string | null }) {
  return type.kind === 'COLOR' && hex ? (
    <span
      className="inline-block size-4 rounded-full border border-border"
      style={{ background: hex }}
      aria-hidden="true"
    />
  ) : null;
}

// What the item comes in: tick colours, sizes, weights; one pack is made for each combination.
export function OptionsPanel({ product }: { product: Product }) {
  const t = useTranslations('productOptionsEditor');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();

  const types = useQuery({
    queryKey: ['optionTypes', 'active'],
    queryFn: () =>
      request<OptionType[]>('GET', '/admin/option-types', { query: { isActive: true } }),
  });
  const [picked, setPicked] = useState<Picked>(() =>
    Object.fromEntries(
      product.options.map((o) => [o.optionTypeId, o.values.map((v) => v.valueId)]),
    ),
  );
  const [price, setPrice] = useState(() => product.variants[0]?.price ?? '');
  const chosen = Object.entries(picked).filter(([, ids]) => ids.length > 0);
  const total = chosen.reduce((n, [, ids]) => n * ids.length, 1);
  const tooMany = chosen.length > MAX_OPTIONS;

  const toggle = (typeId: string, valueId: string) =>
    setPicked((was) => {
      const ids = was[typeId] ?? [];
      return {
        ...was,
        [typeId]: ids.includes(valueId) ? ids.filter((id) => id !== valueId) : [...ids, valueId],
      };
    });

  const generate = useMutation({
    mutationFn: () =>
      request<{ created: unknown[]; skipped: number }>(
        'POST',
        `/admin/products/${product.id}/variants/generate`,
        {
          body: {
            options: chosen.map(([optionTypeId, valueIds]) => ({ optionTypeId, valueIds })),
            price,
          },
        },
      ),
    onSuccess: async ({ created, skipped }) => {
      toast.success(t('made', { created: created.length, skipped }));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const empty = types.isSuccess && types.data.every((type) => type.values.length === 0);

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">{t('note')}</p>
      {empty ? (
        <p className="rounded-md border border-border p-3 text-sm">{t('noValues')}</p>
      ) : null}
      <section className="grid gap-3">
        {(types.data ?? []).map((type) => (
          <fieldset key={type.id} className="rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium">
              {type.nameEn} <span className="text-muted-foreground">· {type.nameNe}</span>
            </legend>
            {type.values.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('noValues')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {type.values.map((value) => {
                  const on = (picked[type.id] ?? []).includes(value.id);
                  return (
                    <label
                      key={value.id}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                        on ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => toggle(type.id, value.id)}
                      />
                      <Dot type={type} hex={value.colorHex} />
                      {value.valueEn}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        ))}
        {tooMany ? (
          <p className="text-sm text-destructive">{t('tooMany', { n: MAX_OPTIONS })}</p>
        ) : null}
      </section>

      <section className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-end">
        <label className="grid gap-1 text-sm">
          {t('price')}
          <Input
            value={price}
            inputMode="decimal"
            onChange={(event) => setPrice(event.target.value)}
            placeholder="500"
          />
        </label>
        <p className="text-sm text-muted-foreground">{t('priceNote', { count: total })}</p>
      </section>

      <div>
        <Button
          onClick={() => generate.mutate()}
          disabled={chosen.length === 0 || tooMany || !price || generate.isPending}
        >
          {generate.isPending ? tf('saving') : t('make', { count: total })}
        </Button>
      </div>
    </div>
  );
}
