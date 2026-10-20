import 'server-only';

import { z } from 'zod';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // The API's origin; only the server talks to it.
  API_URL: z.url().default('http://localhost:3000'),
});

export const serverEnv = serverEnvSchema.parse(process.env);
