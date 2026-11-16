'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';

import { offerPreview } from '../offers';

type Entry = Schema<'OfferForProductResponse'>;
type Pack = { id: string; label: string };

type Props = {
  product: { id: string; nameNe: string; variants: Pack[] };
};

// An item's offers: tick the ones that apply to it, see how others reach it, and what each pack
// costs now.
export function ProductOffersPanel({ product }: Props) {
  const t = useTranslations('productOffers');
  const queryClient = useQueryClient();
  const entries = useQuery({
    queryKey: ['offers', 'for-product', product.id],
    queryFn: () => request<Entry[]>('GET', `/admin/price-offers/for-product/${product.id}`),
  });
  const preview = useQuery({
    queryKey: ['offers', 'preview', product.id, entries.dataUpdatedAt],
    queryFn: () =>
      Promise.all(product.variants.map(async (v) => [v, await offerPreview(v.id)] as const)),
    enabled: entries.isSuccess,
  });
  const toggle = useMutation({
    mutationFn: ({ offerId, on }: { offerId: string; on: boolean }) =>
      request(on ? 'PUT' : 'DELETE', `/admin/price-offers/${offerId}/products/${product.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offers'] }),
  });

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t('note')}</p>
      <div className="grid gap-2">
        {(preview.data ?? []).map(([pack, price]) => (
          <div
            key={pack.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-sm"
          >
            <span className="font-medium">{pack.label}</span>
            <span>
              {t('list')}: {formatMoney(price.listPrice, 'en')}
            </span>
            <span>
              {t('alone')}: <b>{formatMoney(price.alone.price, 'en')}</b>
            </span>
            <span>
              {t('withKit')}: <b>{formatMoney(price.withKit.price, 'en')}</b>
            </span>
            {price.alone.offerName || price.withKit.offerName ? (
              <Badge tone="info">{price.withKit.offerName ?? price.alone.offerName}</Badge>
            ) : null}
          </div>
        ))}
      </div>

      {entries.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <ul className="grid max-h-[45vh] gap-1 overflow-y-auto">
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
  );
}
