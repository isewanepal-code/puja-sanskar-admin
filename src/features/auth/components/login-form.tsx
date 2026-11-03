'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Field } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { routes } from '@/lib/routes';

// API codes a sign-in can fail with, and the message each one shows.
const MESSAGE_KEY = {
  AUTH_ACCOUNT_LOCKED: 'locked',
  AUTH_CAPTCHA_REQUIRED: 'captcha',
  AUTH_ACCOUNT_DISABLED: 'disabled',
} as const;

const isKnown = (code: string | undefined): code is keyof typeof MESSAGE_KEY =>
  !!code && code in MESSAGE_KEY;

type Values = { email: string; password: string };

export function LoginForm() {
  const t = useTranslations('login');
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(
      z.object({
        email: z.email(t('emailInvalid')),
        password: z.string().min(1, t('passwordRequired')),
      }),
    ),
    defaultValues: { email: '', password: '' },
  });

  async function signIn(values: Values) {
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
    }
  }

  const errors = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit(signIn)}
      noValidate
      className="grid w-full max-w-sm gap-5 rounded-lg bg-card p-8 shadow-sm ring-1 ring-border"
    >
      <div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
      </div>
      <Field label={t('email')} htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="username" {...form.register('email')} />
      </Field>
      <Field label={t('password')} htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
