import type { IconName } from '@/components/icons';
import { routes } from '@/lib/routes';

import type { Permission } from './permissions';

export type NavSection = {
  key: 'dashboard' | 'orders' | 'pujas';
  href: string;
  icon: IconName;
  // Shown only to staff who hold it; the API refuses the rest anyway.
  permission?: Permission;
};

// Every section of the admin panel; the sidebar renders the ones the staff member may use.
export const navigation: NavSection[] = [
  { key: 'dashboard', href: routes.dashboard(), icon: 'grid' },
  { key: 'orders', href: routes.orders(), icon: 'box', permission: 'orders:read' },
  { key: 'pujas', href: routes.pujaGroups(), icon: 'temple', permission: 'catalogue:read' },
];
