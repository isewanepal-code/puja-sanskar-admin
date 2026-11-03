'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Field } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { useApiForm } from '@/hooks/use-api-form';
import { browserApi, unwrap, type Schema } from '@/lib/api';
import { required } from '@/lib/forms';

type Level = Schema<'PujaGroupLevelResponse'>;

// The API allows ten levels; the form follows.
const MAX_LEVELS = 10;

export function LevelsForm({ levels }: { levels: Level[] }) {
  const t = useTranslations('pujas.levels');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const { run, pending, error } = useApiForm();
  const [count, setCount] = useState(Math.max(levels.length, 1));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      levels: Array.from({ length: count }, (_, depth) => ({
        depth,
        nameNe: required(form, `nameNe-${depth}`),
        nameEn: required(form, `nameEn-${depth}`),
      })),
    };
    if (await run(() => unwrap(browserApi.PUT('/api/v1/admin/puja-group-levels', { body })))) {
      toast.success(tf('saved'));
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6" noValidate>
      <p className="text-sm text-muted-foreground">{t('intro')}</p>
      <ol className="grid gap-5">
        {Array.from({ length: count }, (_, depth) => {
          const level = levels.find((l) => l.depth === depth);
          return (
            <li key={depth} className="grid gap-3 sm:grid-cols-[7rem_1fr_1fr] sm:items-end">
              <span className="font-heading font-semibold text-primary sm:pb-2.5">
                {t('depth', { depth })}
              </span>
              <Field label={t('nameNe')} htmlFor={`nameNe-${depth}`}>
                <input
                  id={`nameNe-${depth}`}
                  name={`nameNe-${depth}`}
                  required
                  defaultValue={level?.nameNe}
                  className="input"
                />
              </Field>
              <Field label={t('nameEn')} htmlFor={`nameEn-${depth}`}>
                <input
                  id={`nameEn-${depth}`}
                  name={`nameEn-${depth}`}
                  required
                  defaultValue={level?.nameEn}
                  className="input"
                />
              </Field>
            </li>
          );
        })}
      </ol>
      <div className="flex gap-4 text-sm">
        {count < MAX_LEVELS ? (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setCount(count + 1)}
          >
            {t('add')}
          </button>
        ) : null}
        {count > 1 ? (
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={() => setCount(count - 1)}
          >
            {t('remove')}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? tf('saving') : tf('save')}
        </button>
      </div>
    </form>
  );
}
