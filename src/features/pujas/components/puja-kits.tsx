'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Icon } from '@/components/icons';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { routes } from '@/lib/routes';

type Kit = Schema<'AdminKitResponse'>;
type Plan = {
  items: {
    requirementId: string;
    materialId: string;
    variantId: string;
    quantity: number;
    optional: boolean;
  }[];
};
type Draft = { productId: string; quantity: string; optional: boolean };
const blank = (count: number): Draft[] =>
  Array.from({ length: count }, () => ({ productId: '', quantity: '1', optional: false }));

// The kits of one puja (picked from the kits made apart), and below them the samagri of the puja
// that no kit already holds: the extra items. They can be bought without any kit, and more can be
// added here, several rows at once.
export function PujaKits({ pujaId }: { pujaId: string }) {
  const t = useTranslations('pujaKits');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Draft[]>(() => blank(5));
  const [removing, setRemoving] = useState<string | null>(null);
  const kits = useQuery({
    queryKey: ['kits', 'of-puja', pujaId],
    queryFn: () =>
      request<{ items: Kit[] }>('GET', '/admin/kits', { query: { pujaId, limit: 100 } }),
  });
  const plan = useQuery({
    queryKey: ['kits', 'puja-plan', pujaId],
    queryFn: () => request<Plan>('GET', '/admin/kits/puja-plan', { query: { pujaId } }),
  });
  const linked = kits.data?.items ?? [];
  const inKits = new Set(linked.flatMap((kit) => kit.items.map((line) => line.sku.variantId)));
  const kitProducts = linked.flatMap((kit) => kit.items.map((line) => line.product.id));
  const extra = (plan.data?.items ?? []).filter((line) => !inKits.has(line.variantId));
  const names = useQueries({
    queries: extra.map((line) => ({
      queryKey: ['options', 'packs', 'find', line.variantId],
      staleTime: 600_000,
      queryFn: () => choices.packs.find(line.variantId),
    })),
  });
  const extraProducts = names.flatMap((q) => (q.data?.productId ? [q.data.productId] : []));
  // What the choices of one row leave out: the kits' items, the extras listed, and the other rows.
  const taken = (index: number) => [
    ...kitProducts,
    ...extraProducts,
    ...drafts
      .filter((_, i) => i !== index)
      .map((d) => d.productId)
      .filter(Boolean),
  ];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['kits'] });
  const link = useMutation({
    mutationFn: async (ids: string[]) => {
      const was = new Set(linked.map((kit) => kit.id));
      const now = new Set(ids);
      for (const id of ids) {
        if (!was.has(id)) await request('PATCH', `/admin/kits/${id}`, { body: { pujaId } });
      }
      for (const id of was) {
        if (!now.has(id)) await request('PATCH', `/admin/kits/${id}`, { body: { pujaId: null } });
      }
    },
    onSuccess: async () => {
      toast.success(t('saved'));
      await refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  // Each chosen item becomes one line of the puja's samagri list, counted in the item's default pack.
  const addExtras = useMutation({
    mutationFn: async () => {
      for (const draft of drafts.filter((d) => d.productId)) {
        const product = await request<Schema<'AdminProductResponse'>>(
          'GET',
          `/admin/products/${draft.productId}`,
        );
        const pack = product.variants.find((v) => v.isDefault) ?? product.variants[0];
        await request('POST', `/admin/pujas/${pujaId}/requirements`, {
          body: {
            materialId: product.material.id,
            quantityType: 'EXACT',
            quantityValue: (Number(draft.quantity) || 1) * (pack?.pack?.quantity || 1),
            ...(pack?.pack && { unitId: pack.pack.unit.id }),
            requiredLevel: draft.optional ? 'OPTIONAL' : 'CORE',
          },
        });
      }
    },
    onSuccess: async () => {
      toast.success(t('extrasAdded'));
      setDrafts(blank(5));
      await refresh();
    },
    onError: async (error) => {
      toast.error(isApiError(error) ? error.message : tf('failed'));
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (requirementId: string) =>
      request('DELETE', `/admin/pujas/${pujaId}/requirements/${requirementId}`),
    onSuccess: refresh,
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  const change = (index: number, patch: Partial<Draft>) =>
    setDrafts((all) => all.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const filled = drafts.filter((d) => d.productId).length;

  return (
    <div className="grid gap-6">
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => (next ? undefined : setRemoving(null))}
        title={t('removeTitle')}
        description={t('removeNote')}
        confirmLabel={t('remove')}
        onConfirm={() => {
          if (removing) remove.mutate(removing);
          setRemoving(null);
        }}
      />
      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">{t('kitsTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('kitsNote')}</p>
        <SearchSelect
          multiple
          aria-label={t('kitsTitle')}
          source={choices.kits}
          value={linked.map((kit) => kit.id)}
          known={linked.map((kit) => ({
            value: kit.id,
            label: `${kit.nameNe}${kit.tier ? ` · ${kit.tier.toLowerCase()}` : ''}`,
            detail: kit.code,
          }))}
          disabled={link.isPending}
          onChange={(value) => link.mutate(value as string[])}
        />
        <div>
          <Link
            href={routes.newKit()}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            {t('newKit')}
          </Link>
        </div>
      </section>

      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">{t('extraTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('extraNote')}</p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="w-8 px-2 py-2 text-left font-semibold">#</th>
                <th className="px-2 py-2 text-left font-semibold">{t('item')}</th>
                <th className="w-24 px-2 py-2 text-right font-semibold">{t('quantity')}</th>
                <th className="w-28 px-2 py-2 text-left font-semibold">{t('kind')}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {extra.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    {plan.isPending ? '…' : t('noExtra')}
                  </td>
                </tr>
              ) : null}
              {extra.map((line, index) => (
                <tr key={line.requirementId} className="border-t border-border">
                  <td className="px-2 text-muted-foreground tabular-nums">{index + 1}</td>
                  <td className="px-2 py-2">{names[index]?.data?.label ?? '…'}</td>
                  <td className="px-2 text-right tabular-nums">{line.quantity}</td>
                  <td className="px-2">
                    {line.optional ? <Badge>{t('optional')}</Badge> : t('needed')}
                  </td>
                  <td className="px-1 text-center">
                    <IconButton
                      icon="trash"
                      variant="danger"
                      label={t('remove')}
                      onClick={() => setRemoving(line.requirementId)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">{t('addTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('addNote')}</p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="w-8 px-2 py-2 text-left font-semibold">#</th>
                <th className="px-2 py-2 text-left font-semibold">{t('item')}</th>
                <th className="w-20 px-2 py-2 text-center font-semibold">{t('optional')}</th>
                <th className="w-24 px-2 py-2 text-right font-semibold">{t('quantity')}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft, index) => (
                <tr key={index} className="border-t border-border">
                  <td className="px-2 text-muted-foreground tabular-nums">{index + 1}</td>
                  <td className="p-1.5">
                    <SearchSelect
                      aria-label={t('item')}
                      source={choices.products}
                      required
                      exclude={taken(index)}
                      value={draft.productId}
                      onChange={(value) => change(index, { productId: String(value) })}
                    />
                  </td>
                  <td className="px-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={t('optional')}
                      checked={draft.optional}
                      onChange={(e) => change(index, { optional: e.target.checked })}
                      className="size-4"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      aria-label={t('quantity')}
                      inputMode="decimal"
                      className="text-right"
                      value={draft.quantity}
                      onChange={(e) => change(index, { quantity: e.target.value })}
                    />
                  </td>
                  <td className="px-1 text-center">
                    <IconButton
                      icon="trash"
                      variant="danger"
                      label={t('remove')}
                      onClick={() => setDrafts((all) => all.filter((_, i) => i !== index))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 5].map((count) => (
              <Button
                key={count}
                variant="secondary"
                size="sm"
                onClick={() => setDrafts((all) => [...all, ...blank(count)])}
              >
                <Icon name="plus" size={14} />
                {t('addRows', { count })}
              </Button>
            ))}
          </div>
          <Button disabled={filled === 0 || addExtras.isPending} onClick={() => addExtras.mutate()}>
            {addExtras.isPending ? tf('saving') : t('saveExtras', { count: filled })}
          </Button>
        </div>
      </section>
    </div>
  );
}
