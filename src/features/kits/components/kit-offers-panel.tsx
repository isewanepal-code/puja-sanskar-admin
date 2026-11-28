'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { offerPreview } from '@/features/marketing';
import { request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

import type { Kit } from '../lib/kit-set';
import { kitPriceFor } from '../lib/kit-offer-price';

type Entry = Schema<'OfferForProductResponse'>;

const money = (amount: number | string) => formatMoney(String(amount), 'en');

// The offers on a kit: what each package costs by how many are bought, what its items cost alone and
// with the kit, and which offers reach it (tick one to put the kit on it).
export function KitOffersPanel({ kits, kit }: { kits: Kit[]; kit: Kit }) {
  const t = useTranslations('kitOffers');
  const queryClient = useQueryClient();
  const entries = useQuery({
    queryKey: ['offers', 'for-kit', kit.id],
    queryFn: () => request<Entry[]>('GET', `/admin/price-offers/for-kit/${kit.id}`),
  });
  const items = useQuery({
    queryKey: ['offers', 'kit-items', kit.id, entries.dataUpdatedAt],
    enabled: entries.isSuccess,
    queryFn: () =>
      Promise.all(
        kit.items.map(async (line) => [line, await offerPreview(line.sku.variantId)] as const),
      ),
  });
  const toggle = useMutation({
    mutationFn: ({ offerId, on }: { offerId: string; on: boolean }) =>
      request(on ? 'PUT' : 'DELETE', `/admin/price-offers/${offerId}/kits/${kit.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['offers'] });
      await queryClient.invalidateQueries({ queryKey: ['kits'] });
    },
  });

  const counts = [
    ...new Set([1, ...kits.flatMap((k) => k.offerTiers.map((tier) => tier.minKits))]),
  ].sort((a, b) => a - b);

  return (
    <section className="grid gap-5 rounded-xl border border-border bg-card p-5">
      <header>
        <h2 className="font-heading text-base font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('note')}</p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="pb-2 text-left font-medium">{t('byCount')}</caption>
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1.5 pr-3 font-medium">{t('package')}</th>
              <th className="py-1.5 pr-3 text-right font-medium">{t('list')}</th>
              <th className="py-1.5 pr-3 text-right font-medium">{t('ownDiscount')}</th>
              {counts.map((count) => (
                <th key={count} className="py-1.5 pr-3 text-right font-medium">
                  {t('kitsBought', { count })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kits.map((k) => (
              <tr key={k.id} className="border-t border-border">
                <td className="py-1.5 pr-3">{k.tier ?? k.nameNe}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{money(k.price)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">
                  {money(kitPriceFor(k, 0).price)}
                </td>
                {counts.map((count) => {
                  const { price, tier } = kitPriceFor(k, count);
                  return (
                    <td key={count} className="py-1.5 pr-3 text-right tabular-nums">
                      <b>{money(price)}</b>
                      {tier ? (
                        <span className="block text-xs text-muted-foreground">
                          {tier.kind === 'PERCENT' ? `${tier.value}%` : `Rs ${tier.value}`}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="pb-2 text-left font-medium">
            {t('itemsOf', { tier: kit.tier ?? kit.nameNe })}
          </caption>
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1.5 pr-3 font-medium">{t('item')}</th>
              <th className="py-1.5 pr-3 text-right font-medium">{t('list')}</th>
              <th className="py-1.5 pr-3 text-right font-medium">{t('alone')}</th>
              <th className="py-1.5 pr-3 text-right font-medium">{t('withKit')}</th>
              <th className="py-1.5 font-medium">{t('offer')}</th>
            </tr>
          </thead>
          <tbody>
            {(items.data ?? []).map(([line, price]) => (
              <tr key={line.sku.variantId} className="border-t border-border">
                <td className="py-1.5 pr-3">
                  {line.product.nameNe}
                  <span className="ml-2 text-xs text-muted-foreground">{line.sku.sku}</span>
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{money(price.listPrice)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{money(price.alone.price)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">
                  <b>{money(price.withKit.price)}</b>
                </td>
                <td className="py-1.5">
                  {(price.withKit.offerName ?? price.alone.offerName) ? (
                    <Badge tone="info">{price.withKit.offerName ?? price.alone.offerName}</Badge>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">{t('offersFor')}</h3>
          <Link href={routes.offers()} className="text-sm text-primary hover:underline">
            {t('manage')}
          </Link>
        </div>
        {entries.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('none')}</p>
        ) : (
          <ul className="grid max-h-[40vh] gap-1 overflow-y-auto">
            {(entries.data ?? []).map(({ offer, direct, indirect, isLive }) => (
              <li key={offer.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={direct}
                    disabled={toggle.isPending}
                    onChange={(event) =>
                      toggle.mutate({ offerId: offer.id, on: event.target.checked })
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{offer.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{offer.code}</span>
                  </span>
                  {offer.festivalId ? <Badge tone="neutral">{t('festival')}</Badge> : null}
                  {indirect ? <Badge tone="info">{t('through')}</Badge> : null}
                  {!offer.isActive ? <Badge tone="warning">{t('off')}</Badge> : null}
                  {offer.isActive && isLive && (direct || indirect) ? (
                    <Badge tone="success">{t('live')}</Badge>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
