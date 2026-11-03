import { toApiError } from './errors';

// Posts one file as multipart form data through the session proxy and unwraps the envelope.
export async function upload<T>(
  path: string,
  file: File,
  query: Record<string, string> = {},
): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  const search = new URLSearchParams(query).toString();
  const response = await fetch(`/api/proxy/api/v1${path}${search ? `?${search}` : ''}`, {
    method: 'POST',
    credentials: 'same-origin',
    body,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, payload);
  return (payload as { data: T }).data;
}
