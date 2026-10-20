import createClient from 'openapi-fetch';

import type { paths } from './schema';

// Client components reach the API through the website's proxy, which adds the session.
export const browserApi = createClient<paths>({
  baseUrl: '/api/proxy',
  credentials: 'same-origin',
});
