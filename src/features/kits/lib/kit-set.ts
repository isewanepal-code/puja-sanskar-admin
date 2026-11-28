import type { Schema } from '@/lib/api';

import {
  blankRows,
  emptyPkg,
  OPEN_ROWS,
  TIERS,
  type Pkg,
  type Row,
  type Tier,
} from '../components/kit-package';

export type Kit = Schema<'AdminKitResponse'>;
export type KitSet = { key: string; lead: Kit; kits: Kit[] };
export type KitSetRow = Kit & { set: Kit[] };

// A set is a kit's packages: BASIC_KIT, STANDARD_KIT… share the code before the tier.
export const kitSetKey = (kit: Pick<Kit, 'code' | 'tier'>) =>
  kit.tier ? kit.code.replace(new RegExp(`_${kit.tier}$`), '') : kit.code;

const tierRank = (kit: Kit) => (kit.tier ? TIERS.indexOf(kit.tier) : -1);

// The kits as sets, a set standing where its first kit stands in the list; a kit with no tier is a set of one.
export function groupKitSets(kits: Kit[]): KitSet[] {
  const sets = new Map<string, Kit[]>();
  for (const kit of kits) {
    const key = kitSetKey(kit);
    sets.set(key, [...(sets.get(key) ?? []), kit]);
  }
  return [...sets].map(([key, members]) => {
    const sorted = [...members].sort((a, b) => tierRank(a) - tierRank(b));
    return { key, lead: sorted[0]!, kits: sorted };
  });
}

// The first (lowest) kit of each set with the whole set beside it, as a row of the list.
export const kitSetRows = (kits: Kit[]): KitSetRow[] =>
  groupKitSets(kits).map(({ lead, kits: set }) => ({ ...lead, set }));

const asRow = (line: Kit['items'][number]): Row => ({
  variantId: line.sku.variantId,
  productId: line.product.id,
  quantity: String(line.quantity),
  optional: line.isOptional,
  hawan: line.isHawan,
});

// One saved kit as the package the editor shows: its items, a few blank rows to add more, and its discount.
export function pkgFromKit(kit: Kit): Pkg {
  const items = kit.items.filter((line) => !line.isHawan).map(asRow);
  const hawan = kit.items.filter((line) => line.isHawan).map(asRow);
  return {
    ...emptyPkg(true),
    images: JSON.stringify(
      kit.images.map(({ url, altText }) => ({ url, altText: altText ?? null })),
    ),
    discountKind: kit.discountKind,
    discount: kit.discountKind === 'PERCENT' ? kit.discountPercent : kit.discountAmount,
    packed: kit.packed,
    hawanOptional: hawan.length > 0 && hawan.every((row) => row.optional),
    rows: [
      ...items,
      ...blankRows('main', Math.max(3, OPEN_ROWS.main - items.length)),
      ...hawan,
      ...blankRows('hawan', Math.max(3, OPEN_ROWS.hawan - hawan.length)),
    ],
  };
}

// The packages of a set, by tier; a tier the set does not have is off.
export function packagesFromSet(kits: Kit[]): Record<Tier, Pkg> {
  const by = (tier: Tier) => kits.find((kit) => kit.tier === tier);
  const pkg = (tier: Tier) => {
    const kit = by(tier);
    return kit ? pkgFromKit(kit) : emptyPkg(false);
  };
  return { BASIC: pkg('BASIC'), STANDARD: pkg('STANDARD'), PREMIUM: pkg('PREMIUM') };
}

type Line = { variantId: string; quantity: number; isOptional: boolean; isHawan: boolean };

// What saving changes in a kit's items: lines to take out, lines to change, and lines to add.
export function diffItems(
  saved: {
    id: string;
    variantId: string;
    quantity: number;
    isOptional: boolean;
    isHawan: boolean;
  }[],
  wanted: Line[],
) {
  const wantedBy = new Map(wanted.map((line) => [line.variantId, line]));
  const savedBy = new Map(saved.map((line) => [line.variantId, line]));
  return {
    remove: saved.filter((line) => !wantedBy.has(line.variantId)).map((line) => line.id),
    change: saved.flatMap((line) => {
      const next = wantedBy.get(line.variantId);
      const same =
        !next ||
        (next.quantity === line.quantity &&
          next.isOptional === line.isOptional &&
          next.isHawan === line.isHawan);
      return same
        ? []
        : [
            {
              id: line.id,
              body: { quantity: next.quantity, isOptional: next.isOptional, isHawan: next.isHawan },
            },
          ];
    }),
    add: wanted.filter((line) => !savedBy.has(line.variantId)),
  };
}
