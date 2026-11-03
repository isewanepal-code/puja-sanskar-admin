import 'server-only';

import { unwrap } from '@/lib/api';
import { sessionApi } from '@/lib/api/server';

// Sales, collections and order counts for the current fiscal year so far.
export async function getSummary() {
  return unwrap((await sessionApi()).GET('/api/v1/admin/reports/summary'));
}
