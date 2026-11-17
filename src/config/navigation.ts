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
    | 'flowItem'
    | 'flowBuy'
    | 'flowPrices'
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
    | 'overview'
    | 'flow'
    | 'sell'
    | 'catalogue'
    | 'stock'
    | 'money'
    | 'marketing'
    | 'website'
    | 'setup';
  sections: NavSection[];
};

// The sidebar in the order the shop works: sell, keep stock, count money, run the website, set up.
export const navigation: NavGroup[] = [
  {
    key: 'overview',
    sections: [{ key: 'dashboard', href: routes.dashboard(), icon: 'grid' }],
  },
  {
    // The order a new item comes into the shop: name it, buy it, price it, look after it.
    key: 'flow',
    sections: [
      { key: 'flowItem', href: routes.flowItem(), icon: 'leaf', permission: 'catalogue:write' },
      { key: 'flowBuy', href: routes.newPurchase(), icon: 'truck', permission: 'purchases:write' },
      { key: 'flowPrices', href: routes.itemPrices(), icon: 'tag', permission: 'catalogue:write' },
      { key: 'flowWork', href: routes.stockWork(), icon: 'list', permission: 'inventory:write' },
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
    // What the shop sells: the items, the kits made of them, and the colours and sizes they come in.
    key: 'catalogue',
    sections: [
      { key: 'items', href: routes.products(), icon: 'leaf', permission: 'catalogue:read' },
      { key: 'kits', href: routes.kits(), icon: 'gift', permission: 'catalogue:read' },
      { key: 'options', href: routes.optionTypes(), icon: 'palette', permission: 'catalogue:read' },
      { key: 'archive', href: routes.archive(), icon: 'archive', permission: 'catalogue:read' },
    ],
  },
  {
    // What is on the shelf and how it got there: count it, buy it, send it back, pay for it.
    key: 'stock',
    sections: [
      { key: 'stock', href: routes.stock(), icon: 'list', permission: 'inventory:read' },
      { key: 'buying', href: routes.purchaseBills(), icon: 'truck', permission: 'purchases:read' },
      { key: 'suppliers', href: routes.suppliers(), icon: 'users', permission: 'purchases:read' },
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
