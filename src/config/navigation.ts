import type { IconName } from '@/components/icons';
import { routes } from '@/lib/routes';

import { can, type Permission } from './permissions';

export type NavSection = {
  key:
    | 'dashboard'
    | 'manual'
    | 'counterSale'
    | 'orders'
    | 'customers'
    | 'items'
    | 'kits'
    | 'stock'
    | 'archive'
    | 'addItem'
    | 'buy'
    | 'sellPrice'
    | 'flowWork'
    | 'buying'
    | 'suppliers'
    | 'money'
    | 'expenses'
    | 'reports'
    | 'pujas'
    | 'content'
    | 'offers'
    | 'priceGroups'
    | 'discounts'
    | 'pandits'
    | 'options'
    | 'units'
    | 'dataReset'
    | 'catalogue'
    | 'settings'
    | 'staff';
  href: string;
  icon: IconName;
  // Shown only to staff who hold it; the API refuses the rest anyway.
  permission?: Permission;
};

export type NavGroup = {
  key:
    | 'overview'
    | 'setup'
    | 'items'
    | 'buying'
    | 'stock'
    | 'kits'
    | 'sell'
    | 'money'
    | 'marketing'
    | 'website'
    | 'settings';
  sections: NavSection[];
};

// The sidebar in the order the shop works, numbered: what must exist first (categories, units,
// colours and sizes, suppliers), then the items, buying them, the stock, kits and pujas, selling,
// and the money. Offers, the website and settings come last.
export const navigation: NavGroup[] = [
  {
    key: 'overview',
    sections: [
      { key: 'dashboard', href: routes.dashboard(), icon: 'grid' },
      { key: 'manual', href: routes.manual(), icon: 'book' },
    ],
  },
  {
    key: 'setup',
    sections: [
      { key: 'catalogue', href: routes.categories(), icon: 'list', permission: 'catalogue:read' },
      { key: 'units', href: routes.units(), icon: 'grain', permission: 'catalogue:read' },
      { key: 'options', href: routes.optionTypes(), icon: 'palette', permission: 'catalogue:read' },
      { key: 'suppliers', href: routes.suppliers(), icon: 'users', permission: 'purchases:read' },
    ],
  },
  {
    key: 'items',
    sections: [
      { key: 'addItem', href: routes.addItem(), icon: 'plus', permission: 'catalogue:write' },
      { key: 'items', href: routes.products(), icon: 'leaf', permission: 'catalogue:read' },
      { key: 'sellPrice', href: routes.itemPrices(), icon: 'tag', permission: 'catalogue:write' },
      {
        key: 'priceGroups',
        href: routes.priceGroups(),
        icon: 'archive',
        permission: 'promotions:manage',
      },
    ],
  },
  {
    key: 'buying',
    sections: [
      { key: 'buy', href: routes.buy(), icon: 'truck', permission: 'purchases:write' },
      { key: 'buying', href: routes.purchaseBills(), icon: 'list', permission: 'purchases:read' },
    ],
  },
  {
    key: 'stock',
    sections: [
      { key: 'stock', href: routes.stock(), icon: 'box', permission: 'inventory:read' },
      { key: 'flowWork', href: routes.expiring(), icon: 'clock', permission: 'inventory:read' },
      { key: 'archive', href: routes.archive(), icon: 'archive', permission: 'catalogue:read' },
    ],
  },
  {
    key: 'kits',
    sections: [
      { key: 'kits', href: routes.kits(), icon: 'gift', permission: 'catalogue:read' },
      { key: 'pujas', href: routes.pujaGroups(), icon: 'temple', permission: 'catalogue:read' },
    ],
  },
  {
    key: 'sell',
    sections: [
      { key: 'counterSale', href: routes.counterSale(), icon: 'store', permission: 'orders:sell' },
      { key: 'orders', href: routes.orders(), icon: 'bag', permission: 'orders:read' },
      { key: 'customers', href: routes.customers(), icon: 'user', permission: 'customers:read' },
    ],
  },
  {
    key: 'money',
    sections: [
      { key: 'money', href: routes.moneyAccounts(), icon: 'coin', permission: 'money:read' },
      { key: 'expenses', href: routes.expenses(), icon: 'tag', permission: 'expenses:read' },
      { key: 'reports', href: routes.itemSales(), icon: 'calendar', permission: 'reports:read' },
    ],
  },
  {
    key: 'marketing',
    sections: [
      { key: 'offers', href: routes.offers(), icon: 'percent', permission: 'promotions:manage' },
      { key: 'discounts', href: routes.discounts(), icon: 'tag', permission: 'promotions:manage' },
      { key: 'pandits', href: routes.pandits(), icon: 'users', permission: 'promotions:manage' },
    ],
  },
  {
    key: 'website',
    sections: [{ key: 'content', href: routes.faqs(), icon: 'book', permission: 'catalogue:read' }],
  },
  {
    key: 'settings',
    sections: [
      { key: 'settings', href: routes.taxClasses(), icon: 'check', permission: 'settings:manage' },
      { key: 'staff', href: routes.staff(), icon: 'users', permission: 'users:read' },
      { key: 'dataReset', href: routes.dataReset(), icon: 'trash', permission: 'data:reset' },
    ],
  },
];

// The groups with only the sections these permissions open; empty groups drop out.
export function navigationFor(granted: readonly string[]): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      sections: group.sections.filter((section) => can(granted, section.permission)),
    }))
    .filter((group) => group.sections.length > 0);
}
