import { PathText } from '@/components/display';
import { activeColumn, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { PATH_SEPARATOR, wholeSource } from '@/lib/choices';

type MenuItem = Schema<'AdminMenuItemResponse'>;
type Name = (key: string) => string;

export const MENU_PLACES = ['HEADER', 'HEADER_SIDE', 'FOOTER', 'MOBILE_BAR'] as const;

const HREF = {
  regex: /^(\/[\w\-./?=&%#~]*|https:\/\/\S+)$/,
  message: 'A site path such as /kits, or an https:// address',
};

// Headings and top links first, each followed by the links under it.
function inTreeOrder(items: MenuItem[]): MenuItem[] {
  const byOrder = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  return MENU_PLACES.flatMap((place) =>
    byOrder
      .filter((item) => item.place === place && !item.parentId)
      .flatMap((top) => [top, ...byOrder.filter((item) => item.parentId === top.id)]),
  );
}

const loadAll = () => request<MenuItem[]>('GET', '/admin/menu-items').then(inTreeOrder);

// The website's header, side links, footer columns and phone bar (API 2.41).
export function menusResource(name: Name): Resource<MenuItem> {
  return {
    key: 'menuItems',
    path: '/admin/menu-items',
    list: 'all',
    loadAll: async () => {
      const items = await loadAll();
      const names = new Map(items.map((item) => [item.id, item.labelNe]));
      // A link under a heading reads "heading › link".
      return items.map((item) => ({
        ...item,
        labelNe: item.parentId
          ? `${names.get(item.parentId) ?? ''}${PATH_SEPARATOR}${item.labelNe}`
          : item.labelNe,
      }));
    },
    rowId: (row) => row.id,
    rowLabel: (row) => row.labelNe,
    matches: (row, q) =>
      `${row.labelNe} ${row.labelEn} ${row.href ?? ''}`.toLowerCase().includes(q),
    // Rows come in menu order; sorting by a heading regroups them.
    initialSort: undefined,
    formRow: (row) => ({ ...row, labelNe: row.labelNe.split(PATH_SEPARATOR).at(-1) }),
    columns: [
      {
        key: 'place',
        cell: (row) => <Badge tone="info">{name(`places.${row.place}`)}</Badge>,
        sortValue: (row) => row.place,
      },
      {
        key: 'labelNe',
        cell: (row) => (
          <span className="flex items-center gap-2">
            <PathText path={row.labelNe} />
            <span className="text-xs text-muted-foreground">{row.labelEn}</span>
          </span>
        ),
        sortValue: (row) => row.labelNe,
      },
      {
        key: 'href',
        cell: (row) =>
          row.href ? (
            <span className="font-mono text-xs">{row.href}</span>
          ) : (
            <span className="text-muted-foreground">{name('heading')}</span>
          ),
        sortValue: (row) => row.href,
      },
      {
        key: 'isHighlighted',
        cell: (row) => (row.isHighlighted ? '✓' : '—'),
        sortValue: (row) => row.isHighlighted,
      },
      { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
      activeColumn(),
    ],
    fields: [
      {
        name: 'place',
        kind: 'select',
        required: true,
        createOnly: true,
        options: MENU_PLACES.map((place) => ({ value: place, label: name(`places.${place}`) })),
      },
      {
        name: 'parentId',
        kind: 'select',
        createOnly: true,
        // Only top items can hold links; the API checks the place matches.
        optionsFrom: wholeSource('menu-headings', async () =>
          (await loadAll())
            .filter((item) => !item.parentId)
            .map((item) => ({
              value: item.id,
              label: item.labelNe,
              detail: name(`places.${item.place}`),
            })),
        ),
      },
      { name: 'labelNe', kind: 'text', required: true, max: 80 },
      { name: 'labelEn', kind: 'text', required: true, max: 80 },
      { name: 'href', kind: 'text', max: 300, pattern: HREF, wide: true },
      { name: 'icon', kind: 'text', max: 30 },
      { name: 'sortOrder', kind: 'number' },
      { name: 'isHighlighted', kind: 'switch', defaultValue: false },
      { name: 'isActive', kind: 'switch' },
    ],
  };
}
