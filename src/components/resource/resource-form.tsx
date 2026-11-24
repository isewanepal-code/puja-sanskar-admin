'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Fragment, useEffect, useId, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { ChipInput, SearchSelect } from '@/components/controls';
import { Field as FieldShell } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { BsDatePicker } from '@/components/ui/bs-date-picker';
import { Button } from '@/components/ui/button';
import { useModalDirty, useModalDraft } from '@/components/ui/modal';
import { Input, Switch, Textarea } from '@/components/ui/input';
import { fieldErrors, isApiError, request } from '@/lib/api';
import { useDraft } from '@/lib/use-draft';

import { isAutoField, withAutoCodes } from './auto-fields';
import { schemaFor, toBody, toFormValues, type FormValues } from './form-values';
import { ImageInput, ImagesInput } from './image-inputs';
import { useResourceText, type Translate } from './translate';
import type { Field, Resource } from './types';

const INPUT_TYPE: Partial<Record<Field['kind'], string>> = {
  password: 'password',
  url: 'url',
  time: 'time',
  number: 'number',
};

function Control({
  field,
  id,
  form,
  invalid,
  t,
  record,
  placeholder,
}: {
  field: Field;
  id: string;
  form: UseFormReturn<FormValues>;
  invalid: boolean;
  t: Translate;
  record?: Record<string, unknown>;
  // An example of what to type, so nobody has to guess.
  placeholder?: string;
}) {
  const { register, getValues, setValue } = form;
  const guideText = useTranslations('fieldGuide') as unknown as Translate;
  const common = { id, 'aria-invalid': invalid || undefined, ...register(field.name) };

  const setByPicker = (value: string) =>
    setValue(field.name, value, { shouldDirty: true, shouldValidate: true });

  if (field.kind === 'select' || field.kind === 'multiselect') {
    const multiple = field.kind === 'multiselect';
    const value = form.watch(field.name);
    return (
      <SearchSelect
        id={id}
        source={field.optionsFor ? field.optionsFor(form.watch()) : field.optionsFrom}
        options={field.options?.map((option) => {
          const key = `options.${field.name}.${option.value}`;
          return guideText.has(key) ? { ...option, label: guideText(key) } : option;
        })}
        multiple={multiple}
        value={multiple ? (Array.isArray(value) ? value : []) : String(value ?? '')}
        known={record && field.known ? field.known(record) : undefined}
        invalid={invalid}
        required={field.required}
        placeholder={
          placeholder ?? (field.required ? undefined : t.has('none') ? t('none') : undefined)
        }
        onChange={(next) => setValue(field.name, next, { shouldDirty: true, shouldValidate: true })}
      />
    );
  }

  switch (field.kind) {
    case 'image':
      return (
        <ImageInput id={id} value={String(form.watch(field.name) ?? '')} onChange={setByPicker} />
      );
    case 'images':
      return (
        <ImagesInput
          id={id}
          value={String(form.watch(field.name) ?? '[]')}
          current={() => String(getValues(field.name) ?? '[]')}
          onChange={setByPicker}
        />
      );
    case 'date':
    case 'datetime':
      return (
        <BsDatePicker
          id={id}
          value={String(form.watch(field.name) ?? '')}
          onChange={setByPicker}
          withTime={field.kind === 'datetime'}
          invalid={invalid}
        />
      );
    case 'color': {
      const hex = String(form.watch(field.name) ?? '');
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={t(`fields.${field.name}`)}
            value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ffffff'}
            onChange={(event) => setByPicker(event.target.value)}
            className="h-9 w-14 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1"
          />
          <Input
            maxLength={7}
            className="uppercase"
            placeholder={placeholder}
            autoComplete="off"
            {...common}
          />
        </div>
      );
    }
    case 'tags':
      return (
        <ChipInput
          id={id}
          value={String(form.watch(field.name) ?? '')}
          onChange={setByPicker}
          max={20}
          maxLength={field.name === 'aliases' ? 80 : 40}
          placeholder={placeholder}
          invalid={invalid}
        />
      );
    case 'switch':
      return <Switch label={t(`fields.${field.name}`)} {...register(field.name)} />;
    case 'textarea':
      return <Textarea rows={3} maxLength={field.max} placeholder={placeholder} {...common} />;
    case 'html':
      return (
        <Textarea
          rows={6}
          className="font-mono text-[0.8rem]"
          placeholder={placeholder}
          {...common}
        />
      );
    default:
      return (
        <Input
          type={INPUT_TYPE[field.kind] ?? 'text'}
          maxLength={field.max}
          className={field.kind === 'code' ? 'uppercase' : undefined}
          placeholder={placeholder}
          autoComplete="off"
          {...common}
        />
      );
  }
}

// How much of a search-result title or description is used: past the limit Google cuts it off.
function LengthCounter({ length, max }: { length: number; max: number }) {
  return (
    <p
      className={`mt-1 text-right text-xs tabular-nums ${length > max * 0.95 ? 'text-warning' : 'text-muted-foreground'}`}
    >
      {length}/{max}
    </p>
  );
}

type ResourceFormProps<T> = {
  resource: Resource<T>;
  // Leave out to create one.
  row?: T;
  formId: string;
  // Sent with a new record but not shown: the parent it is created under.
  extraBody?: Record<string, unknown>;
  // What a new record's fields start with.
  defaults?: Record<string, unknown>;
  // The toast after an action that is not a plain create or save.
  successMessage?: string;
  // Given the saved record, so a new one can open its next step.
  onDone: (saved?: unknown) => void;
  onPendingChange?: (pending: boolean) => void;
  // Told what the fields hold as they are typed (a form that shows matching records beside them).
  onValues?: (values: Record<string, unknown>) => void;
};

// The create and edit form of any resource, laid out from its fields.
export function ResourceForm<T>({
  resource,
  row,
  formId,
  extraBody,
  defaults,
  successMessage,
  onDone,
  onPendingChange,
  onValues,
}: ResourceFormProps<T>) {
  const t = useResourceText(resource.key);
  const tf = useTranslations('forms');
  const tc = useTranslations('common');
  const toast = useToast();
  const queryClient = useQueryClient();
  const idBase = useId();
  const mode = row ? 'edit' : 'create';
  // One key for this form's life: sending again after a lost answer replays the first result.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const guide = useTranslations('fieldGuide') as unknown as Translate;
  const inMode = resource.fields.filter((field) =>
    mode === 'create' ? !field.editOnly : !field.createOnly,
  );
  // Codes are made for a new record, not typed.
  const isAuto = (field: Field) =>
    mode === 'create' &&
    field.kind === 'code' &&
    (field.name === 'code' || field.auto !== undefined);
  const fields = inMode.filter((field) => !isAuto(field));
  const autoFields = inMode.filter(isAuto);
  const placeholderOf = (field: Field) =>
    t.has(`placeholders.${field.name}`)
      ? t(`placeholders.${field.name}`)
      : guide.has(`placeholder.${field.name}`)
        ? guide(`placeholder.${field.name}`)
        : guide.has(`kind.${field.kind}`)
          ? guide(`kind.${field.kind}`)
          : undefined;
  const helpOf = (field: Field) =>
    t.has(`help.${field.name}`)
      ? t(`help.${field.name}`)
      : guide.has(`help.${field.name}`)
        ? guide(`help.${field.name}`)
        : undefined;

  // Only the fields on screen are checked: a hidden one (its switch off, another schedule
  // chosen) must not block Save with an error nobody can see.
  const visibleNow = (values: Record<string, unknown>) =>
    fields.filter((field) => !field.showWhen || field.showWhen(values));
  const form = useForm<FormValues>({
    resolver: ((values: FormValues, context: unknown, options: never) =>
      zodResolver(schemaFor(visibleNow(values)))(values, context, options)) as never,
    defaultValues: toFormValues(
      fields,
      row ? (resource.formRow?.(row) ?? (row as Record<string, unknown>)) : defaults,
    ),
  });

  useEffect(() => {
    if (!onValues) return;
    onValues(form.getValues());
    const subscription = form.watch((values) => onValues(values as Record<string, unknown>));
    return () => subscription.unsubscribe();
  }, [form, onValues]);

  // A modal around this form keeps what was typed until Cancel, a confirmed discard, or a save.
  useModalDirty(form.formState.isDirty);

  // A new record's unsent work is kept as a draft in this browser: closing the modal, or the page, by
  // mistake loses nothing. A password is never kept, and an edit has no draft (the saved record is
  // its starting point).
  const draftFields = fields
    .filter((field) => field.kind !== 'password')
    .map((field) => field.name);
  const typedNow = form.watch() as Record<string, unknown>;
  const draftValue: Record<string, unknown> = {};
  for (const name of draftFields) {
    const value = typedNow[name];
    if (value !== undefined && !(value instanceof Blob)) draftValue[name] = value;
  }
  const draft = useDraft<Record<string, unknown>>(
    mode === 'create' && !resource.singleton ? `resource:${resource.key}` : null,
    draftValue,
    form.formState.isDirty,
  );
  useModalDraft(
    mode === 'create' && form.formState.isDirty
      ? { save: draft.saveNow, discard: draft.clear }
      : null,
  );

  // A choice that depends on another field is emptied when that field changes.
  useEffect(() => {
    const subscription = form.watch((_values, { name, type }) => {
      if (!name || !type) return;
      for (const field of fields) {
        if (field.dependsOn === name) {
          form.setValue(field.name, '', { shouldDirty: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, fields]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const fieldBody = withAutoCodes(
        resource.key,
        autoFields,
        values,
        toBody(fields, values, mode),
      );
      const body = resource.shapeBody ? resource.shapeBody(fieldBody) : fieldBody;
      if (resource.singleton) return request(resource.singleton, resource.path, { body });
      return row
        ? request('PATCH', `${resource.path}/${resource.rowId(row)}`, { body })
        : request(resource.submitMethod ?? 'POST', resource.path, {
            body: { ...body, ...extraBody },
            headers: resource.idempotent ? { 'Idempotency-Key': idempotencyKey } : undefined,
          });
    },
    onMutate: () => onPendingChange?.(true),
    onSettled: () => onPendingChange?.(false),
    onSuccess: async (saved) => {
      draft.clear();
      toast.success(successMessage ?? tf(row ? 'saved' : 'created'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [resource.scope ?? resource.key] }),
        // Dropdowns elsewhere may list what just changed.
        queryClient.invalidateQueries({ queryKey: ['options'] }),
      ]);
      onDone(saved);
    },
    onError: (error) => {
      const byField = fieldErrors(error);
      const onScreen = new Set(visibleNow(form.getValues()).map((field) => field.name));
      const elsewhere: string[] = [];
      for (const [name, message] of Object.entries(byField)) {
        if (onScreen.has(name)) form.setError(name, { message });
        else elsewhere.push(message);
      }
      // A message for a field this form does not show would otherwise be lost.
      toast.error(
        elsewhere.length > 0
          ? elsewhere.join(' · ')
          : isApiError(error) && Object.keys(byField).length === 0
            ? error.message
            : tf('failed'),
      );
    },
  });

  const errors = form.formState.errors;
  const held = form.watch() as Record<string, unknown>;
  const shown = fields.filter((field) => !field.showWhen || field.showWhen(held));

  return (
    <form
      id={formId}
      noValidate
      onSubmit={form.handleSubmit(
        (values) => {
          const issue = resource.check?.(values);
          if (issue) {
            form.setError(issue.field, { message: issue.message });
            toast.error(tf('fixFields', { fields: t(`fields.${issue.field}`) }));
            return;
          }
          save.mutate(values);
        },
        // Name what is wrong: in a long form the marked field may be out of sight.
        (invalid) => {
          const names = fields
            .filter((field) => invalid[field.name])
            .map((field) => t(`fields.${field.name}`));
          if (names.length > 0) toast.error(tf('fixFields', { fields: names.join(', ') }));
        },
      )}
      className="grid gap-x-4 gap-y-4 sm:grid-cols-2"
    >
      {draft.found && !form.formState.isDirty ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:col-span-2">
          <p className="text-sm">
            {tc('draftFound', { time: new Date(draft.found.savedAt).toLocaleString() })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                for (const [name, value] of Object.entries(draft.found!.value)) {
                  form.setValue(name as never, value as never, { shouldDirty: true });
                }
                draft.dismiss();
              }}
            >
              {tc('draftContinue')}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={draft.clear}>
              {tc('draftDiscard')}
            </Button>
          </div>
        </div>
      ) : null}
      {shown.map((field) => {
        const id = `${idBase}-${field.name}`;
        const message = errors[field.name]?.message;
        const hint = t.has(`hints.${field.name}`) ? t(`hints.${field.name}`) : undefined;
        return (
          <Fragment key={field.name}>
            {field.section ? (
              <h3 className="mt-2 flex items-center gap-3 text-xs font-semibold tracking-wide text-foreground/70 uppercase after:h-px after:flex-1 after:bg-border sm:col-span-2">
                {t(`sections.${field.section}`)}
              </h3>
            ) : null}
            {field.kind === 'switch' ? (
              <div className="flex items-center sm:col-span-2">
                <Control field={field} id={id} form={form} invalid={!!message} t={t} />
              </div>
            ) : (
              <FieldShell
                label={`${t(`fields.${field.name}`)}${field.required ? '' : ` (${tf('optional')})`}`}
                htmlFor={id}
                hint={hint}
                help={helpOf(field)}
                error={typeof message === 'string' ? message : undefined}
                className={
                  field.wide ||
                  field.kind === 'textarea' ||
                  field.kind === 'html' ||
                  field.kind === 'images' ||
                  field.kind === 'multiselect'
                    ? 'sm:col-span-2'
                    : undefined
                }
              >
                <Control
                  field={field}
                  id={id}
                  form={form}
                  invalid={!!message}
                  t={t}
                  record={row as Record<string, unknown> | undefined}
                  placeholder={placeholderOf(field)}
                />
                {field.after ? field.after(form.watch() as Record<string, unknown>) : null}
                {field.name.startsWith('meta') && field.max ? (
                  <LengthCounter
                    length={String(form.watch(field.name) ?? '').length}
                    max={field.max}
                  />
                ) : null}
              </FieldShell>
            )}
          </Fragment>
        );
      })}
    </form>
  );
}
