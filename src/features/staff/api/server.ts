import 'server-only';

import { cache } from 'react';

import { unwrap } from '@/lib/api';
import { sessionApi } from '@/lib/api/server';

// The signed-in staff member with their roles and permissions; one call per request.
export const getMe = cache(async () => unwrap((await sessionApi()).GET('/api/v1/auth/me')));
