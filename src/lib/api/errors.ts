import { z } from 'zod';

const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.object({ code: z.string(), details: z.array(z.unknown()) }),
  requestId: z.string().optional(),
});

export type ApiErrorOptions = {
  status: number;
  code: string;
  details?: unknown[];
  requestId?: string;
};

// Shown by its code: messages for shoppers come from errors.<CODE>, never from the API's English.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown[];
  readonly requestId?: string;

  constructor(message: string, { status, code, details = [], requestId }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export const isApiError = (error: unknown, ...codes: string[]): error is ApiError =>
  error instanceof ApiError && (codes.length === 0 || codes.includes(error.code));

export function toApiError(status: number, body: unknown): ApiError {
  const parsed = errorEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return new ApiError('The server returned an unexpected answer.', {
      status,
      code: status === 0 ? 'NETWORK_ERROR' : 'INVALID_RESPONSE',
    });
  }
  const { message, error, requestId } = parsed.data;
  return new ApiError(message, { status, code: error.code, details: error.details, requestId });
}

// A renamed catalogue page answers 301 with the new slug in the details.
export function movedSlug(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 301) return null;
  const [first] = error.details;
  return z.object({ slug: z.string() }).safeParse(first).data?.slug ?? null;
}

// VALIDATION_ERROR details, as the field names the form uses.
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error, 'VALIDATION_ERROR')) return {};
  const fields = z
    .array(z.object({ field: z.string(), message: z.string() }))
    .safeParse(error.details);
  return Object.fromEntries((fields.data ?? []).map((f) => [f.field, f.message]));
}
