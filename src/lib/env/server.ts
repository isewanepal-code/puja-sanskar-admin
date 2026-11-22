import 'server-only';

import { z } from 'zod';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // The API's origin; only the server talks to it.
  API_URL: z.url().default('http://localhost:3000'),
  // A staging server: always in test mode, with no Staging/Production switch to flip by mistake.
  TEST_MODE_ALWAYS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const serverEnv = serverEnvSchema.parse(process.env);
