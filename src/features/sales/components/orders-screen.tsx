'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { ResourceScreen, useResourceText } from '@/components/resource';
import { DataTable } from '@/components/ui/data-table';

import {
  CHECKOUT_METHODS,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  ordersResource,
  type Order,
  type OrderFilter,
  type OrderStatus,
} from '../resources';

const FILTERS = [
  ['status', ORDER_STATUSES, 'statuses'],
  ['channel', ORDER_CHANNELS, 'channels'],
  ['checkoutMethod', CHECKOUT_METHODS, 'checkouts'],
] as const;

// status: where a link (a dashboard count) opens the list.
export function OrdersScreen({ status }: { status?: OrderStatus }) {
  const t = useResourceText('orders');
  const to = useTranslations('orders.status');
  const [filter, setFilter] = useState<OrderFilter>({ status });
  const resource = useMemo(() => ordersResource(filter, t), [filter, t]);
  const label = (group: string, value: string) =>
    group === 'statuses' ? to(value as OrderStatus) : t(`${group}.${value}`);

  return (
    <ResourceScreen
      resource={resource}
      toolbar={FILTERS.map(([key, values, group]) => (
        <SearchSelect
          key={key}
          value={filter[key] ?? ''}
          options={values.map((value) => ({ value, label: label(group, value) }))}
          onChange={(value) => setFilter((current) => ({ ...current, [key]: String(value) }))}
          placeholder={t(`filters.${key}`)}
          aria-label={t(`filters.${key}`)}
          className="w-44"
        />
      ))}
    />
  );
}

// A few orders without search or paging, such as those waiting on the dashboard.
export function OrdersPreview({ orders }: { orders: Order[] }) {
  const t = useResourceText('orders');
  const resource = useMemo(() => ordersResource({}, t), [t]);
  return (
    <DataTable
      rows={orders}
      rowKey={resource.rowId}
      columns={resource.columns.map((column) => ({
        ...column,
        header: t(`fields.${column.key}`),
      }))}
    />
  );
}
