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
  login: (next?: string) => (next ? `/login?next=${encodeURIComponent(next)}` : '/login'),

  // The tree, opened at a group.
  pujaGroups: (at?: string) => withQuery('/pujas', { at }),
  newPujaGroup: (parentId?: string) => withQuery('/pujas/groups/new', { parent: parentId }),
  pujaGroup: (id: string) => `/pujas/groups/${id}`,
  pujas: (query: { q?: string; group?: string } = {}) => withQuery('/pujas/list', query),
  newPuja: (groupId?: string) => withQuery('/pujas/list/new', { group: groupId }),
  puja: (id: string) => `/pujas/list/${id}`,
  ritualTypes: () => '/pujas/ritual-types',
  newRitualType: () => '/pujas/ritual-types/new',
  ritualType: (id: string) => `/pujas/ritual-types/${id}`,
  pujaLevels: () => '/pujas/levels',
} as const;

export type RouteName = keyof typeof routes;
