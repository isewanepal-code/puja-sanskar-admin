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
    | 'buying'
    | 'suppliers'
    | 'money'
    | 'expenses'
    | 'reports'
    | 'pujas'
    | 'content'
    | 'marketing'
    | 'catalogue'
    | 'settings'
    | 'staff';
  href: string;
  icon: IconName;
  // Shown only to staff who hold it; the API refuses the rest anyway.
  permission?: Permission;
};

export type NavGroup = {
  key: 'overview' | 'sell' | 'stock' | 'money' | 'website' | 'setup';
  sections: NavSection[];
};

// The sidebar in the order the shop works: sell, keep stock, count money, run the website, set up.
export const navigation: NavGroup[] = [
  {
    key: 'overview',
    sections: [{ key: 'dashboard', href: routes.dashboard(), icon: 'grid' }],
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
    key: 'stock',
    sections: [
      { key: 'items', href: routes.products(), icon: 'leaf', permission: 'catalogue:read' },
      { key: 'kits', href: routes.kits(), icon: 'gift', permission: 'catalogue:read' },
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
    key: 'website',
    sections: [
      { key: 'pujas', href: routes.pujaGroups(), icon: 'temple', permission: 'catalogue:read' },
      { key: 'content', href: routes.faqs(), icon: 'book', permission: 'catalogue:read' },
      {
        key: 'marketing',
        href: routes.pandits(),
        icon: 'percent',
        permission: 'promotions:manage',
      },
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
