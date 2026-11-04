'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, upload, type Schema } from '@/lib/api';

type Account = Schema<'MoneyAccountResponse'>;
type Read = Schema<'MerchantQrResponse'>;

// An account's merchant QR from a photo: the server reads and checks it before it is saved.
export function MerchantQrModal({
  account,
  onClose,
}: {
  account: Account | null;
  onClose: () => void;
}) {
  const t = useTranslations('money.qr');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [read, setRead] = useState<Read | null>(null);
  const [label, setLabel] = useState('');
  const fail = (error: unknown) => toast.error(isApiError(error) ? error.message : tf('failed'));

  const scan = useMutation({
    mutationFn: (file: File) => upload<Read>('/admin/payment-qr/read', file),
    onSuccess: setRead,
    onError: fail,
  });
  const save = useMutation({
    mutationFn: (qrPayload: string | null) =>
      request('PATCH', `/admin/money-accounts/${account!.id}`, {
        body: { qrPayload, qrLabel: qrPayload ? label.trim() || null : null },
      }),
    onSuccess: async () => {
      toast.success(tf('saved'));
      await queryClient.invalidateQueries({ queryKey: ['moneyAccounts'] });
      close();
    },
    onError: fail,
  });
  const close = () => {
    setRead(null);
    setLabel('');
    onClose();
  };

  return (
    <Modal
      open={account !== null}
      onOpenChange={(next) => (next ? undefined : close())}
      size="sm"
      title={t('title', { name: account?.name ?? '' })}
      description={t('note')}
      footer={
        <>
          {account?.qrPayload ? (
            <Button
              variant="ghost"
              className="mr-auto"
              disabled={save.isPending}
              onClick={() => save.mutate(null)}
            >
              {t('remove')}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={close}>
            {tf('cancel')}
          </Button>
          <Button
            disabled={!read || save.isPending}
            onClick={() => read && save.mutate(read.payload)}
          >
            {tf('save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 text-sm">
        <p className="text-muted-foreground">
          {account?.qrPayload ? t('has', { label: account.qrLabel ?? '' }) : t('none')}
        </p>
        <label className="grid gap-1.5">
          <span className="font-medium">{t('photo')}</span>
          <Input
            type="file"
            accept="image/*"
            className="h-auto py-2"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) scan.mutate(file);
            }}
          />
        </label>
        {scan.isPending ? <p className="text-muted-foreground">{t('reading')}</p> : null}
        {read ? (
          <div className="grid gap-2 rounded-md bg-success/8 p-3">
            <strong>{t('found', { payee: read.payeeName ?? '—', city: read.city ?? '' })}</strong>
            <label className="grid gap-1">
              <span>{t('label')}</span>
              <Input
                value={label}
                maxLength={80}
                placeholder="Fonepay · Nabil Bank"
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
