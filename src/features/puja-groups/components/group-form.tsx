'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

import { DeleteButton, Field, FormSection } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { useApiForm } from '@/hooks/use-api-form';
import { browserApi, unwrap, unwrapEmpty, type Schema } from '@/lib/api';
import { checked, required, text, whole } from '@/lib/forms';
import { routes } from '@/lib/routes';

type Group = Schema<'AdminPujaGroupResponse'>;
type RitualTypeOption = { id: string; code: string; nameNe: string };

type GroupFormProps = {
  // Leave out to create one.
  group?: Group;
  // The group it sits under; null for a main group.
  parent: { id: string; code: string; nameNe: string } | null;
  ritualTypes: RitualTypeOption[];
};

// What a create and an edit share; the code and the parent are only ever sent on create.
function readFields(form: FormData) {
  return {
    nameNe: required(form, 'nameNe'),
    nameEn: required(form, 'nameEn'),
    nameRomanized: text(form, 'nameRomanized'),
    ritualTypeId: text(form, 'ritualTypeId'),
    sortOrder: whole(form, 'sortOrder'),
    summaryNe: text(form, 'summaryNe'),
    summaryEn: text(form, 'summaryEn'),
    descriptionNe: text(form, 'descriptionNe'),
    descriptionEn: text(form, 'descriptionEn'),
    imageUrl: text(form, 'imageUrl'),
    metaTitle: text(form, 'metaTitle'),
    metaDescription: text(form, 'metaDescription'),
    isActive: checked(form, 'isActive'),
    ...(text(form, 'slug') && { slug: required(form, 'slug') }),
  };
}

export function GroupForm({ group, parent, ritualTypes }: GroupFormProps) {
  const t = useTranslations('pujas.group');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const { run, pending, errors, error } = useApiForm();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = readFields(form);

    if (group) {
      const saved = await run(() =>
        unwrap(
          browserApi.PATCH('/api/v1/admin/puja-groups/{id}', {
            params: { path: { id: group.id } },
            body: fields,
          }),
        ),
      );
      if (saved) {
        toast(tf('saved'));
        router.refresh();
      }
      return;
    }

    const created = await run(() =>
      unwrap(
        browserApi.POST('/api/v1/admin/puja-groups', {
          body: {
            ...fields,
            ...(parent ? { parentId: parent.id } : { code: required(form, 'code') }),
          },
        }),
      ),
    );
    if (created) {
      router.push(routes.pujaGroups(created.id));
      router.refresh();
    }
  }

  async function onDelete() {
    if (!group) return;
    const done = await run(async () => {
      await unwrapEmpty(
        browserApi.DELETE('/api/v1/admin/puja-groups/{id}', {
          params: { path: { id: group.id } },
        }),
      );
      return true;
    });
    if (done) {
      toast(tf('deleted'));
      router.push(routes.pujaGroups(group.parentId ?? undefined));
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-10" noValidate>
      <FormSection title={t('place')}>
        <p className="text-sm">
          {parent ? t('parent', { name: `[${parent.code}] ${parent.nameNe}` }) : t('top')}
        </p>
        {group ? null : parent ? (
          <p className="text-sm text-muted-foreground">{t('numbered', { code: parent.code })}</p>
        ) : (
          <Field label={t('code')} htmlFor="code" hint={t('codeHint')} error={errors.code}>
            <input
              id="code"
              name="code"
              required
              maxLength={8}
              className="input w-32 uppercase"
              autoComplete="off"
            />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('ritualType')} htmlFor="ritualTypeId" error={errors.ritualTypeId}>
            <select
              id="ritualTypeId"
              name="ritualTypeId"
              defaultValue={group?.ritualTypeId ?? ''}
              className="input"
            >
              <option value="">{t('inherit')}</option>
              {ritualTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.code} · {type.nameNe}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('sortOrder')} htmlFor="sortOrder" error={errors.sortOrder}>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={group?.sortOrder ?? 0}
              className="input w-32"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t('nameNe')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('nameNe')} htmlFor="nameNe" error={errors.nameNe}>
            <input
              id="nameNe"
              name="nameNe"
              required
              defaultValue={group?.nameNe}
              className="input"
            />
          </Field>
          <Field label={t('nameEn')} htmlFor="nameEn" error={errors.nameEn}>
            <input
              id="nameEn"
              name="nameEn"
              required
              defaultValue={group?.nameEn}
              className="input"
            />
          </Field>
          <Field
            label={`${t('nameRomanized')} (${tf('optional')})`}
            htmlFor="nameRomanized"
            error={errors.nameRomanized}
          >
            <input
              id="nameRomanized"
              name="nameRomanized"
              defaultValue={group?.nameRomanized ?? ''}
              className="input"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t('words')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('summaryNe')} htmlFor="summaryNe" error={errors.summaryNe}>
            <textarea
              id="summaryNe"
              name="summaryNe"
              rows={3}
              maxLength={500}
              defaultValue={group?.summaryNe ?? ''}
              className="input py-2"
            />
          </Field>
          <Field label={t('summaryEn')} htmlFor="summaryEn" error={errors.summaryEn}>
            <textarea
              id="summaryEn"
              name="summaryEn"
              rows={3}
              maxLength={500}
              defaultValue={group?.summaryEn ?? ''}
              className="input py-2"
            />
          </Field>
          <Field
            label={t('descriptionNe')}
            htmlFor="descriptionNe"
            hint={t('markdown')}
            error={errors.descriptionNe}
          >
            <textarea
              id="descriptionNe"
              name="descriptionNe"
              rows={6}
              defaultValue={group?.descriptionNe ?? ''}
              className="input py-2 font-mono text-sm"
            />
          </Field>
          <Field
            label={t('descriptionEn')}
            htmlFor="descriptionEn"
            hint={t('markdown')}
            error={errors.descriptionEn}
          >
            <textarea
              id="descriptionEn"
              name="descriptionEn"
              rows={6}
              defaultValue={group?.descriptionEn ?? ''}
              className="input py-2 font-mono text-sm"
            />
          </Field>
          <Field
            label={t('imageUrl')}
            htmlFor="imageUrl"
            error={errors.imageUrl}
            className="sm:col-span-2"
          >
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              defaultValue={group?.imageUrl ?? ''}
              className="input"
              placeholder="https://"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t('seo')}>
        <div className="grid gap-4">
          <Field label={t('slug')} htmlFor="slug" hint={t('slugHint')} error={errors.slug}>
            <input id="slug" name="slug" defaultValue={group?.slug} className="input" />
          </Field>
          <Field label={t('metaTitle')} htmlFor="metaTitle" error={errors.metaTitle}>
            <input
              id="metaTitle"
              name="metaTitle"
              maxLength={70}
              defaultValue={group?.metaTitle ?? ''}
              className="input"
            />
          </Field>
          <Field
            label={t('metaDescription')}
            htmlFor="metaDescription"
            error={errors.metaDescription}
          >
            <textarea
              id="metaDescription"
              name="metaDescription"
              rows={2}
              maxLength={160}
              defaultValue={group?.metaDescription ?? ''}
              className="input py-2"
            />
          </Field>
        </div>
      </FormSection>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={group?.isActive ?? true} />
        {tf('active')}
      </label>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? tf('saving') : group ? tf('save') : tf('create')}
        </button>
        {group ? (
          <DeleteButton
            name={`[${group.code}] ${group.nameNe}`}
            disabled={pending}
            onDelete={onDelete}
          />
        ) : null}
      </div>
    </form>
  );
}
