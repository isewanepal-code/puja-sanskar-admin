'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Field } from '@/components/forms';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request } from '@/lib/api';
import { routes } from '@/lib/routes';

// The API's own rule for a staff password.
const MIN_LENGTH = 12;

type Values = { currentPassword: string; newPassword: string; repeat: string };

export function ChangePasswordModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('password');
  const tf = useTranslations('forms');
  const toast = useToast();
  const router = useRouter();
  const formId = useId();

  const schema = z
    .object({
      currentPassword: z.string().min(1, t('required')),
      newPassword: z
        .string()
        .min(MIN_LENGTH, t('tooShort', { min: MIN_LENGTH }))
        .max(128),
      repeat: z.string(),
    })
    .refine((v) => v.newPassword === v.repeat, { path: ['repeat'], message: t('mismatch') })
    .refine((v) => v.newPassword !== v.currentPassword, {
      path: ['newPassword'],
      message: t('same'),
    });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', repeat: '' },
  });

  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }: Values) =>
      request('POST', '/auth/change-password', { body: { currentPassword, newPassword } }),
    // Changing the password ends every session, this one included.
    onSuccess: async () => {
      toast.success(t('changed'));
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
      router.replace(routes.login());
      router.refresh();
    },
    onError: (error) => {
      if (isApiError(error, 'AUTH_CURRENT_PASSWORD_INVALID')) {
        form.setError('currentPassword', { message: t('wrongCurrent') });
      } else {
        toast.error(isApiError(error) ? error.message : tf('failed'));
      }
    },
  });

  const errors = form.formState.errors;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
      size="sm"
      title={t('title')}
      description={t('note')}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {tf('cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={change.isPending}>
            {change.isPending ? tf('saving') : t('submit')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={form.handleSubmit((values) => change.mutate(values))}
        className="grid gap-4"
      >
        <Field
          label={t('current')}
          htmlFor={`${formId}-current`}
          error={errors.currentPassword?.message}
        >
          <Input
            id={`${formId}-current`}
            type="password"
            autoComplete="current-password"
            {...form.register('currentPassword')}
          />
        </Field>
        <Field label={t('new')} htmlFor={`${formId}-new`} error={errors.newPassword?.message}>
          <Input
            id={`${formId}-new`}
            type="password"
            autoComplete="new-password"
            {...form.register('newPassword')}
          />
        </Field>
        <Field label={t('repeat')} htmlFor={`${formId}-repeat`} error={errors.repeat?.message}>
          <Input
            id={`${formId}-repeat`}
            type="password"
            autoComplete="new-password"
            {...form.register('repeat')}
          />
        </Field>
      </form>
    </Modal>
  );
}
