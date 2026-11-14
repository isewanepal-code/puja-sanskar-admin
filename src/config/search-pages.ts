import { routes, type RouteName } from '@/lib/routes';

import type { Permission } from './permissions';

export type SearchPage = {
  id: string;
  href: string;
  permission?: Permission;
  // Other words staff may type for it.
  keywords: string;
};

// Every page of the panel, so the global search can open any of them by name.
const page = (
  id: string,
  name: RouteName,
  keywords: string,
  permission?: Permission,
): SearchPage => ({
  id,
  href: (routes[name] as () => string)(),
  keywords,
  permission,
});

export const searchPages: SearchPage[] = [
  page('dashboard', 'dashboard', 'home summary today'),
  page('counterSale', 'counterSale', 'pos shop bill quick sale', 'orders:sell'),
  page('orders', 'orders', 'order list online', 'orders:read'),
  page('bills', 'bills', 'invoice receipt', 'orders:read'),
  page('customers', 'customers', 'people buyers', 'customers:read'),
  page('carts', 'carts', 'shared cart basket', 'customers:read'),
  page('listPhotos', 'listPhotos', 'photo list upload', 'customers:read'),
  page('messages', 'messages', 'inbox contact enquiry', 'customers:read'),
  page('reminders', 'reminders', 'festival reminder', 'customers:read'),
  page('products', 'products', 'products samagri packs prices', 'catalogue:read'),
  page('kits', 'kits', 'puja kit package set', 'catalogue:read'),
  page('stock', 'stock', 'inventory quantity low out', 'inventory:read'),
  page('archive', 'archive', 'deleted removed restore', 'catalogue:read'),
  page('purchaseBills', 'purchaseBills', 'buying supplier bill', 'purchases:read'),
  page('suppliers', 'suppliers', 'vendor', 'purchases:read'),
  page('supplierPayments', 'supplierPayments', 'pay vendor', 'purchases:read'),
  page('moneyAccounts', 'moneyAccounts', 'cash bank qr esewa khalti', 'money:read'),
  page('expenses', 'expenses', 'cost spending', 'expenses:read'),
  page('expenseCategories', 'expenseCategories', 'cost type', 'expenses:read'),
  page('itemSales', 'itemSales', 'report sold', 'reports:read'),
  page('salesBook', 'salesBook', 'report sales', 'reports:read'),
  page('vat', 'vat', 'tax', 'reports:read'),
  page('dayBook', 'dayBook', 'daily', 'reports:read'),
  page('receivables', 'receivables', 'credit due unpaid', 'reports:read'),
  page('profitAndLoss', 'profitAndLoss', 'profit loss', 'reports:read'),
  page('purchaseBook', 'purchaseBook', 'report buying', 'reports:read'),
  page('pujaGroups', 'pujaGroups', 'puja tree festival group', 'catalogue:read'),
  page('pujas', 'pujas', 'ritual list', 'catalogue:read'),
  page('ritualTypes', 'ritualTypes', 'type', 'catalogue:read'),
  page('pujaLevels', 'pujaLevels', 'basic standard premium tier', 'catalogue:read'),
  page('mantras', 'mantras', 'audio', 'catalogue:read'),
  page('faqs', 'faqs', 'questions help content', 'catalogue:read'),
  page('menus', 'menus', 'navigation header footer links', 'catalogue:read'),
  page('stories', 'stories', 'content', 'catalogue:read'),
  page('media', 'media', 'images photos files upload', 'catalogue:read'),
  page('festivals', 'festivals', 'calendar event', 'catalogue:read'),
  page('articles', 'articles', 'blog', 'catalogue:read'),
  page('banners', 'banners', 'home slider offer', 'catalogue:read'),
  page('homeSections', 'homeSections', 'homepage rows', 'catalogue:read'),
  page('reviews', 'reviews', 'ratings testimonials', 'catalogue:read'),
  page('pandits', 'pandits', 'priest referral', 'promotions:manage'),
  page('discounts', 'discounts', 'coupon promo code offer', 'promotions:manage'),
  page('categories', 'categories', 'group classify', 'catalogue:read'),
  page('materials', 'materials', 'samagri', 'catalogue:read'),
  page('units', 'units', 'kg gram measure', 'catalogue:read'),
  page('sources', 'sources', 'origin', 'catalogue:read'),
  page('taxClasses', 'taxClasses', 'vat rate', 'settings:manage'),
  page('deliveryZones', 'deliveryZones', 'area charge', 'settings:manage'),
  page('deliverySlots', 'deliverySlots', 'time', 'settings:manage'),
  page('shopSettings', 'shopSettings', 'store', 'settings:manage'),
  page('businessProfile', 'businessProfile', 'pan address bill header', 'settings:manage'),
  page('branches', 'branches', 'stores', 'settings:manage'),
  page('staff', 'staff', 'users roles team', 'users:read'),
  page('activity', 'activity', 'audit history', 'users:read'),
  page('dataTools', 'dataTools', 'import export excel backup', 'settings:manage'),
];
