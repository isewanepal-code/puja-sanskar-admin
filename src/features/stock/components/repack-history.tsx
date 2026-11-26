'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatDate } from '@/lib/format';

import type { RepackPrefill } from './repack-form';

type Level = Schema<'StockLevelResponse'>;
type Pack = { variantId: string; label: string; quantity: number; undone?: boolean };
export type Made = {
  reference: string;
  createdAt: string;
  note: string | null;
  undone: boolean;
  source: Pack | null;
  outputs: Pack[];
};

// Packet-making that touched this size, newest first. A wrong count is put back here (what was opened
// returns, what was made leaves) and then made again right: that is how it is edited.
export function RepackHistory({
  level,
  onClose,
  onEdit,
}: {
  level: Level;
  onClose: () => void;
  // After everything of one packet-making is put back: the form to make it again, with its numbers.
  onEdit: (source: Level, prefill: RepackPrefill) => void;
}) {
  const t = useTranslations('repackHistory');
  const locale = useLocale() as 'en' | 'ne';
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['stock', 'repacks', level.variant.id, level.branch.code],
    queryFn: () =>
      request<Made[]>('GET', `/admin/stock-repacks?variantId=${level.variant.id}`, {
        headers: { 'X-Branch': level.branch.code },
      }),
  });
  const undo = useMutation({
    mutationFn: ({ reference, variantId }: { reference: string; variantId?: string }) =>
      request('POST', `/admin/stock-repacks/${encodeURIComponent(reference)}/undo`, {
        headers: { 'X-Branch': level.branch.code },
        query: variantId ? { variantId } : undefined,
      }),
    onSuccess: async () => {
      toast.success(t('done'));
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : t('failed')),
  });
  const amount = (n: number) => String(Math.round(n * 1000) / 1000);

  return (
    <Modal
      open
      onOpenChange={(next) => (next ? undefined : onClose())}
      size="lg"
      title={t('title', { name: level.variant.label })}
    >
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t('note')}</p>
        {list.isPending ? <p className="text-sm text-muted-foreground">…</p> : null}
        {list.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('none')}</p>
        ) : null}
        {(list.data ?? []).map((made) => (
          <div
            key={made.reference}
            className={`grid gap-1 rounded-lg border border-border p-3 text-sm ${made.undone ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDate(made.createdAt, locale)}
              </span>
              {made.undone ? (
                <span className="text-xs font-medium text-muted-foreground">{t('wasUndone')}</span>
              ) : (
                <div className="flex gap-2">
                  {made.outputs.length > 1 ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={undo.isPending}
                      onClick={() => undo.mutate({ reference: made.reference })}
                    >
                      {t('undoAll')}
                    </Button>
                  ) : null}
                  {made.source ? (
                    <Button
                      size="sm"
                      variant="primary"
                      title={t('editNote')}
                      disabled={undo.isPending}
                      onClick={() => editMade(level, made, locale, onEdit)}
                    >
                      {t('editAll')}
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
            {made.source ? (
              <p>
                {t('opened', { count: amount(made.source.quantity), label: made.source.label })}
              </p>
            ) : null}
            <p>{t('made')}</p>
            <ul className="grid gap-1">
              {made.outputs.map((o) => (
                <li
                  key={o.variantId}
                  className={`flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1 ${o.undone ? 'opacity-60' : ''}`}
                >
                  <span>
                    {amount(o.quantity)} × {o.label}
                  </span>
                  {o.undone ? (
                    <span className="text-xs text-muted-foreground">{t('wasUndone')}</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={undo.isPending}
                      onClick={() =>
                        undo.mutate({ reference: made.reference, variantId: o.variantId })
                      }
                    >
                      {t('undoSize')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {made.note ? <p className="text-xs text-muted-foreground">{made.note}</p> : null}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// The form to change packets already made: their numbers are filled in, and saving puts the old ones back
// and makes the new ones in one go.
export async function editMade(
  level: Level,
  made: Made,
  locale: 'en' | 'ne',
  onEdit: (source: Level, prefill: RepackPrefill) => void,
) {
  const source = await request<Level>('GET', `/admin/stock-levels/${made.source!.variantId}`, {
    headers: { 'X-Branch': level.branch.code },
  });
  onEdit(source, {
    counts: Object.fromEntries(
      made.outputs.filter((o) => !o.undone).map((o) => [o.variantId, String(o.quantity)]),
    ),
    note: made.note ?? '',
    undo: {
      reference: made.reference,
      sourceQuantity: made.source!.quantity,
      date: formatDate(made.createdAt, locale),
    },
  });
}

// The packet-making that can still be edited for this bought-in pack: the newest one not put back.
export async function latestMade(level: Level): Promise<Made | null> {
  const list = await request<Made[]>('GET', `/admin/stock-repacks?variantId=${level.variant.id}`, {
    headers: { 'X-Branch': level.branch.code },
  });
  return list.find((made) => !made.undone && made.source?.variantId === level.variant.id) ?? null;
}
