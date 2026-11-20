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
  newKit: () => '/kits/new',
  // The inventory pages: add an item, then buy it.
  addItem: () => '/inventory/add-item',
  expiring: () => '/inventory/expiring',
  buy: (itemId?: string) => withQuery('/inventory/buy', { item: itemId }),
  flowItem: () => '/start/item',
  newPurchase: () => '/start/buy',
  itemPrices: () => '/start/prices',
  stockWork: () => '/start/work',
  kit: (id: string) => `/kits/${id}`,

  categories: () => '/catalogue',
  materials: () => '/catalogue/samagri',
  products: () => '/items',
  item: (id: string) => `/items/${id}`,
  newItem: () => '/items/new',
  archive: () => '/archive',
  stock: (show?: 'low' | 'out') => (show ? `/stock?show=${show}` : '/stock'),
  units: () => '/catalogue/units',
  sources: () => '/catalogue/sources',
  optionTypes: () => '/options',
  dataReset: () => '/data-reset',

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

  pandits: () => '/marketing/pandits',
  discounts: () => '/marketing/discounts',
  offers: () => '/marketing/offers',
  priceGroups: () => '/marketing/groups',

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
  purchaseReturns: () => '/purchases/returns',
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
  supplierStatement: () => '/reports/supplier-statement',
  itemSales: () => '/reports/items',
  searchTerms: () => '/reports/searches',
} as const;

export type RouteName = keyof typeof routes;
