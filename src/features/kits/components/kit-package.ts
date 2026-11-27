export const TIERS = ['BASIC', 'STANDARD', 'PREMIUM'] as const;
export type Tier = (typeof TIERS)[number];
export type Row = { variantId: string; quantity: string; optional: boolean; hawan: boolean };
// The two tables of a package: its items (each ticked Optional or not) and the hawan samagri.
export const SECTIONS = ['main', 'hawan'] as const;
export type Section = (typeof SECTIONS)[number];
// How many empty rows each table opens with, so a long list can be typed straight down.
export const OPEN_ROWS: Record<Section, number> = { main: 10, hawan: 5 };
export const inSection = (row: Row, section: Section) =>
  section === 'hawan' ? row.hawan : !row.hawan;
export type Pkg = {
  on: boolean;
  images: string;
  discountKind: 'PERCENT' | 'FLAT';
  discount: string;
  packed: boolean;
  // The hawan samagri is one set: all of it is compulsory, or all of it is optional.
  hawanOptional: boolean;
  rows: Row[];
};

export const emptyRow = (section: Section = 'main'): Row => ({
  variantId: '',
  quantity: '1',
  optional: false,
  hawan: section === 'hawan',
});
export const blankRows = (section: Section, count = OPEN_ROWS[section]) =>
  Array.from({ length: count }, () => emptyRow(section));
export const emptyPkg = (on: boolean): Pkg => ({
  on,
  images: '[]',
  discountKind: 'PERCENT',
  discount: '',
  packed: false,
  hawanOptional: false,
  rows: SECTIONS.flatMap((section) => blankRows(section)),
});

// "Chhath Puja Kit" → CHHATH_PUJA_KIT, short enough for each package to add its tier.
export const codeOf = (nameEn: string) => {
  const code = nameEn
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 22)
    .replace(/_+$/, '');
  return /^[A-Z]/.test(code) ? code : `K_${code}`.slice(0, 22);
};
