import 'server-only';

import { unwrap, type Schema } from '@/lib/api';
import { sessionApi } from '@/lib/api/server';

type OrderStatus = Schema<'AdminOrderResponse'>['status'];

type OrderFilters = { page: number; status?: OrderStatus; q?: string };

export async function listOrders({ page, status, q }: OrderFilters, limit = 20) {
  const api = await sessionApi();
  return unwrap(api.GET('/api/v1/admin/orders', { params: { query: { page, limit, status, q } } }));
}

export async function getOrder(id: string) {
  const api = await sessionApi();
  return unwrap(api.GET('/api/v1/admin/orders/{id}', { params: { path: { id } } }));
}
