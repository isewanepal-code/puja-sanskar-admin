const withQuery = (path: string, query: Record<string, string | undefined>) => {
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => !!entry[1]),
  ).toString();
  return search ? `${path}?${search}` : path;
};

// Every path the admin panel links to.
export const routes = {
  dashboard: () => '/',
  manual: () => '/manual',
  orders: () => '/orders',
  order: (id: string) => `/orders/${id}`,
  counterSale: () => '/counter',
  bills: () => '/orders/bills',
  customerReturns: () => '/orders/returns',
  newCustomerReturn: (orderId?: string) => withQuery('/orders/returns/new', { order: orderId }),
  login: (next?: string) => (next ? `/login?next=${encodeURIComponent(next)}` : '/login'),

  // The tree, opened at a group.
  pujaGroups: (at?: string) => withQuery('/pujas', { at }),
  pujas: () => '/pujas/list',
  ritualTypes: () => '/pujas/ritual-types',
  pujaLevels: () => '/pujas/levels',
  mantras: () => '/pujas/mantras',
  kits: () => '/kits',
  // `puja` starts the new kit already on that puja.
  newKit: (pujaId?: string) => withQuery('/kits/new', { puja: pujaId }),
  // The inventory pages: add an item, then buy it.
  addItem: () => '/inventory/add-item',
  expiring: () => '/inventory/expiring',
  losses: () => '/inventory/losses',
  // `back` is where to return to once the stock is bought (a kit waiting for its items).
  buy: (itemId?: string, back?: string) => withQuery('/inventory/buy', { item: itemId, back }),
  // `more` are other items waiting for their price (a bill with several items); `from` is where to
  // return to when the work is done.
  quantityPrice: (itemId?: string, more?: string[], from?: string) =>
    withQuery('/inventory/quantity-price', {
      item: itemId,
      more: more && more.length > 0 ? more.join(',') : undefined,
      from,
    }),
  kit: (id: string) => `/kits/${id}`,

  categories: () => '/catalogue',
  materials: () => '/catalogue/samagri',
  products: () => '/items',
  item: (id: string) => `/items/${id}`,
  archive: () => '/archive',
  stock: (show?: 'low' | 'out') => (show ? `/stock?show=${show}` : '/stock'),
  units: () => '/catalogue/units',
  sources: () => '/catalogue/sources',
  brands: () => '/catalogue/brands',
  companies: () => '/catalogue/companies',
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
  sidebarMenus: () => '/settings/menus',

  moneyAccounts: () => '/money',
  // `saved` is the items of a bill just saved: the page offers to set their quantity and price.
  purchaseBills: (opts?: { saved?: string[]; back?: string }) =>
    opts?.saved
      ? withQuery('/purchases', { saved: '1', items: opts.saved.join(','), back: opts.back })
      : '/purchases',
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
