import { z } from 'zod';

import { ApiError } from './errors';
import { apiErrorResponseSchema } from './schemas';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const apiEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  errors: z.unknown().optional(),
});

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

type ApiClientOptions<T extends z.ZodType> = RequestOptions & {
  schema: T;
};

export async function apiClient<T extends z.ZodType>(
  path: string,
  options: ApiClientOptions<T>,
): Promise<z.output<T>> {
  const { body, headers, schema, ...requestInit } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let rawPayload: unknown;

  try {
    rawPayload = await response.json();
  } catch {
    throw new ApiError('The server returned an invalid response.', {
      status: response.status,
    });
  }

  const envelopeResult = apiEnvelopeSchema.safeParse(rawPayload);

  if (!envelopeResult.success) {
    throw new ApiError('The server returned an invalid response.', {
      status: response.status,
      details: envelopeResult.error.issues,
    });
  }

  const payload = envelopeResult.data;

  if (payload.success === false) {
    const errorResult = apiErrorResponseSchema.safeParse(rawPayload);

    if (errorResult.success) {
      throw new ApiError(errorResult.data.message, {
        status: response.status,
        code: errorResult.data.error,
        details: errorResult.data.errors,
      });
    }

    throw new ApiError(payload.message, {
      status: response.status,
    });
  }

  if (!response.ok) {
    throw new ApiError('The request failed.', {
      status: response.status,
    });
  }

  const dataResult = schema.safeParse(payload.data);

  if (!dataResult.success) {
    throw new ApiError('The server returned invalid data.', {
      status: response.status,
      details: dataResult.error.issues,
    });
  }

  return dataResult.data;
}
