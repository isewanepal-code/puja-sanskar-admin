import { ApiError, toApiError } from './errors';

type Result<D> = { data?: D; error?: unknown; response: Response };

async function settle<D>(call: Promise<Result<D>>): Promise<Result<D>> {
  try {
    return await call;
  } catch {
    throw new ApiError('Unable to reach the server.', { status: 0, code: 'NETWORK_ERROR' });
  }
}

// The data inside the API's { success, message, data } envelope, or the error as an ApiError.
export async function unwrap<D extends { data: unknown }>(
  call: Promise<Result<D>>,
): Promise<D['data']> {
  const { data, error, response } = await settle(call);
  if (response.ok && data) return data.data;
  throw toApiError(response.status, error);
}

// For answers with no body (204).
export async function unwrapEmpty(call: Promise<Result<unknown>>): Promise<void> {
  const { error, response } = await settle(call);
  if (!response.ok) throw toApiError(response.status, error);
}
