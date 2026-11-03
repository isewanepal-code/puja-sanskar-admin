import { activeColumn, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { type Schema } from '@/lib/api';
import { mergedSource } from '@/lib/choices';
import { formatDate, formatMoney } from '@/lib/format';

type Discount = Schema<'DiscountRuleResponse'>;
type Category = Schema<'AdminCategoryResponse'>;
type Product = Schema<'AdminProductResponse'>;
type Name = (key: string) => string;

const CHANNELS = ['ACCOUNT_CHECKOUT', 'QUICK_PAY', 'COUNTER'] as const;
const SCOPES = ['ORDER', 'CATEGORIES', 'PRODUCTS'] as const;

// What a discount may cover, remembered so the check can tell a category from a product.
const targetScope = new Map<string, 'CATEGORIES' | 'PRODUCTS'>();
const targetChoices = (name: Name) => {
  const list = <T extends { id: string; nameNe: string; code: string }>(
    scope: 'CATEGORIES' | 'PRODUCTS',
    path: string,
  ) => ({
    path,
    toChoices: (row: T) => {
      targetScope.set(row.id, scope);
      return [
        { value: row.id, label: row.nameNe, detail: row.code, group: name(`scopes.${scope}`) },
      ];
    },
  });
  return mergedSource('discount-targets', [
    list<Category>('CATEGORIES', '/admin/categories'),
    list<Product>('PRODUCTS', '/admin/products'),
  ]);
};

const worth = (row: Discount) =>
  row.kind === 'PERCENT' ? `${Number(row.value)}%` : formatMoney(row.value, 'en');

export function discountsResource(name: Name): Resource<Discount> {
  return {
    key: 'discounts',
    path: '/admin/discounts',
    list: 'paged',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.code} · ${row.name}`,
    initialSort: { key: 'code', direction: 'asc' },
    modalSize: 'lg',
    // The API's rules, said beside the field before anything is sent.
    check: ({ trigger, couponCode, kind, value, scope, scopeIds }) => {
      if (trigger === 'COUPON' && !couponCode)
        return { field: 'couponCode', message: name('rules.coupon') };
      if (kind === 'PERCENT' && Number(value) > 100)
        return { field: 'value', message: name('rules.percent') };
      const ids = Array.isArray(scopeIds) ? scopeIds.map(String) : [];
      if (scope && scope !== 'ORDER' && ids.length === 0) {
        return { field: 'scopeIds', message: name('rules.targets') };
      }
      if (ids.some((id) => targetScope.has(id) && targetScope.get(id) !== scope)) {
        return { field: 'scopeIds', message: name('rules.scope') };
      }
      return null;
    },
    columns: [
      {
        key: 'code',
        cell: (row) => <span className="font-semibold">{row.code}</span>,
        sortValue: (row) => row.code,
      },
      {
        key: 'name',
        cell: (row) => (
          <>
            <div>{row.name}</div>
            {row.couponCode ? (
              <div className="text-xs text-muted-foreground">{row.couponCode}</div>
            ) : null}
          </>
        ),
        sortValue: (row) => row.name,
      },
      {
        key: 'trigger',
        cell: (row) => name(`triggers.${row.trigger}`),
        sortValue: (row) => row.trigger,
      },
      { key: 'value', cell: worth, sortValue: (row) => Number(row.value), align: 'right' },
      { key: 'scope', cell: (row) => name(`scopes.${row.scope}`), sortValue: (row) => row.scope },
      {
        key: 'timesUsed',
        cell: (row) => `${row.timesUsed}${row.usageLimit ? ` / ${row.usageLimit}` : ''}`,
        sortValue: (row) => row.timesUsed,
        align: 'right',
      },
      {
        key: 'endsAt',
        cell: (row) => (row.endsAt ? formatDate(row.endsAt, 'en') : '—'),
        sortValue: (row) => row.endsAt,
      },
      {
        key: 'isPublic',
        cell: (row) => (row.isPublic ? <Badge tone="info">✓</Badge> : '—'),
        sortValue: (row) => row.isPublic,
      },
      activeColumn(),
    ],
    fields: [
      { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
      { name: 'name', kind: 'text', required: true, max: 160 },
      {
        name: 'trigger',
        kind: 'select',
        required: true,
        options: (['AUTOMATIC', 'COUPON'] as const).map((t) => ({
          value: t,
          label: name(`triggers.${t}`),
        })),
        defaultValue: 'COUPON',
      },
      { name: 'couponCode', kind: 'code' },
      {
        name: 'kind',
        kind: 'select',
        required: true,
        options: (['PERCENT', 'FLAT'] as const).map((k) => ({
          value: k,
          label: name(`kinds.${k}`),
        })),
        defaultValue: 'PERCENT',
      },
      { name: 'value', kind: 'money', required: true },
      {
        name: 'scope',
        kind: 'select',
        required: true,
        section: 'covers',
        options: SCOPES.map((s) => ({ value: s, label: name(`scopes.${s}`) })),
        defaultValue: 'ORDER',
      },
      {
        name: 'channels',
        kind: 'multiselect',
        options: CHANNELS.map((c) => ({ value: c, label: name(`channels.${c}`) })),
        defaultValue: [...CHANNELS],
      },
      { name: 'scopeIds', kind: 'multiselect', optionsFrom: targetChoices(name) },
      { name: 'minSubtotal', kind: 'money', section: 'limits' },
      { name: 'maxDiscount', kind: 'money' },
      { name: 'usageLimit', kind: 'number' },
      { name: 'perCustomerLimit', kind: 'number' },
      { name: 'startsAt', kind: 'datetime' },
      { name: 'endsAt', kind: 'datetime' },
      { name: 'firstOrderOnly', kind: 'switch', defaultValue: false },
      { name: 'titleNe', kind: 'text', max: 160, section: 'website' },
      { name: 'titleEn', kind: 'text', max: 160 },
      { name: 'isPublic', kind: 'switch', defaultValue: false },
      { name: 'isActive', kind: 'switch' },
    ],
  };
}
