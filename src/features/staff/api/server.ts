import 'server-only';

import { cache } from 'react';

import { unwrap } from '@/lib/api';
import { sessionApi } from '@/lib/api/server';

// The language the panel opens in for staff who have not picked one; English if it cannot be read.
export const getAdminLanguage = cache(async (): Promise<'en' | 'ne'> => {
  try {
    const { language } = await unwrap((await sessionApi()).GET('/api/v1/settings/language'));
    return language;
  } catch {
    return 'en';
  }
});

// Sidebar entries the shop hid for this staff member's roles; none if it cannot be read.
export const getHiddenMenus = cache(async (): Promise<string[]> => {
  try {
    const { hidden } = await unwrap((await sessionApi()).GET('/api/v1/settings/menus'));
    return hidden;
  } catch {
    return [];
  }
});

// The signed-in staff member with their roles and permissions; one call per request.
export const getMe = cache(async () => unwrap((await sessionApi()).GET('/api/v1/auth/me')));
