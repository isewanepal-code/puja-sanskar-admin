import { notFound } from 'next/navigation';

import { isApiError } from './errors';

// A record page whose id the API does not know (or cannot read as an id) is a 404.
export async function found<T>(load: Promise<T>): Promise<T> {
  try {
    return await load;
  } catch (error) {
    if (isApiError(error) && [400, 404].includes(error.status)) notFound();
    throw error;
  }
}
