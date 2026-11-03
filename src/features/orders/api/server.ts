import 'server-only';

import { unwrap, type Schema } from '@/lib/api';
import { sessionApi } from '@/lib/api/server';

export type OrderStatus = Schema<'AdminOrderResponse'>['status'];

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'READY_FOR_PICKUP',
  'COMPLETED',
  'CANCELLED',
];

export const isOrderStatus = (value: string | undefined): value is OrderStatus =>
  ORDER_STATUSES.includes(value as OrderStatus);

export type OrderFilters = { page: number; status?: OrderStatus; q?: string };

export async function listOrders({ page, status, q }: OrderFilters, limit = 20) {
  const api = await sessionApi();
  return unwrap(api.GET('/api/v1/admin/orders', { params: { query: { page, limit, status, q } } }));
}

export async function getOrder(id: string) {
  const api = await sessionApi();
  return unwrap(api.GET('/api/v1/admin/orders/{id}', { params: { path: { id } } }));
}
