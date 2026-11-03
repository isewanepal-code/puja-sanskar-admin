'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { fieldErrors, isApiError } from '@/lib/api';

// One way to send a form: pending state, the API's field errors, and one message for the rest.
export function useApiForm() {
  const t = useTranslations('forms');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function run<T>(call: () => Promise<T>): Promise<T | undefined> {
    setPending(true);
    setErrors({});
    setError(null);
    try {
      return await call();
    } catch (failure) {
      const fields = fieldErrors(failure);
      setErrors(fields);
      // Staff read the API's own message; a validation error points at its fields instead.
      setError(
        isApiError(failure) && Object.keys(fields).length === 0 ? failure.message : t('failed'),
      );
      return undefined;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, errors, error };
}
