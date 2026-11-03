import 'server-only';

import { unwrap } from '@/lib/api';
import { sessionApi } from '@/lib/api/server';

// Every group as a tree, with the level names and the ritual types.
export async function getCatalogue() {
  return unwrap((await sessionApi()).GET('/api/v1/admin/puja-groups/tree'));
}

export async function getGroup(id: string) {
  const api = await sessionApi();
  return unwrap(api.GET('/api/v1/admin/puja-groups/{id}', { params: { path: { id } } }));
}

export async function listRitualTypes() {
  return unwrap((await sessionApi()).GET('/api/v1/admin/ritual-types'));
}

export async function getRitualType(id: string) {
  const api = await sessionApi();
  return unwrap(api.GET('/api/v1/admin/ritual-types/{id}', { params: { path: { id } } }));
}

export async function getLevels() {
  return unwrap((await sessionApi()).GET('/api/v1/admin/puja-group-levels'));
}
