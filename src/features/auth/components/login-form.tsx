'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { routes } from '@/lib/routes';

// API codes a sign-in can fail with, and the message each one shows.
const MESSAGE_KEY = {
  AUTH_ACCOUNT_LOCKED: 'locked',
  AUTH_CAPTCHA_REQUIRED: 'captcha',
  AUTH_ACCOUNT_DISABLED: 'disabled',
} as const;

const isKnown = (code: string | undefined): code is keyof typeof MESSAGE_KEY =>
  !!code && code in MESSAGE_KEY;

export function LoginForm() {
  const t = useTranslations('login');
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { code?: string };
        } | null;
        const code = body?.error?.code;
        setError(t(isKnown(code) ? MESSAGE_KEY[code] : 'failed'));
        return;
      }
      const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : routes.dashboard();
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError(t('network'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel grid w-full max-w-sm gap-4" noValidate>
      <div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
      </div>
      <div className="field">
        <label htmlFor="email">{t('email')}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="input"
        />
      </div>
      <div className="field">
        <label htmlFor="password">{t('password')}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
