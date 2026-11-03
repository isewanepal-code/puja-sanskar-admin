import type { IconName } from '@/components/icons';
import { routes } from '@/lib/routes';

import { can, type Permission } from './permissions';

export type NavSection = {
  key:
    | 'dashboard'
    | 'reports'
    | 'orders'
    | 'customers'
    | 'pujas'
    | 'catalogue'
    | 'content'
    | 'marketing'
    | 'money'
    | 'purchases'
    | 'expenses'
    | 'settings'
    | 'staff';
  href: string;
  icon: IconName;
  // Shown only to staff who hold it; the API refuses the rest anyway.
  permission?: Permission;
};

export type NavGroup = {
  key: 'overview' | 'sales' | 'accounts' | 'catalogue' | 'site' | 'admin';
  sections: NavSection[];
};

// Every section of the admin panel, grouped as the sidebar shows them; each opens to its own tabs.
export const navigation: NavGroup[] = [
  {
    key: 'overview',
    sections: [
      { key: 'dashboard', href: routes.dashboard(), icon: 'grid' },
      { key: 'reports', href: routes.salesBook(), icon: 'list', permission: 'reports:read' },
    ],
  },
  {
    key: 'sales',
    sections: [
      { key: 'orders', href: routes.orders(), icon: 'box', permission: 'orders:read' },
      { key: 'customers', href: routes.customers(), icon: 'user', permission: 'customers:read' },
      {
        key: 'marketing',
        href: routes.pandits(),
        icon: 'percent',
        permission: 'promotions:manage',
      },
    ],
  },
  {
    key: 'accounts',
    sections: [
      { key: 'money', href: routes.moneyAccounts(), icon: 'coin', permission: 'money:read' },
      {
        key: 'purchases',
        href: routes.purchaseBills(),
        icon: 'truck',
        permission: 'purchases:read',
      },
      { key: 'expenses', href: routes.expenses(), icon: 'tag', permission: 'expenses:read' },
    ],
  },
  {
    key: 'catalogue',
    sections: [
      { key: 'pujas', href: routes.pujaGroups(), icon: 'temple', permission: 'catalogue:read' },
      { key: 'catalogue', href: routes.categories(), icon: 'leaf', permission: 'catalogue:read' },
    ],
  },
  {
    key: 'site',
    sections: [{ key: 'content', href: routes.faqs(), icon: 'book', permission: 'catalogue:read' }],
  },
  {
    key: 'admin',
    sections: [
      {
        key: 'settings',
        href: routes.taxClasses(),
        icon: 'palette',
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
