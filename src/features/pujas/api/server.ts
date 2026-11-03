import 'server-only';

import { unwrap } from '@/lib/api';
import { sessionApi } from '@/lib/api/server';

export type PujaFilters = { page?: number; q?: string; groupId?: string; limit?: number };

export async function listPujas({ page = 1, q, groupId, limit = 20 }: PujaFilters = {}) {
  const api = await sessionApi();
  return unwrap(api.GET('/api/v1/admin/pujas', { params: { query: { page, limit, q, groupId } } }));
}

export async function getPuja(id: string) {
  const api = await sessionApi();
  return unwrap(api.GET('/api/v1/admin/pujas/{id}', { params: { path: { id } } }));
}
