const withQuery = (path: string, query: Record<string, string | undefined>) => {
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => !!entry[1]),
  ).toString();
  return search ? `${path}?${search}` : path;
};

// Every path the admin panel links to.
export const routes = {
  dashboard: () => '/',
  orders: () => '/orders',
  order: (id: string) => `/orders/${id}`,
  counterSale: () => '/counter',
  bills: () => '/orders/bills',
  login: (next?: string) => (next ? `/login?next=${encodeURIComponent(next)}` : '/login'),

  // The tree, opened at a group.
  pujaGroups: (at?: string) => withQuery('/pujas', { at }),
  pujas: () => '/pujas/list',
  ritualTypes: () => '/pujas/ritual-types',
  pujaLevels: () => '/pujas/levels',
  mantras: () => '/pujas/mantras',
  kits: () => '/kits',

  categories: () => '/catalogue',
  materials: () => '/catalogue/samagri',
  products: () => '/items',
  stock: (show?: 'low' | 'out') => (show ? `/stock?show=${show}` : '/stock'),
  units: () => '/catalogue/units',
  sources: () => '/catalogue/sources',

  faqs: () => '/content',
  menus: () => '/content/menus',
  stories: () => '/content/stories',
  media: () => '/content/media',
  festivals: () => '/content/festivals',
  articles: () => '/content/articles',
  banners: () => '/content/banners',
  homeSections: () => '/content/home-rows',
  reviews: () => '/content/reviews',

  customers: () => '/customers',
  carts: () => '/customers/carts',
  listPhotos: () => '/customers/lists',
  messages: () => '/customers/messages',
  reminders: () => '/customers/reminders',

  pandits: () => '/marketing',
  discounts: () => '/marketing/discounts',

  taxClasses: () => '/settings',
  deliveryZones: () => '/settings/delivery-zones',
  deliverySlots: () => '/settings/delivery-slots',
  shopSettings: () => '/settings/shop',
  businessProfile: () => '/settings/business',
  branches: () => '/settings/branches',

  moneyAccounts: () => '/money',
  purchaseBills: () => '/purchases',
  suppliers: () => '/suppliers',
  supplierPayments: () => '/purchases/payments',
  expenses: () => '/expenses',
  expenseCategories: () => '/expenses/categories',

  staff: () => '/staff',
  activity: () => '/staff/activity',
  dataTools: () => '/settings/data',

  salesBook: () => '/reports',
  vat: () => '/reports/vat',
  dayBook: () => '/reports/day-book',
  receivables: () => '/reports/receivables',
  profitAndLoss: () => '/reports/profit-and-loss',
  purchaseBook: () => '/reports/purchase-book',
  itemSales: () => '/reports/items',
} as const;

export type RouteName = keyof typeof routes;
