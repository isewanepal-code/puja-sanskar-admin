// The API's permission names (src/common/auth/permission.ts there).
export const PERMISSIONS = [
  'catalogue:read',
  'catalogue:write',
  'catalogue:delete',
  'dataset:import',
  'knowledge:verify',
  'inventory:read',
  'inventory:write',
  'carts:read',
  'carts:use',
  'orders:place',
  'orders:read',
  'orders:write',
  'orders:sell',
  'billing:read',
  'billing:write',
  'billing:manage',
  'reports:read',
  'users:read',
  'users:write',
  'customers:read',
  'activity:read',
  'promotions:manage',
  'settings:manage',
  'requests:handle',
  'discounts:override',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const can = (granted: readonly string[], permission?: Permission) =>
  !permission || granted.includes(permission);
