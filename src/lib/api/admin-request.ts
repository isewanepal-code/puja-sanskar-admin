import { ApiError, toApiError } from './errors';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type Query = Record<string, string | number | boolean | undefined | null>;

// Any admin endpoint from the browser, through the proxy that holds the session.
// Paths are the API's own, without /api/v1: request('PATCH', `/admin/units/${id}`, body).
export async function request<T>(
  method: Method,
  path: string,
  { body, query }: { body?: unknown; query?: Query } = {},
): Promise<T> {
  const search = new URLSearchParams(
    Object.entries(query ?? {})
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)]),
  ).toString();

  let response: Response;
  try {
    response = await fetch(`/api/proxy/api/v1${path}${search ? `?${search}` : ''}`, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Unable to reach the server.', { status: 0, code: 'NETWORK_ERROR' });
  }

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, payload);
  return (payload as { data: T }).data;
}
