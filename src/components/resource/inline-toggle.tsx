'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { isApiError, request } from '@/lib/api';
import { cn } from '@/lib/utils';

type InlineToggleProps = {
  // The record's own path and the switch field it changes.
  path: string;
  field: string;
  on: boolean;
  label: string;
  // The list it refreshes.
  scope: string;
  disabled?: boolean;
};

// An on/off field changed straight from the list, without opening the form.
export function InlineToggle({ path, field, on, label, scope, disabled }: InlineToggleProps) {
  const tf = useTranslations('forms');
  const tt = useTranslations('table');
  const toast = useToast();
  const queryClient = useQueryClient();
  // Shown at once; put back if the API refuses.
  const [shown, setShown] = useState<boolean | null>(null);
  const value = shown ?? on;

  const save = useMutation({
    mutationFn: (next: boolean) => request('PATCH', path, { body: { [field]: next } }),
    onMutate: (next) => setShown(next),
    onSuccess: async (_, next) => {
      toast.success(next ? tt('turnedOn', { name: label }) : tt('turnedOff', { name: label }));
      await queryClient.invalidateQueries({ queryKey: [scope] });
      setShown(null);
    },
    onError: (error) => {
      setShown(null);
      toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled || save.isPending}
      onClick={(event) => {
        event.stopPropagation();
        save.mutate(!value);
      }}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-60',
        value ? 'bg-success' : 'bg-border',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow transition-transform',
          value && 'translate-x-4',
        )}
      />
    </button>
  );
}
