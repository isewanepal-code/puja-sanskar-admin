import type { IconName } from '@/components/icons';
import { routes } from '@/lib/routes';

import { can, type Permission } from './permissions';

export type NavSection = {
  key:
    | 'dashboard'
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
    'overview' | 'inventory' | 'sell' | 'catalogue' | 'money' | 'marketing' | 'website' | 'setup';
  sections: NavSection[];
};

// The sidebar in the order the shop works: bring stock in, sell, count money, run the website, set up.
export const navigation: NavGroup[] = [
  {
    key: 'overview',
    sections: [{ key: 'dashboard', href: routes.dashboard(), icon: 'grid' }],
  },
  {
    // Everything about the goods in one place, in the order they come in: name the item, buy it,
    // see what is left. Each is its own page; none hides behind tabs.
    key: 'inventory',
    sections: [
      { key: 'addItem', href: routes.addItem(), icon: 'plus', permission: 'catalogue:write' },
      { key: 'buy', href: routes.buy(), icon: 'truck', permission: 'purchases:write' },
      { key: 'stock', href: routes.stock(), icon: 'box', permission: 'inventory:read' },
      { key: 'items', href: routes.products(), icon: 'leaf', permission: 'catalogue:read' },
      { key: 'sellPrice', href: routes.itemPrices(), icon: 'tag', permission: 'catalogue:write' },
      { key: 'buying', href: routes.purchaseBills(), icon: 'list', permission: 'purchases:read' },
      { key: 'suppliers', href: routes.suppliers(), icon: 'users', permission: 'purchases:read' },
    ],
  },
  {
    key: 'sell',
    sections: [
      { key: 'counterSale', href: routes.counterSale(), icon: 'store', permission: 'orders:sell' },
      { key: 'orders', href: routes.orders(), icon: 'box', permission: 'orders:read' },
      { key: 'customers', href: routes.customers(), icon: 'user', permission: 'customers:read' },
    ],
  },
  {
    // The less daily work: kits made of items, colours and sizes, repacking, and what was retired.
    key: 'catalogue',
    sections: [
      { key: 'kits', href: routes.kits(), icon: 'gift', permission: 'catalogue:read' },
      { key: 'options', href: routes.optionTypes(), icon: 'palette', permission: 'catalogue:read' },
      { key: 'flowWork', href: routes.stockWork(), icon: 'refresh', permission: 'inventory:write' },
      { key: 'archive', href: routes.archive(), icon: 'archive', permission: 'catalogue:read' },
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
      {
        key: 'priceGroups',
        href: routes.priceGroups(),
        icon: 'list',
        permission: 'promotions:manage',
      },
      { key: 'discounts', href: routes.discounts(), icon: 'tag', permission: 'promotions:manage' },
      { key: 'pandits', href: routes.pandits(), icon: 'users', permission: 'promotions:manage' },
    ],
  },
  {
    key: 'website',
    sections: [
      { key: 'pujas', href: routes.pujaGroups(), icon: 'temple', permission: 'catalogue:read' },
      { key: 'content', href: routes.faqs(), icon: 'book', permission: 'catalogue:read' },
    ],
  },
  {
    key: 'setup',
    sections: [
      {
        key: 'catalogue',
        href: routes.categories(),
        icon: 'palette',
        permission: 'catalogue:read',
      },
      {
        key: 'settings',
        href: routes.taxClasses(),
        icon: 'check',
        permission: 'settings:manage',
      },
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
