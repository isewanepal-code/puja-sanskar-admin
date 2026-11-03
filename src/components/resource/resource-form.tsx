'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Fragment, useEffect, useId } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { Field as FieldShell } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { Input, Select, Switch, Textarea } from '@/components/ui/input';
import { fieldErrors, isApiError, request } from '@/lib/api';

import { schemaFor, toBody, toFormValues, type FormValues } from './form-values';
import { ImageInput, ImagesInput } from './image-inputs';
import { useResourceText, type Translate } from './translate';
import type { Field, Resource } from './types';

const INPUT_TYPE: Partial<Record<Field['kind'], string>> = {
  password: 'password',
  url: 'url',
  time: 'time',
  date: 'date',
  datetime: 'datetime-local',
  number: 'number',
};

function Control({
  field,
  id,
  form,
  invalid,
  t,
}: {
  field: Field;
  id: string;
  form: UseFormReturn<FormValues>;
  invalid: boolean;
  t: Translate;
}) {
  const options = useQuery({
    queryKey: ['options', field.optionsFrom?.key],
    queryFn: () => field.optionsFrom!.load(),
    enabled: !!field.optionsFrom,
    staleTime: 5 * 60 * 1000,
  });
  const choices = field.options ?? options.data ?? [];
  const { register, getValues, setValue } = form;

  // A select whose choices arrive after the form starts shows its value once they do.
  useEffect(() => {
    if (options.data) setValue(field.name, getValues(field.name));
  }, [options.data, field.name, getValues, setValue]);
  const common = { id, 'aria-invalid': invalid || undefined, ...register(field.name) };

  const setByPicker = (value: string) =>
    setValue(field.name, value, { shouldDirty: true, shouldValidate: true });

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
    case 'switch':
      return <Switch label={t(`fields.${field.name}`)} {...register(field.name)} />;
    case 'textarea':
      return <Textarea rows={3} maxLength={field.max} {...common} />;
    case 'html':
      return <Textarea rows={6} className="font-mono text-[0.8rem]" {...common} />;
    case 'select':
      return (
        <Select {...common}>
          <option value="">{field.required ? '—' : t.has('none') ? t('none') : '—'}</option>
          {choices.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    case 'multiselect':
      return (
        <div className="grid max-h-48 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
          {choices.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={option.value} {...register(field.name)} />
              {option.label}
            </label>
          ))}
        </div>
      );
    default:
      return (
        <Input
          type={INPUT_TYPE[field.kind] ?? 'text'}
          maxLength={field.max}
          className={field.kind === 'code' ? 'uppercase' : undefined}
          autoComplete="off"
          {...common}
        />
      );
  }
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
  onDone: () => void;
  onPendingChange?: (pending: boolean) => void;
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
}: ResourceFormProps<T>) {
  const t = useResourceText(resource.key);
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const idBase = useId();
  const mode = row ? 'edit' : 'create';
  const fields = resource.fields.filter((field) =>
    mode === 'create' ? !field.editOnly : !field.createOnly,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schemaFor(fields)) as never,
    defaultValues: toFormValues(
      fields,
      row ? (resource.formRow?.(row) ?? (row as Record<string, unknown>)) : defaults,
    ),
  });

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const body = toBody(fields, values, mode);
      return row
        ? request('PATCH', `${resource.path}/${resource.rowId(row)}`, { body })
        : request(resource.submitMethod ?? 'POST', resource.path, {
            body: { ...body, ...extraBody },
          });
    },
    onMutate: () => onPendingChange?.(true),
    onSettled: () => onPendingChange?.(false),
    onSuccess: async () => {
      toast.success(successMessage ?? tf(row ? 'saved' : 'created'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [resource.scope ?? resource.key] }),
        // Dropdowns elsewhere may list what just changed.
        queryClient.invalidateQueries({ queryKey: ['options'] }),
      ]);
      onDone();
    },
    onError: (error) => {
      const byField = fieldErrors(error);
      for (const [name, message] of Object.entries(byField)) {
        form.setError(name, { message });
      }
      toast.error(
        isApiError(error) && Object.keys(byField).length === 0 ? error.message : tf('failed'),
      );
    },
  });

  const errors = form.formState.errors;

  return (
    <form
      id={formId}
      noValidate
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
      className="grid gap-x-4 gap-y-4 sm:grid-cols-2"
    >
      {fields.map((field) => {
        const id = `${idBase}-${field.name}`;
        const message = errors[field.name]?.message;
        const hint = t.has(`hints.${field.name}`) ? t(`hints.${field.name}`) : undefined;
        return (
          <Fragment key={field.name}>
            {field.section ? (
              <h3 className="pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:col-span-2">
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
                <Control field={field} id={id} form={form} invalid={!!message} t={t} />
              </FieldShell>
            )}
          </Fragment>
        );
      })}
    </form>
  );
}
