'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

import { DeleteButton, Field, FormSection } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { useApiForm } from '@/hooks/use-api-form';
import { browserApi, unwrap, unwrapEmpty } from '@/lib/api';
import { checked, required, text } from '@/lib/forms';
import { routes } from '@/lib/routes';

import { PUJA_KINDS, type Puja, type PujaKind } from '../types';

type GroupChoice = { id: string; label: string; depth: number };

type PujaFormProps = {
  // Leave out to create one.
  puja?: Puja;
  groups: GroupChoice[];
  // The group a new puja starts in, when it was added from the tree.
  groupId?: string;
};

function readFields(form: FormData) {
  return {
    nameNe: required(form, 'nameNe'),
    nameEn: required(form, 'nameEn'),
    nameRomanized: text(form, 'nameRomanized'),
    type: required(form, 'type') as PujaKind,
    groupId: text(form, 'groupId'),
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

export function PujaForm({ puja, groups, groupId }: PujaFormProps) {
  const t = useTranslations('pujas.puja');
  const tg = useTranslations('pujas.group');
  const tk = useTranslations('pujas.types');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const { run, pending, errors, error } = useApiForm();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = readFields(form);

    if (puja) {
      const saved = await run(() =>
        unwrap(
          browserApi.PATCH('/api/v1/admin/pujas/{id}', {
            params: { path: { id: puja.id } },
            body: fields,
          }),
        ),
      );
      if (saved) {
        toast.success(tf('saved'));
        router.refresh();
      }
      return;
    }

    const created = await run(() =>
      unwrap(
        browserApi.POST('/api/v1/admin/pujas', {
          body: { ...fields, code: required(form, 'code') },
        }),
      ),
    );
    if (created) {
      router.push(routes.puja(created.id));
      router.refresh();
    }
  }

  async function onDelete() {
    if (!puja) return;
    const done = await run(async () => {
      await unwrapEmpty(
        browserApi.DELETE('/api/v1/admin/pujas/{id}', { params: { path: { id: puja.id } } }),
      );
      return true;
    });
    if (done) {
      toast.success(tf('deleted'));
      router.push(routes.pujas());
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-10" noValidate>
      <FormSection title={tg('place')}>
        <div className="grid gap-4 sm:grid-cols-2">
          {puja ? null : (
            <Field label={t('code')} htmlFor="code" hint={t('codeHint')} error={errors.code}>
              <input
                id="code"
                name="code"
                required
                maxLength={32}
                className="input w-40 uppercase"
                autoComplete="off"
              />
            </Field>
          )}
          <Field label={t('group')} htmlFor="groupId" error={errors.groupId}>
            <select
              id="groupId"
              name="groupId"
              defaultValue={puja?.groupId ?? groupId ?? ''}
              className="input"
            >
              <option value="">{t('noGroup')}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {' '.repeat(group.depth * 3)}
                  {group.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('type')} htmlFor="type" error={errors.type}>
            <select id="type" name="type" defaultValue={puja?.type ?? 'PUJA'} className="input">
              {PUJA_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {tk(kind)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection title={tg('nameNe')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tg('nameNe')} htmlFor="nameNe" error={errors.nameNe}>
            <input
              id="nameNe"
              name="nameNe"
              required
              defaultValue={puja?.nameNe}
              className="input"
            />
          </Field>
          <Field label={tg('nameEn')} htmlFor="nameEn" error={errors.nameEn}>
            <input
              id="nameEn"
              name="nameEn"
              required
              defaultValue={puja?.nameEn}
              className="input"
            />
          </Field>
          <Field
            label={`${tg('nameRomanized')} (${tf('optional')})`}
            htmlFor="nameRomanized"
            error={errors.nameRomanized}
          >
            <input
              id="nameRomanized"
              name="nameRomanized"
              defaultValue={puja?.nameRomanized ?? ''}
              className="input"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={tg('words')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tg('summaryNe')} htmlFor="summaryNe" error={errors.summaryNe}>
            <textarea
              id="summaryNe"
              name="summaryNe"
              rows={3}
              maxLength={500}
              defaultValue={puja?.summaryNe ?? ''}
              className="input py-2"
            />
          </Field>
          <Field label={tg('summaryEn')} htmlFor="summaryEn" error={errors.summaryEn}>
            <textarea
              id="summaryEn"
              name="summaryEn"
              rows={3}
              maxLength={500}
              defaultValue={puja?.summaryEn ?? ''}
              className="input py-2"
            />
          </Field>
          <Field
            label={tg('descriptionNe')}
            htmlFor="descriptionNe"
            hint={tg('markdown')}
            error={errors.descriptionNe}
          >
            <textarea
              id="descriptionNe"
              name="descriptionNe"
              rows={6}
              defaultValue={puja?.descriptionNe ?? ''}
              className="input py-2 font-mono text-sm"
            />
          </Field>
          <Field
            label={tg('descriptionEn')}
            htmlFor="descriptionEn"
            hint={tg('markdown')}
            error={errors.descriptionEn}
          >
            <textarea
              id="descriptionEn"
              name="descriptionEn"
              rows={6}
              defaultValue={puja?.descriptionEn ?? ''}
              className="input py-2 font-mono text-sm"
            />
          </Field>
          <Field
            label={tg('imageUrl')}
            htmlFor="imageUrl"
            error={errors.imageUrl}
            className="sm:col-span-2"
          >
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              defaultValue={puja?.imageUrl ?? ''}
              className="input"
              placeholder="https://"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={tg('seo')}>
        <div className="grid gap-4">
          <Field label={tg('slug')} htmlFor="slug" hint={tg('slugHint')} error={errors.slug}>
            <input id="slug" name="slug" defaultValue={puja?.slug} className="input" />
          </Field>
          <Field label={tg('metaTitle')} htmlFor="metaTitle" error={errors.metaTitle}>
            <input
              id="metaTitle"
              name="metaTitle"
              maxLength={70}
              defaultValue={puja?.metaTitle ?? ''}
              className="input"
            />
          </Field>
          <Field
            label={tg('metaDescription')}
            htmlFor="metaDescription"
            error={errors.metaDescription}
          >
            <textarea
              id="metaDescription"
              name="metaDescription"
              rows={2}
              maxLength={160}
              defaultValue={puja?.metaDescription ?? ''}
              className="input py-2"
            />
          </Field>
        </div>
      </FormSection>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={puja?.isActive ?? true} />
        {tf('active')}
      </label>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? tf('saving') : puja ? tf('save') : tf('create')}
        </button>
        {puja ? (
          <DeleteButton
            name={`[${puja.code}] ${puja.nameNe}`}
            disabled={pending}
            onDelete={onDelete}
          />
        ) : null}
      </div>
    </form>
  );
}
