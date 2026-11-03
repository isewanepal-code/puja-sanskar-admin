'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Thumb } from '@/components/media-library/thumb';
import { useToast } from '@/components/overlays';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request } from '@/lib/api';
import { choices } from '@/lib/choices';

import type { ListRequest } from '../resources';

type Row = { writtenText: string; variantId: string; quantity: string; note: string };

const blank = (): Row => ({ writtenText: '', variantId: '', quantity: '1', note: '' });

// The customer's photos beside the list staff read off them; the list sent replaces the old one.
export function ListItemsEditor({
  request: list,
  onSaved,
}: {
  request: ListRequest;
  onSaved: () => void;
}) {
  const t = useTranslations('listPhotos');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() =>
    list.items.length > 0
      ? list.items.map((item) => ({
          writtenText: item.writtenText ?? '',
          variantId: item.pack?.variantId ?? '',
          quantity: String(item.quantity),
          note: item.note ?? '',
        }))
      : [blank(), blank(), blank()],
  );
  const set = (i: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const save = useMutation({
    mutationFn: () =>
      request('PUT', `/admin/list-requests/${list.id}/items`, {
        body: {
          items: rows
            .filter((row) => row.writtenText.trim() || row.variantId)
            .map((row) => ({
              writtenText: row.writtenText.trim() || null,
              variantId: row.variantId || null,
              quantity: Math.min(99, Math.max(1, Number(row.quantity) || 1)),
              note: row.note.trim() || null,
            })),
        },
      }),
    onSuccess: async () => {
      toast.success(tf('saved'));
      await queryClient.invalidateQueries({ queryKey: ['listRequests'] });
      onSaved();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <div className="grid gap-5">
      <div className="flex gap-3 overflow-x-auto">
        {list.photos.map((photo, i) => (
          <a
            key={photo.large}
            href={photo.large}
            target="_blank"
            rel="noreferrer"
            title={t('openPhoto')}
          >
            <Thumb
              src={photo.thumb}
              alt={t('photo', { n: i + 1 })}
              size={160}
              className="size-40"
            />
          </a>
        ))}
      </div>
      {list.note ? <p className="text-sm text-muted-foreground">{list.note}</p> : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground uppercase">
            <th className="py-1 font-medium">{t('written')}</th>
            <th className="py-1 font-medium">{t('pack')}</th>
            <th className="w-20 py-1 font-medium">{t('quantity')}</th>
            <th className="py-1 font-medium">{t('note')}</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="py-1 pr-2">
                <Input
                  value={row.writtenText}
                  maxLength={160}
                  aria-label={t('written')}
                  onChange={(e) => set(i, { writtenText: e.target.value })}
                />
              </td>
              <td className="py-1 pr-2">
                <SearchSelect
                  source={choices.packs}
                  value={row.variantId}
                  aria-label={t('pack')}
                  placeholder={t('notSold')}
                  onChange={(value) => set(i, { variantId: String(value) })}
                />
              </td>
              <td className="py-1 pr-2">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={row.quantity}
                  aria-label={t('quantity')}
                  onChange={(e) => set(i, { quantity: e.target.value })}
                />
              </td>
              <td className="py-1 pr-2">
                <Input
                  value={row.note}
                  maxLength={200}
                  aria-label={t('note')}
                  onChange={(e) => set(i, { note: e.target.value })}
                />
              </td>
              <td className="py-1 text-right">
                <IconButton
                  icon="trash"
                  variant="danger"
                  label={t('remove')}
                  onClick={() => setRows((current) => current.filter((_, j) => j !== i))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          icon="plus"
          onClick={() => setRows((current) => [...current, blank()])}
        >
          {t('addRow')}
        </Button>
        <Button className="ml-auto" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? tf('saving') : tf('save')}
        </Button>
      </div>
    </div>
  );
}
