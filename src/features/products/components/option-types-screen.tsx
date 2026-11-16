'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ActionModal, ConfirmDelete, ResourceScreen, useResourceText } from '@/components/resource';
import { useToast } from '@/components/overlays';
import { Button, IconButton } from '@/components/ui/button';
import { InfoTip } from '@/components/ui/info-tip';
import { Modal } from '@/components/ui/modal';
import { isApiError, request } from '@/lib/api';

import {
  optionTypesResource,
  optionValueResource,
  type OptionType,
  type OptionValue,
} from '../options';

function Swatch({ type, value }: { type: OptionType; value: OptionValue }) {
  if (type.kind === 'COLOR' && value.colorHex) {
    return (
      <span
        className="inline-block size-5 rounded-full border border-border"
        style={{ background: value.colorHex }}
        aria-hidden="true"
      />
    );
  }
  return null;
}

// The values of one kind of difference: add, change, remove.
function OptionValues({ typeId, onClose }: { typeId: string | null; onClose: () => void }) {
  const t = useTranslations('optionValues');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ value?: OptionValue } | null>(null);
  const [removing, setRemoving] = useState<OptionValue | null>(null);
  const type = useQuery({
    queryKey: ['optionTypes', 'one', typeId],
    queryFn: () => request<OptionType>('GET', `/admin/option-types/${typeId}`),
    enabled: typeId !== null,
  });
  const remove = useMutation({
    mutationFn: (value: OptionValue) => request('DELETE', `/admin/option-values/${value.id}`),
    onSuccess: async () => {
      setRemoving(null);
      toast.success(tf('deleted'));
      await queryClient.invalidateQueries({ queryKey: ['optionTypes'] });
    },
    onError: (error) => {
      setRemoving(null);
      toast.error(isApiError(error) ? error.message : tf('failed'));
    },
  });

  const data = type.data;
  return (
    <>
      <Modal
        open={typeId !== null}
        onOpenChange={(open) => (open ? undefined : onClose())}
        size="lg"
        title={t('title', { name: data?.nameEn ?? '' })}
        description={t('note')}
      >
        <div className="mb-4 flex justify-end">
          <Button icon="plus" onClick={() => setForm({})}>
            {t('add')}
          </Button>
        </div>
        {data && data.values.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="grid max-h-[55vh] gap-1 overflow-y-auto">
            {(data?.values ?? []).map((value) => (
              <li
                key={value.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                {data ? <Swatch type={data} value={value} /> : null}
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{value.valueEn}</span>
                  <span className="ml-2 text-muted-foreground">{value.valueNe}</span>
                  {value.numberValue ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {Number(value.numberValue)} {data?.unitSymbol}
                    </span>
                  ) : null}
                </span>
                <IconButton icon="edit" label={t('edit')} onClick={() => setForm({ value })} />
                <IconButton icon="trash" label={t('remove')} onClick={() => setRemoving(value)} />
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <ActionModal
        resource={form && data ? optionValueResource(data, form.value) : null}
        defaults={form?.value as unknown as Record<string, unknown> | undefined}
        size="sm"
        title={form?.value ? t('editTitle') : t('addTitle')}
        submitLabel={tf('save')}
        doneMessage={t('saved')}
        onClose={() => setForm(null)}
      />
      <ConfirmDelete
        name={removing?.valueEn ?? null}
        pending={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </>
  );
}

export function OptionTypesScreen() {
  const t = useResourceText('optionTypes');
  const tv = useTranslations('optionValues');
  const resource = useMemo(() => optionTypesResource(t), [t]);
  const [open, setOpen] = useState<string | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const defaults = useMutation({
    mutationFn: () => request('POST', '/admin/option-types/defaults'),
    onSuccess: async () => {
      toast.success(tv('defaultsDone'));
      await queryClient.invalidateQueries({ queryKey: ['optionTypes'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : 'Failed'),
  });
  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <span className="inline-flex items-center gap-1.5">
            <Button
              variant="secondary"
              icon="palette"
              disabled={defaults.isPending}
              onClick={() => defaults.mutate()}
            >
              {tv('defaults')}
            </Button>
            <InfoTip text={tv('defaultsNote')} align="right" />
          </span>
        }
        rowActions={(row) => (
          <IconButton icon="list" label={tv('open')} onClick={() => setOpen(row.id)} />
        )}
      />
      <OptionValues typeId={open} onClose={() => setOpen(null)} />
    </>
  );
}
