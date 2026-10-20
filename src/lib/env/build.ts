import { z } from 'zod';

// Read by next.config at build time, where server-only modules cannot load.
const buildEnvSchema = z.object({
  // Where the API serves uploaded images (STORAGE_PUBLIC_URL there).
  MEDIA_URL: z.url().default('http://localhost:3000/media'),
});

export const buildEnv = buildEnvSchema.parse({
  MEDIA_URL: process.env.MEDIA_URL,
});
