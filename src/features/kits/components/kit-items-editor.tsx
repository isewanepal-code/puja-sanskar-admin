'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Icon } from '@/components/icons';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { formatMoney } from '@/lib/format';

import type { Kit } from '../resources';

type Line = Kit['items'][number];

// What a pack costs the shop (the average of the stock held), looked up for every line.
function useCosts(variantIds: string[]) {
  const found = useQueries({
    queries: variantIds.map((variantId) => ({
      queryKey: ['kit-pack-price', variantId],
      staleTime: 60_000,
      queryFn: async () => {
        const { items } = await request<{ items: Schema<'AdminProductResponse'>[] }>(
          'GET',
          '/admin/products',
          { query: { variantId, limit: 1 } },
        );
        const v = items.flatMap((item) => item.variants).find((x) => x.id === variantId);
        return { variantId, price: Number(v?.price ?? 0), cost: Number(v?.cost ?? 0) };
      },
    })),
  });
  return (variantId: string) => found.find((q) => q.data?.variantId === variantId)?.data?.cost ?? 0;
}

// One saved kit's items in two tables, the compulsory ones and the optional ones: each line's quantity is
// changed right in the row, a line goes with a question first, and a new one is added under its table.
export function KitItemsEditor({ kitId }: { kitId: string }) {
  const t = useTranslations('kitPage');
  const te = useTranslations('kitEdit');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const kit = useQuery({
    queryKey: ['kits', 'items-editor', kitId],
    queryFn: () => request<Kit>('GET', `/admin/kits/${kitId}`),
  });
  const [removing, setRemoving] = useState<Line | null>(null);
  const [adding, setAdding] = useState<Record<string, { variantId: string; quantity: string }>>({});
  const items = kit.data?.items ?? [];
  const costOf = useCosts(items.map((line) => line.sku.variantId));
  // An item already in the kit is not offered again, in any size.
  const inKit = items.map((line) => line.product.id);

  const refresh = async () => {
    await Promise.all([kit.refetch(), queryClient.invalidateQueries({ queryKey: ['kits'] })]);
  };
  const fail = (error: unknown) => toast.error(isApiError(error) ? error.message : tf('failed'));
  const add = useMutation({
    mutationFn: (body: { variantId: string; quantity: number; isOptional: boolean }) =>
      request('POST', `/admin/kits/${kitId}/items`, { body }),
    onSuccess: refresh,
    onError: fail,
  });
  const change = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      request('PATCH', `/admin/kits/${kitId}/items/${id}`, { body: { quantity } }),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: string) => request('DELETE', `/admin/kits/${kitId}/items/${id}`),
    onSuccess: async () => {
      setRemoving(null);
      await refresh();
    },
    onError: fail,
  });

  if (kit.isPending) return <p className="text-sm text-muted-foreground">…</p>;

  return (
    <div className="grid gap-6">
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => (next ? undefined : setRemoving(null))}
        title={t('removeTitle')}
        description={t('removeNote')}
        confirmLabel={remove.isPending ? tf('saving') : t('remove')}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
      {([false, true] as const).map((optional) => {
        const list = items.filter((line) => line.isOptional === optional);
        const key = String(optional);
        const draft = adding[key] ?? { variantId: '', quantity: '1' };
        const sell = (line: Line) => Number(line.lineTotal);
        const sellSum = list.reduce((sum, line) => sum + sell(line), 0);
        const costSum = list.reduce(
          (sum, line) => sum + costOf(line.sku.variantId) * line.quantity,
          0,
        );
        return (
          <div key={key} className="grid gap-2">
            <h3 className="text-sm font-semibold">
              {optional ? t('optionalTitle') : t('compulsoryTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {optional ? t('optionalNote') : t('compulsoryNote')}
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="w-8 px-2 py-2 text-left font-semibold">#</th>
                    <th className="px-2 py-2 text-left font-semibold">{t('pack')}</th>
                    <th className="w-24 px-2 py-2 text-right font-semibold">{t('quantity')}</th>
                    <th className="w-20 px-2 py-2 text-right font-semibold">{t('inStock')}</th>
                    <th className="w-24 px-2 py-2 text-right font-semibold">{t('buyPrice')}</th>
                    <th className="w-24 px-2 py-2 text-right font-semibold">{t('sellPrice')}</th>
                    <th className="w-28 px-2 py-2 text-right font-semibold">{t('lineTotal')}</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">
                        {t('noneYet')}
                      </td>
                    </tr>
                  ) : null}
                  {list.map((line, at) => (
                    <tr key={line.id} className="border-t border-border">
                      <td className="px-2 text-muted-foreground tabular-nums">{at + 1}</td>
                      <td className="px-2 py-1.5">
                        <div className="font-medium">{line.product.nameNe}</div>
                        <div className="text-xs text-muted-foreground">
                          {line.sku.sku} · {line.sku.label}
                        </div>
                      </td>
                      <td className="p-1.5">
                        <Input
                          key={`${line.id}-${line.quantity}`}
                          aria-label={t('quantity')}
                          inputMode="decimal"
                          className="text-right"
                          defaultValue={String(line.quantity)}
                          onBlur={(e) => {
                            const next = Number(e.target.value);
                            if (next > 0 && next !== line.quantity) {
                              change.mutate({ id: line.id, quantity: next });
                            } else {
                              e.target.value = String(line.quantity);
                            }
                          }}
                        />
                      </td>
                      <td className="px-2 text-right">
                        <Badge
                          tone={
                            line.available <= 0
                              ? 'danger'
                              : line.available < line.quantity
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {line.available}
                        </Badge>
                      </td>
                      <td className="px-2 text-right text-muted-foreground tabular-nums">
                        {costOf(line.sku.variantId) > 0
                          ? formatMoney(String(costOf(line.sku.variantId)), 'en')
                          : '—'}
                      </td>
                      <td className="px-2 text-right tabular-nums">
                        {formatMoney(line.sku.price, 'en')}
                      </td>
                      <td className="px-2 text-right font-medium tabular-nums">
                        {formatMoney(line.lineTotal, 'en')}
                      </td>
                      <td className="px-1 text-center">
                        <IconButton
                          icon="trash"
                          variant="danger"
                          label={t('remove')}
                          onClick={() => setRemoving(line)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                {list.length > 0 ? (
                  <tfoot className="border-t border-border bg-muted/30 text-sm font-semibold">
                    <tr>
                      <td colSpan={4} className="px-2 py-2 text-right">
                        {t('sectionTotal')}
                      </td>
                      <td className="px-2 text-right text-muted-foreground tabular-nums">
                        {costSum > 0 ? formatMoney(String(costSum), 'en') : '—'}
                      </td>
                      <td />
                      <td className="px-2 text-right tabular-nums">
                        {formatMoney(String(sellSum), 'en')}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-center gap-2">
              <SearchSelect
                aria-label={t('pack')}
                source={choices.packs}
                excludeProducts={inKit}
                value={draft.variantId}
                onChange={(value) =>
                  setAdding((all) => ({ ...all, [key]: { ...draft, variantId: String(value) } }))
                }
              />
              <Input
                aria-label={t('quantity')}
                inputMode="decimal"
                className="text-right"
                value={draft.quantity}
                onChange={(e) =>
                  setAdding((all) => ({ ...all, [key]: { ...draft, quantity: e.target.value } }))
                }
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={!draft.variantId || !(Number(draft.quantity) > 0) || add.isPending}
                onClick={() =>
                  add.mutate(
                    {
                      variantId: draft.variantId,
                      quantity: Number(draft.quantity),
                      isOptional: optional,
                    },
                    {
                      onSuccess: () =>
                        setAdding((all) => ({ ...all, [key]: { variantId: '', quantity: '1' } })),
                    },
                  )
                }
              >
                <Icon name="plus" size={14} />
                {optional ? t('addOptional') : t('addItem')}
              </Button>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">{te('itemsNote')}</p>
    </div>
  );
}
