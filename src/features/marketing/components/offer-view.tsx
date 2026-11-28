'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useResourceText } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { choices } from '@/lib/choices';
import { request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';

import { ruleText, whenText, type Offer } from '../offers';
import type { PriceGroupDetail } from '../price-groups';

type Target = Offer['targets'][number];

const refsOf = (offer: Offer, kind: Target['kind'], excluded = false) =>
  offer.targets
    .filter((t) => t.kind === kind && t.excluded === excluded && t.refId)
    .map((t) => t.refId!);

// The names of things an offer points at, found one by one.
function useNames(ids: string[], label: (id: string) => Promise<string>) {
  const found = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['offer-view', 'name', label.name, id],
      staleTime: 5 * 60_000,
      queryFn: () => label(id),
    })),
  });
  return ids.map((id, i) => ({ id, name: found[i]?.data ?? '…' }));
}

const categoryName = async (id: string) =>
  (await request<Schema<'AdminCategoryResponse'>>('GET', `/admin/categories/${id}`)).nameNe;
const productName = async (id: string) =>
  (await request<Schema<'AdminProductResponse'>>('GET', `/admin/products/${id}`)).nameNe;
const packName = async (id: string) => (await choices.packs.find(id))?.label ?? id;
const kitName = async (id: string) => {
  const kit = await request<Schema<'AdminKitResponse'>>('GET', `/admin/kits/${id}`);
  return kit.tier ? `${kit.nameNe} · ${kit.tier}` : kit.nameNe;
};

// A heading that folds its list away, so a long one does not push the rest off the screen.
function Fold({
  title,
  count,
  open,
  children,
}: {
  title: string;
  count: number;
  open?: boolean;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <details open={open} className="group rounded-md border border-border">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm font-medium">
        <span>{title}</span>
        <Badge>{count}</Badge>
      </summary>
      <div className="border-t border-border px-3 py-2">{children}</div>
    </details>
  );
}

const Names = ({ items }: { items: { id: string; name: string }[] }) => (
  <ul className="grid gap-1 text-sm sm:grid-cols-2">
    {items.map(({ id, name }) => (
      <li key={id}>{name}</li>
    ))}
  </ul>
);

function GroupFold({ id }: { id: string }) {
  const t = useTranslations('offerView');
  const detail = useQuery({
    queryKey: ['priceGroups', 'detail', id],
    queryFn: () => request<PriceGroupDetail>('GET', `/admin/price-groups/${id}`),
  });
  const group = detail.data;
  return (
    <details className="rounded-md border border-border bg-muted/30">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm">
        <span className="font-medium">{group?.name ?? '…'}</span>
        <span className="text-xs text-muted-foreground">
          {t('groupCount', { count: group?.totalCount ?? 0 })}
        </span>
      </summary>
      <div className="grid gap-2 border-t border-border px-3 py-2">
        {group?.children.length ? (
          <p className="text-sm">
            <span className="text-muted-foreground">{t('groupsInside')} </span>
            {group.children.map((child) => (
              <Badge key={child.id} tone="info" className="mr-1">
                {child.name}
              </Badge>
            ))}
          </p>
        ) : null}
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {(group?.members ?? []).map((member) => (
            <li key={member.productId ?? member.kitId}>
              {member.nameNe}
              {member.kitId ? (
                <Badge tone="info" className="ml-2">
                  {t('kit')}
                </Badge>
              ) : null}
              <span className="ml-2 text-xs text-muted-foreground">{member.code}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

// An offer read from top to bottom: when it runs, what it gives, and everything it reaches, folded
// away by kind. Nothing here changes; the row's edit button does that.
export function OfferView({ offer, onClose }: { offer: Offer | null; onClose: () => void }) {
  const t = useTranslations('offerView');
  const name = useResourceText('offers');
  const reach = offer ?? ({ targets: [] } as unknown as Offer);
  const categories = useNames(refsOf(reach, 'CATEGORY'), categoryName);
  const products = useNames(refsOf(reach, 'PRODUCT'), productName);
  const packs = useNames(refsOf(reach, 'VARIANT'), packName);
  const kits = useNames(refsOf(reach, 'KIT'), kitName);
  const groups = refsOf(reach, 'GROUP');
  const outProducts = useNames(refsOf(reach, 'PRODUCT', true), productName);
  const outKits = useNames(refsOf(reach, 'KIT', true), kitName);
  const outGroups = useNames(refsOf(reach, 'GROUP', true), async (id) => id);

  return (
    <Modal
      open={offer !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      size="lg"
      title={offer?.name ?? ''}
      description={offer?.code}
    >
      {offer ? (
        <div className="grid gap-5">
          <dl>
            <Line label={t('status')}>
              <Badge tone={offer.isActive ? 'success' : 'warning'}>
                {offer.isActive ? t('on') : t('off')}
              </Badge>
            </Line>
            <Line label={t('when')}>{whenText(offer, name)}</Line>
            {offer.festivalId ? <Line label={t('festival')}>{t('festivalOnly')}</Line> : null}
            <Line label={t('alone')}>{ruleText(offer.alone, name)}</Line>
            <Line label={t('withKit')}>{ruleText(offer.withKit, name)}</Line>
            {offer.kitTiers.map((tier) => (
              <Line key={tier.minKits} label={t('kitsBought', { count: tier.minKits })}>
                {tier.kind === 'PERCENT'
                  ? `${Number(tier.value)}%`
                  : `− ${formatMoney(tier.value, 'en')}`}
              </Line>
            ))}
            <Line label={t('coupons')}>{offer.allowCoupons ? t('yes') : t('no')}</Line>
          </dl>

          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">{t('covers')}</h3>
            {offer.targets.some((x) => x.kind === 'ALL' && !x.excluded) ? (
              <p className="text-sm">{t('everything')}</p>
            ) : null}
            <Fold title={t('groups')} count={groups.length} open={groups.length <= 2}>
              <div className="grid gap-2">
                {groups.map((id) => (
                  <GroupFold key={id} id={id} />
                ))}
              </div>
            </Fold>
            <Fold title={t('categories')} count={categories.length}>
              <Names items={categories} />
            </Fold>
            <Fold title={t('items')} count={products.length}>
              <Names items={products} />
            </Fold>
            <Fold title={t('packs')} count={packs.length}>
              <Names items={packs} />
            </Fold>
            <Fold title={t('kits')} count={kits.length}>
              <Names items={kits} />
            </Fold>
            {offer.targets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('nothing')}</p>
            ) : null}
          </section>

          {outProducts.length + outKits.length + outGroups.length > 0 ? (
            <section className="grid gap-2">
              <h3 className="text-sm font-semibold">{t('leftOut')}</h3>
              <Fold title={t('items')} count={outProducts.length}>
                <Names items={outProducts} />
              </Fold>
              <Fold title={t('kits')} count={outKits.length}>
                <Names items={outKits} />
              </Fold>
              <Fold title={t('groups')} count={outGroups.length}>
                <div className="grid gap-2">
                  {outGroups.map(({ id }) => (
                    <GroupFold key={id} id={id} />
                  ))}
                </div>
              </Fold>
            </section>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
