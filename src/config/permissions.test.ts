import { describe, expect, it } from 'vitest';

import { navigationFor } from './navigation';
import { can } from './permissions';

describe('can', () => {
  it('should allow what needs no permission, and only what was granted otherwise', () => {
    expect(can([], undefined)).toBe(true);
    expect(can(['orders:read'], 'orders:read')).toBe(true);
    expect(can(['reports:read'], 'orders:read')).toBe(false);
  });

  it('should leave a staff member only the sections and groups they may open', () => {
    const groups = navigationFor(['reports:read']);
    expect(groups.map((group) => group.key)).toEqual(['overview', 'reports']);
    expect(groups[1]!.sections.map((section) => section.key)).toEqual([
      'reports',
      'salesBook',
      'vat',
      'dayBook',
      'receivables',
      'profitAndLoss',
      'purchaseBook',
      'supplierStatement',
      'searchTerms',
    ]);
    // The dashboard and the manual are open to everyone.
    expect(groups[0]!.sections.map((section) => section.key)).toEqual(['dashboard', 'manual']);
  });

  it('should show catalogue sections to a content manager', () => {
    const keys = navigationFor(['catalogue:read', 'catalogue:write']).flatMap((group) =>
      group.sections.map((section) => section.key),
    );
    // In the order the work is done: setup, items, stock, kits and pujas, then the website.
    expect(keys).toEqual([
      'dashboard',
      'manual',
      'catalogue',
      'units',
      'brands',
      'companies',
      'options',
      'materials',
      'sources',
      'mantras',
      'ritualTypes',
      'pujaLevels',
      'festivals',
      'addItem',
      'sellPrice',
      'items',
      'archive',
      'kits',
      'pujas',
      'content',
      'menus',
      'articles',
      'banners',
      'homeSections',
      'stories',
      'reviews',
      'media',
    ]);
  });
});
