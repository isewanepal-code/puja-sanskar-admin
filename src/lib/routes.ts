// Every path the admin panel links to.
export const routes = {
  dashboard: () => '/',
  orders: () => '/orders',
  order: (id: string) => `/orders/${id}`,
  login: (next?: string) => (next ? `/login?next=${encodeURIComponent(next)}` : '/login'),
} as const;

export type RouteName = keyof typeof routes;
