export type Line = {
  productId: string;
  // Colour, size or any other difference of what was bought (red cloth, size L shirt).
  optionValueIds: string[];
  quantity: string;
  unitId: string;
  rate: string;
  // The brand or company of the item: filled from the item, and saved back to it when changed.
  brand: string;
  // The brand the item had when it loaded, to see whether it was changed here.
  itemBrand: string;
  // 'AUTO' takes the item's own VAT; the default is no VAT.
  vat: string;
  expiresOn: string;
  // The item's own VAT %, learnt when it loads; used for the totals only.
  itemVat: string;
  // How the item is sold (piece, weight…), learnt when it loads: a piece item cannot be bought by halves.
  sellBy: string;
  // The unit bought in is a sack, box or roll of something weighed or measured: how much one holds
  // (25 of kg), asked here once so the stock can show the total and open it.
  container: boolean;
  // The unit bought in does not fit how the item is sold (a sack of rice): the count is a must.
  needsHolds: boolean;
  holds: string;
  holdsUnitId: string;
  // The names the pack is called by: the unit bought in (बोरा) and the unit it holds (kg).
  unitLabel: string;
  holdsSymbol: string;
};

export const emptyLine = (productId = ''): Line => ({
  productId,
  optionValueIds: [],
  quantity: '',
  unitId: '',
  rate: '',
  brand: '',
  itemBrand: '',
  vat: '0',
  expiresOn: '',
  itemVat: '0',
  sellBy: '',
  container: false,
  needsHolds: false,
  holds: '',
  holdsUnitId: '',
  unitLabel: '',
  holdsSymbol: '',
});
export const cell = 'border-r border-b border-border p-0 align-middle';
export const th = 'border-r border-b border-border px-2 py-2 font-medium';
export const box =
  'h-9 w-full bg-transparent px-2 text-sm outline-none focus:bg-primary/5 disabled:opacity-40';
export const today = () => new Date().toISOString().slice(0, 10);
// The same limits the server holds to: a typo like an extra zero is caught here, beside the box.
export const MAX_QUANTITY = 1_000_000;
export const MAX_MONEY = 100_000_000;
export const num = (text: string) => Number(text.replace(/,/g, ''));
// The VAT % a line pays: chosen on the line, else the item's own.
export const vatOf = (l: { vat: string; itemVat: string }) =>
  num(l.vat === 'AUTO' ? l.itemVat : l.vat) || 0;
// The unit most shops count each way of selling in, picked first: kg, metre, litre.
export const USUAL = ['pc', 'pcs', 'kg', 'm', 'l', 'ltr'];
