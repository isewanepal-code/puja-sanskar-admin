'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

import { DeleteButton, Field } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { useApiForm } from '@/hooks/use-api-form';
import { browserApi, unwrap, unwrapEmpty, type Schema } from '@/lib/api';
import { checked, required, whole } from '@/lib/forms';
import { routes } from '@/lib/routes';

type RitualType = Schema<'AdminRitualTypeResponse'>;

export function RitualTypeForm({ ritualType }: { ritualType?: RitualType }) {
  const t = useTranslations('pujas.ritualTypes');
  const tg = useTranslations('pujas.group');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const { run, pending, errors, error } = useApiForm();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = {
      nameNe: required(form, 'nameNe'),
      nameEn: required(form, 'nameEn'),
      sortOrder: whole(form, 'sortOrder'),
      isActive: checked(form, 'isActive'),
    };
    const saved = await run(() =>
      ritualType
        ? unwrap(
            browserApi.PATCH('/api/v1/admin/ritual-types/{id}', {
              params: { path: { id: ritualType.id } },
              body: fields,
            }),
          )
        : unwrap(
            browserApi.POST('/api/v1/admin/ritual-types', {
              body: { ...fields, code: required(form, 'code') },
            }),
          ),
    );
    if (saved) {
      toast.success(tf('saved'));
      router.push(routes.ritualTypes());
      router.refresh();
    }
  }

  async function onDelete() {
    if (!ritualType) return;
    const done = await run(async () => {
      await unwrapEmpty(
        browserApi.DELETE('/api/v1/admin/ritual-types/{id}', {
          params: { path: { id: ritualType.id } },
        }),
      );
      return true;
    });
    if (done) {
      toast.success(tf('deleted'));
      router.push(routes.ritualTypes());
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-6" noValidate>
      {ritualType ? null : (
        <Field label={t('code')} htmlFor="code" hint={t('codeHint')} error={errors.code}>
          <input id="code" name="code" required maxLength={32} className="input w-40 uppercase" />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tg('nameNe')} htmlFor="nameNe" error={errors.nameNe}>
          <input
            id="nameNe"
            name="nameNe"
            required
            defaultValue={ritualType?.nameNe}
            className="input"
          />
        </Field>
        <Field label={tg('nameEn')} htmlFor="nameEn" error={errors.nameEn}>
          <input
            id="nameEn"
            name="nameEn"
            required
            defaultValue={ritualType?.nameEn}
            className="input"
          />
        </Field>
      </div>
      <Field label={tg('sortOrder')} htmlFor="sortOrder" error={errors.sortOrder}>
        <input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={ritualType?.sortOrder ?? 0}
          className="input w-32"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={ritualType?.isActive ?? true} />
        {tf('active')}
      </label>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? tf('saving') : ritualType ? tf('save') : tf('create')}
        </button>
        {ritualType ? (
          <DeleteButton
            name={`${ritualType.code} · ${ritualType.nameNe}`}
            disabled={pending}
            onDelete={onDelete}
          />
        ) : null}
      </div>
    </form>
  );
}
