import { toApiError } from './errors';

// Saves a file the API sends (an export) under the name it gives, through the session proxy.
export async function download(path: string, query: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] => !!entry[1]),
  ).toString();
  const response = await fetch(`/api/proxy/api/v1${path}${search ? `?${search}` : ''}`, {
    credentials: 'same-origin',
  });
  if (!response.ok) throw toApiError(response.status, await response.json().catch(() => null));
  const name =
    /filename="?([^";]+)"?/.exec(response.headers.get('content-disposition') ?? '')?.[1] ??
    'export';
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
