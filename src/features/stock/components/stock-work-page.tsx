'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/overlays';
import { ActionModal } from '@/components/resource';
import { request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';

import { stockCountResource, stockLossResource, transferStockResource } from '../resources';
import { RepackForm } from './repack-form';

type Level = Schema<'StockLevelResponse'>;
type Task = 'repack' | 'loss' | 'count' | 'send' | null;

// Step 4: looking after what is on the shelf. Pick a pack, then what happened to it.
export function StockWorkPage() {
  const t = useTranslations('stockWork');
  const ta = useTranslations('actions');
  const [variantId, setVariantId] = useState('');
  const [task, setTask] = useState<Task>(null);
  const level = useQuery({
    queryKey: ['stock', 'level', variantId],
    queryFn: () => request<Level>('GET', `/admin/stock-levels/${variantId}`),
    enabled: Boolean(variantId),
  });
  const data = level.data;
  const name = data ? `${data.product.nameNe} · ${data.variant.label}` : '';
  const done = () => {
    setTask(null);
    void level.refetch();
  };

  const tasks: Array<{ key: Exclude<Task, null>; icon: string }> = [
    { key: 'repack', icon: '📦' },
    { key: 'loss', icon: '🗑' },
    { key: 'count', icon: '🔢' },
    { key: 'send', icon: '🚚' },
  ];

  return (
    <div className="grid max-w-3xl gap-6">
      <p className="text-sm text-muted-foreground">{t('note')}</p>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
        <Field label={t('pack')} htmlFor="work-pack" help={t('packHelp')}>
          <SearchSelect
            id="work-pack"
            source={choices.packs}
            value={variantId}
            onChange={(value) => setVariantId(String(value))}
          />
        </Field>
        {data ? (
          <p className="text-sm">
            <b>{name}</b> · {t('onShelf', { count: data.onHand })}
          </p>
        ) : null}
      </section>

      {data ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {tasks.map(({ key, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTask(key)}
              className="grid gap-1 rounded-xl border border-border bg-card p-4 text-left hover:border-primary"
            >
              <span className="text-lg">{icon}</span>
              <span className="font-semibold">{t(`task.${key}`)}</span>
              <span className="text-sm text-muted-foreground">{t(`taskNote.${key}`)}</span>
            </button>
          ))}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">{t('pick')}</p>
      )}

      <ExpiryList />

      {task === 'repack' && data ? <RepackForm level={data} onClose={done} /> : null}
      <ActionModal
        resource={task === 'loss' && data ? stockLossResource(data) : null}
        size="sm"
        title={t('lossTitle', { name })}
        description={t('lossNote')}
        submitLabel={t('record')}
        doneMessage={t('recorded')}
        onClose={done}
      />
      <ActionModal
        resource={task === 'count' && data ? stockCountResource(data) : null}
        size="sm"
        title={t('countTitle', { name })}
        description={t('countNote', { count: data?.onHand ?? 0 })}
        submitLabel={t('record')}
        doneMessage={t('recorded')}
        onClose={done}
      />
      <ActionModal
        resource={task === 'send' && data ? transferStockResource(data) : null}
        size="sm"
        title={ta('sendToBranchOf', { name })}
        description={ta('sendToBranchNote')}
        submitLabel={ta('send')}
        doneMessage={ta('sent')}
        onClose={done}
      />
    </div>
  );
}

type Batch = Schema<'StockBatchResponse'>;

// Dated stock, soonest first. Anything past its date can be written off in one click.
function ExpiryList() {
  const t = useTranslations('stockWork.expiry');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [days, setDays] = useState('30');
  const list = useQuery({
    queryKey: ['stock', 'batches', days],
    queryFn: () => request<Batch[]>('GET', `/admin/stock-batches?withinDays=${Number(days) || 30}`),
  });
  const writeOff = async (id: string) => {
    await request('POST', `/admin/stock-batches/${id}/write-off`);
    toast.success(t('writtenOff'));
    await queryClient.invalidateQueries({ queryKey: ['stock'] });
  };
  const rows = list.data ?? [];

  return (
    <section className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('note')}</p>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          {t('within')}
          <input
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
            className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          />
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-xs whitespace-nowrap text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t('item')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('pack')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('qty')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('date')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('left')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('value')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{b.productNameNe}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{b.packName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.quantity}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{b.expiresOn}</td>
                  <td
                    className={`px-3 py-2 text-right whitespace-nowrap tabular-nums ${b.daysLeft < 0 ? 'text-destructive' : ''}`}
                  >
                    {b.daysLeft < 0
                      ? t('expired', { days: -b.daysLeft })
                      : b.daysLeft === 0
                        ? t('today')
                        : b.daysLeft}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.value}</td>
                  <td className="px-3 py-2 text-right">
                    {b.daysLeft < 0 ? (
                      <Button size="sm" variant="secondary" onClick={() => void writeOff(b.id)}>
                        {t('writeOff')}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
