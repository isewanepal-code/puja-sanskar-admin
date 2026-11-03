import type { IconName } from '@/components/icons';
import { routes } from '@/lib/routes';

import { can, type Permission } from './permissions';

export type NavSection = {
  key:
    'dashboard' | 'orders' | 'pujas' | 'catalogue' | 'content' | 'marketing' | 'settings' | 'staff';
  href: string;
  icon: IconName;
  // Shown only to staff who hold it; the API refuses the rest anyway.
  permission?: Permission;
};

export type NavGroup = {
  key: 'overview' | 'sales' | 'catalogue' | 'site' | 'admin';
  sections: NavSection[];
};

// Every section of the admin panel, grouped as the sidebar shows them; each opens to its own tabs.
export const navigation: NavGroup[] = [
  {
    key: 'overview',
    sections: [{ key: 'dashboard', href: routes.dashboard(), icon: 'grid' }],
  },
  {
    key: 'sales',
    sections: [{ key: 'orders', href: routes.orders(), icon: 'box', permission: 'orders:read' }],
  },
  {
    key: 'catalogue',
    sections: [
      { key: 'pujas', href: routes.pujaGroups(), icon: 'temple', permission: 'catalogue:read' },
      { key: 'catalogue', href: routes.categories(), icon: 'leaf', permission: 'catalogue:read' },
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
