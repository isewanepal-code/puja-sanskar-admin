'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Field } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';

type Level = Schema<'PujaGroupLevelResponse'>;

// The API names at most ten levels.
const MAX_LEVELS = 10;

const schema = z.object({
  levels: z
    .array(
      z.object({
        nameNe: z.string().trim().min(1, 'Required').max(80),
        nameEn: z.string().trim().min(1, 'Required').max(80),
      }),
    )
    .max(MAX_LEVELS),
});
type Values = z.infer<typeof schema>;

// The heading of each depth, in order: the first row is level 0.
export function LevelsForm() {
  const t = useTranslations('pujas.levels');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();

  const levels = useQuery({
    queryKey: ['puja-groups', 'levels'],
    queryFn: () => request<Level[]>('GET', '/admin/puja-group-levels'),
  });

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { levels: [] } });
  const rows = useFieldArray({ control: form.control, name: 'levels' });

  useEffect(() => {
    if (levels.data) {
      form.reset({
        levels: levels.data.length
          ? levels.data.map(({ nameNe, nameEn }) => ({ nameNe, nameEn }))
          : [{ nameNe: '', nameEn: '' }],
      });
    }
  }, [levels.data, form]);

  const save = useMutation({
    mutationFn: ({ levels: list }: Values) =>
      request('PUT', '/admin/puja-group-levels', {
        body: { levels: list.map((level, depth) => ({ depth, ...level })) },
      }),
    onSuccess: async () => {
      toast.success(tf('saved'));
      await queryClient.invalidateQueries({ queryKey: ['puja-groups'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const errors = form.formState.errors.levels;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
      className="grid max-w-3xl gap-5"
    >
      <p className="text-sm text-muted-foreground">{t('intro')}</p>
      <ol className="grid gap-4">
        {rows.fields.map((row, depth) => (
          <li key={row.id} className="grid items-start gap-3 sm:grid-cols-[6rem_1fr_1fr_2rem]">
            <span className="pt-8 font-heading font-semibold text-primary">
              {t('depth', { depth })}
            </span>
            <Field
              label={t('nameNe')}
              htmlFor={`level-ne-${depth}`}
              error={errors?.[depth]?.nameNe?.message}
            >
              <Input id={`level-ne-${depth}`} {...form.register(`levels.${depth}.nameNe`)} />
            </Field>
            <Field
              label={t('nameEn')}
              htmlFor={`level-en-${depth}`}
              error={errors?.[depth]?.nameEn?.message}
            >
              <Input id={`level-en-${depth}`} {...form.register(`levels.${depth}.nameEn`)} />
            </Field>
            {depth === rows.fields.length - 1 && depth > 0 ? (
              <IconButton
                icon="trash"
                variant="danger"
                label={t('remove')}
                className="mt-6"
                onClick={() => rows.remove(depth)}
              />
            ) : null}
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        {rows.fields.length < MAX_LEVELS ? (
          <Button
            variant="secondary"
            icon="plus"
            onClick={() => rows.append({ nameNe: '', nameEn: '' })}
          >
            {t('add')}
          </Button>
        ) : null}
        <Button type="submit" disabled={save.isPending || levels.isPending}>
          {save.isPending ? tf('saving') : tf('save')}
        </Button>
      </div>
    </form>
  );
}
