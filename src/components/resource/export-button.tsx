'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { download, isApiError } from '@/lib/api';

type ExportButtonProps = {
  path: string;
  query?: Record<string, string | undefined>;
  label?: string;
};

// Saves the API's .xlsx for a list, with the filters on screen.
export function ExportButton({ path, query, label }: ExportButtonProps) {
  const t = useTranslations('spreadsheets');
  const tf = useTranslations('forms');
  const toast = useToast();
  const save = useMutation({
    mutationFn: () => download(path, query),
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  return (
    <Button
      variant="secondary"
      icon="download"
      disabled={save.isPending}
      onClick={() => save.mutate()}
    >
      {save.isPending ? t('preparing') : (label ?? t('download'))}
    </Button>
  );
}
