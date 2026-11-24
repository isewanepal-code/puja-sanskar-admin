import { request, type Schema } from '@/lib/api';
import { measureOf } from '@/lib/unit-measure';

type Product = Schema<'AdminProductResponse'>;

// What a bought pack needs to be asked: a sack, box or roll of something weighed, measured or poured does
// not yet say how much is in one. Said once at the buy, the stock can then show the total and open it.
export type PackInfo = {
  productId: string;
  sellBy: string;
  // True when the pack is a container whose content is not stated yet.
  container: boolean;
  containerName: string;
  // The unit the item's other sizes are in (kg for 1 kg, 500 g): the likely unit of the content.
  defaultUnitId: string;
};

export async function packInfo(variantId: string): Promise<PackInfo | null> {
  const { items } = await request<{ items: Product[] }>('GET', '/admin/products', {
    query: { variantId, limit: 1 },
  });
  const product = items.find((p) => p.variants.some((v) => v.id === variantId));
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!product || !variant) return null;
  const measured = ['WEIGHT', 'VOLUME', 'LENGTH'].includes(product.sellBy);
  const known = (v: Product['variants'][number]) =>
    v.pack ? measureOf(v.pack.quantity, v.pack.unit.symbol) : null;
  // A sack holds kilos, not grams: the big unit of what the item is measured in.
  const units = measured
    ? (
        await request<{ items: Array<{ id: string; symbol: string; dimension: string }> }>(
          'GET',
          '/admin/units',
          { query: { limit: 100 } },
        )
      ).items
    : [];
  const big = { WEIGHT: 'kg', VOLUME: 'l', LENGTH: 'm' }[product.sellBy as 'WEIGHT'];
  const bigUnit = units.find(
    (u) => u.dimension === product.sellBy && u.symbol.toLowerCase() === big,
  );
  const sized = product.variants.find((v) => known(v));
  return {
    productId: product.id,
    sellBy: product.sellBy,
    container: measured && Boolean(variant.pack) && !known(variant),
    containerName: variant.pack?.unit.nameEn ?? variant.pack?.unit.symbol ?? variant.label,
    defaultUnitId: bigUnit?.id ?? sized?.pack?.unit.id ?? '',
  };
}
