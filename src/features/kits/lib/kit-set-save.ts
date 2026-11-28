import { readImages } from '@/components/resource/form-values';
import { request } from '@/lib/api';

import { TIERS, type Pkg, type Tier } from '../components/kit-package';
import { diffItems, type Kit } from './kit-set';

// What the whole set shares: its names, description, photos and the puja it belongs to.
export type SetShared = {
  pujaId: string;
  nameNe: string;
  nameEn: string;
  nameRomanized: string;
  aliases: string;
  description: string;
  images: string;
};

const sharedBody = (s: SetShared) => ({
  nameEn: s.nameEn.trim(),
  nameNe: s.nameNe.trim(),
  ...(s.nameRomanized.trim() && { nameRomanized: s.nameRomanized.trim() }),
  aliases: s.aliases
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
  description: s.description.trim() || null,
});

// The discount as the API takes it: a percent or an amount, by kind.
const discountBody = (p: Pkg) => ({
  discountKind: p.discountKind,
  ...(p.discountKind === 'PERCENT'
    ? { discountPercent: p.discount.trim() || '0' }
    : { discountAmount: p.discount.trim() || '0' }),
});

// A package's own photos, else the set's.
const imagesOf = (p: Pkg, s: SetShared) => {
  const own = readImages(p.images);
  return own.length ? own : readImages(s.images);
};

export const itemsOf = (p: Pkg) =>
  p.rows
    .filter((row) => row.variantId)
    .map((row) => ({
      variantId: row.variantId,
      quantity: Number(row.quantity) || 1,
      isOptional: row.hawan ? p.hawanOptional : row.optional,
      isHawan: row.hawan,
    }));

const packageBody = (tier: Tier, p: Pkg, s: SetShared) => ({
  tier,
  images: imagesOf(p, s),
  ...discountBody(p),
  packed: p.packed,
  items: itemsOf(p),
});

// A new set: every ticked package is made together, or none.
export function createSet(code: string, shared: SetShared, packages: Record<Tier, Pkg>) {
  return request('POST', '/admin/kits/packages', {
    body: {
      ...(shared.pujaId && { pujaId: shared.pujaId }),
      code,
      ...sharedBody(shared),
      images: readImages(shared.images),
      packages: TIERS.filter((tier) => packages[tier].on).map((tier) =>
        packageBody(tier, packages[tier], shared),
      ),
    },
  });
}

// A saved set: each package changes, appears or goes, one call after another.
export async function updateSet(
  code: string,
  existing: Kit[],
  shared: SetShared,
  packages: Record<Tier, Pkg>,
) {
  for (const tier of TIERS) {
    const kit = existing.find((k) => k.tier === tier);
    const p = packages[tier];
    if (!kit && p.on) {
      await request('POST', '/admin/kits/packages', {
        body: {
          ...(shared.pujaId && { pujaId: shared.pujaId }),
          code,
          ...sharedBody(shared),
          images: readImages(shared.images),
          packages: [packageBody(tier, p, shared)],
        },
      });
    } else if (kit && !p.on) {
      await request('DELETE', `/admin/kits/${kit.id}`);
    } else if (kit) {
      await request('PATCH', `/admin/kits/${kit.id}`, {
        body: {
          ...sharedBody(shared),
          pujaId: shared.pujaId || null,
          images: imagesOf(p, shared),
          ...discountBody(p),
        },
      });
      const { remove, change, add } = diffItems(
        kit.items.map((line) => ({
          id: line.id,
          variantId: line.sku.variantId,
          quantity: line.quantity,
          isOptional: line.isOptional,
          isHawan: line.isHawan,
        })),
        itemsOf(p),
      );
      for (const id of remove) await request('DELETE', `/admin/kits/${kit.id}/items/${id}`);
      for (const { id, body } of change) {
        await request('PATCH', `/admin/kits/${kit.id}/items/${id}`, { body });
      }
      for (const line of add) await request('POST', `/admin/kits/${kit.id}/items`, { body: line });
    }
  }
}
