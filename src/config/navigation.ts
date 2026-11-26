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
    | 'losses'
    | 'buying'
    | 'purchaseReturns'
    | 'supplierPayments'
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
    | 'materials'
    | 'sources'
    | 'brands'
    | 'companies'
    | 'dataReset'
    | 'catalogue'
    | 'settings'
    | 'staff'
    | 'bills'
    | 'customerReturns'
    | 'carts'
    | 'listPhotos'
    | 'messages'
    | 'reminders'
    | 'expenseCategories'
    | 'pujaList'
    | 'newPuja'
    | 'newKit'
    | 'ritualTypes'
    | 'mantras'
    | 'pujaLevels'
    | 'festivals'
    | 'salesBook'
    | 'vat'
    | 'dayBook'
    | 'receivables'
    | 'profitAndLoss'
    | 'purchaseBook'
    | 'supplierStatement'
    | 'searchTerms'
    | 'menus'
    | 'articles'
    | 'banners'
    | 'homeSections'
    | 'stories'
    | 'reviews'
    | 'media'
    | 'deliveryZones'
    | 'deliverySlots'
    | 'shopSettings'
    | 'businessProfile'
    | 'branches'
    | 'sidebarMenus'
    | 'dataTools'
    | 'activity';
  href: string;
  icon: IconName;
  // Shown only to staff who hold it; the API refuses the rest anyway.
  permission?: Permission;
  // Sits in a folded list of its own inside the group, so a long group stays short.
  sub?: 'pujaKnowledge';
  // A page of its own that names itself in the header but has no sidebar line (it is a tab of another).
  hidden?: boolean;
};

export type NavGroup = {
  key:
    | 'overview'
    | 'setup'
    | 'items'
    | 'buying'
    | 'stock'
    | 'pujaGroup'
    | 'kits'
    | 'sell'
    | 'returns'
    | 'money'
    | 'reports'
    | 'marketing'
    | 'website'
    | 'settings';
  sections: NavSection[];
};

// The sidebar in the order the shop works, numbered: what must exist first (categories, units, brands,
// colours and sizes, suppliers, then the puja knowledge: samagri and sources), then the items, buying them, the stock, kits and pujas, selling,
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
      {
        key: 'priceGroups',
        href: routes.priceGroups(),
        icon: 'archive',
        permission: 'promotions:manage',
      },
      { key: 'units', href: routes.units(), icon: 'grain', permission: 'catalogue:read' },
      { key: 'brands', href: routes.brands(), icon: 'tag', permission: 'catalogue:read' },
      { key: 'companies', href: routes.companies(), icon: 'store', permission: 'catalogue:read' },
      { key: 'options', href: routes.optionTypes(), icon: 'palette', permission: 'catalogue:read' },
      { key: 'suppliers', href: routes.suppliers(), icon: 'users', permission: 'purchases:read' },
      // Puja knowledge, not daily work: folded in a list of its own at the end of the setup.
      {
        key: 'materials',
        href: routes.materials(),
        icon: 'leaf',
        permission: 'catalogue:read',
        sub: 'pujaKnowledge',
      },
      {
        key: 'sources',
        href: routes.sources(),
        icon: 'book',
        permission: 'catalogue:read',
        sub: 'pujaKnowledge',
      },
      {
        key: 'mantras',
        href: routes.mantras(),
        icon: 'book',
        permission: 'catalogue:read',
        sub: 'pujaKnowledge',
      },
      {
        key: 'ritualTypes',
        href: routes.ritualTypes(),
        icon: 'list',
        permission: 'catalogue:read',
        sub: 'pujaKnowledge',
      },
      {
        key: 'pujaLevels',
        href: routes.pujaLevels(),
        icon: 'list',
        permission: 'catalogue:read',
        sub: 'pujaKnowledge',
      },
      {
        key: 'festivals',
        href: routes.festivals(),
        icon: 'calendar',
        permission: 'catalogue:read',
        sub: 'pujaKnowledge',
      },
    ],
  },
  {
    key: 'items',
    sections: [
      { key: 'addItem', href: routes.addItem(), icon: 'plus', permission: 'catalogue:write' },
      {
        key: 'sellPrice',
        href: routes.quantityPrice(),
        icon: 'tag',
        permission: 'catalogue:write',
      },
      { key: 'items', href: routes.products(), icon: 'leaf', permission: 'catalogue:read' },
    ],
  },
  {
    key: 'buying',
    sections: [
      { key: 'buy', href: routes.buy(), icon: 'truck', permission: 'purchases:write' },
      { key: 'buying', href: routes.purchaseBills(), icon: 'list', permission: 'purchases:read' },
      {
        key: 'supplierPayments',
        href: routes.supplierPayments(),
        icon: 'coin',
        permission: 'purchases:read',
      },
    ],
  },
  {
    key: 'stock',
    sections: [
      { key: 'stock', href: routes.stock(), icon: 'box', permission: 'inventory:read' },
      { key: 'flowWork', href: routes.expiring(), icon: 'clock', permission: 'inventory:read' },
      { key: 'losses', href: routes.losses(), icon: 'archive', permission: 'inventory:read' },
      { key: 'archive', href: routes.archive(), icon: 'archive', permission: 'catalogue:read' },
    ],
  },
  // Pujas come first, then their kits: two groups, each with its own "new" line.
  {
    key: 'pujaGroup',
    sections: [
      { key: 'newPuja', href: routes.newPujaPage(), icon: 'plus', permission: 'catalogue:read' },
      { key: 'pujaList', href: routes.pujas(), icon: 'temple', permission: 'catalogue:read' },
      // The tree of puja groups is reached from the list; it keeps its header but has no sidebar line.
      {
        key: 'pujas',
        href: routes.pujaGroups(),
        icon: 'temple',
        permission: 'catalogue:read',
        hidden: true,
      },
    ],
  },
  {
    key: 'kits',
    sections: [
      { key: 'newKit', href: routes.newKit(), icon: 'plus', permission: 'catalogue:read' },
      { key: 'kits', href: routes.kits(), icon: 'gift', permission: 'catalogue:read' },
    ],
  },
  {
    key: 'sell',
    sections: [
      { key: 'counterSale', href: routes.counterSale(), icon: 'store', permission: 'orders:sell' },
      { key: 'orders', href: routes.orders(), icon: 'bag', permission: 'orders:read' },
      { key: 'bills', href: routes.bills(), icon: 'list', permission: 'orders:read' },
      { key: 'customers', href: routes.customers(), icon: 'user', permission: 'customers:read' },
      { key: 'carts', href: routes.carts(), icon: 'bag', permission: 'customers:read' },
      { key: 'listPhotos', href: routes.listPhotos(), icon: 'book', permission: 'customers:read' },
      { key: 'messages', href: routes.messages(), icon: 'list', permission: 'customers:read' },
      { key: 'reminders', href: routes.reminders(), icon: 'clock', permission: 'customers:read' },
    ],
  },
  {
    key: 'returns',
    sections: [
      {
        key: 'customerReturns',
        href: routes.customerReturns(),
        icon: 'archive',
        permission: 'orders:read',
      },
      {
        key: 'purchaseReturns',
        href: routes.purchaseReturns(),
        icon: 'archive',
        permission: 'purchases:read',
      },
    ],
  },
  {
    key: 'money',
    sections: [
      { key: 'money', href: routes.moneyAccounts(), icon: 'coin', permission: 'money:read' },
      { key: 'expenses', href: routes.expenses(), icon: 'tag', permission: 'expenses:read' },
      {
        key: 'expenseCategories',
        href: routes.expenseCategories(),
        icon: 'list',
        permission: 'expenses:read',
      },
    ],
  },
  {
    key: 'reports',
    sections: [
      { key: 'reports', href: routes.itemSales(), icon: 'calendar', permission: 'reports:read' },
      { key: 'salesBook', href: routes.salesBook(), icon: 'calendar', permission: 'reports:read' },
      { key: 'vat', href: routes.vat(), icon: 'percent', permission: 'reports:read' },
      { key: 'dayBook', href: routes.dayBook(), icon: 'calendar', permission: 'reports:read' },
      { key: 'receivables', href: routes.receivables(), icon: 'coin', permission: 'reports:read' },
      {
        key: 'profitAndLoss',
        href: routes.profitAndLoss(),
        icon: 'coin',
        permission: 'reports:read',
      },
      {
        key: 'purchaseBook',
        href: routes.purchaseBook(),
        icon: 'list',
        permission: 'reports:read',
      },
      {
        key: 'supplierStatement',
        href: routes.supplierStatement(),
        icon: 'users',
        permission: 'reports:read',
      },
      { key: 'searchTerms', href: routes.searchTerms(), icon: 'list', permission: 'reports:read' },
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
    sections: [
      { key: 'content', href: routes.faqs(), icon: 'book', permission: 'catalogue:read' },
      { key: 'menus', href: routes.menus(), icon: 'list', permission: 'catalogue:read' },
      { key: 'articles', href: routes.articles(), icon: 'book', permission: 'catalogue:read' },
      { key: 'banners', href: routes.banners(), icon: 'tag', permission: 'catalogue:read' },
      {
        key: 'homeSections',
        href: routes.homeSections(),
        icon: 'grid',
        permission: 'catalogue:read',
      },
      { key: 'stories', href: routes.stories(), icon: 'book', permission: 'catalogue:read' },
      { key: 'reviews', href: routes.reviews(), icon: 'user', permission: 'catalogue:read' },
      { key: 'media', href: routes.media(), icon: 'leaf', permission: 'catalogue:read' },
    ],
  },
  {
    key: 'settings',
    sections: [
      { key: 'settings', href: routes.taxClasses(), icon: 'check', permission: 'settings:manage' },
      {
        key: 'deliveryZones',
        href: routes.deliveryZones(),
        icon: 'truck',
        permission: 'settings:manage',
      },
      {
        key: 'deliverySlots',
        href: routes.deliverySlots(),
        icon: 'clock',
        permission: 'settings:manage',
      },
      {
        key: 'shopSettings',
        href: routes.shopSettings(),
        icon: 'check',
        permission: 'settings:manage',
      },
      {
        key: 'businessProfile',
        href: routes.businessProfile(),
        icon: 'book',
        permission: 'settings:manage',
      },
      { key: 'branches', href: routes.branches(), icon: 'store', permission: 'settings:manage' },
      {
        key: 'sidebarMenus',
        href: routes.sidebarMenus(),
        icon: 'list',
        permission: 'settings:manage',
      },
      { key: 'dataTools', href: routes.dataTools(), icon: 'box', permission: 'settings:manage' },
      { key: 'staff', href: routes.staff(), icon: 'users', permission: 'users:read' },
      { key: 'activity', href: routes.activity(), icon: 'clock', permission: 'users:read' },
      { key: 'dataReset', href: routes.dataReset(), icon: 'trash', permission: 'data:reset' },
    ],
  },
];

// The groups with only the sections these permissions open; empty groups drop out.
// Entries nobody can hide: the way back to the dashboard and the manual, and the page that hides entries.
export const ALWAYS_SHOWN: readonly NavSection['key'][] = ['dashboard', 'manual', 'sidebarMenus'];

// Hiding only tidies the menu; the permission still decides who may open the page.
export function navigationFor(
  granted: readonly string[],
  hidden: readonly string[] = [],
): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      sections: group.sections.filter(
        (section) =>
          !section.hidden &&
          can(granted, section.permission) &&
          (ALWAYS_SHOWN.includes(section.key) || !hidden.includes(section.key)),
      ),
    }))
    .filter((group) => group.sections.length > 0);
}
