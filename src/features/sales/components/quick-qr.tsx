'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';

type Qr = Schema<'PaymentQrResponse'>;

const MONEY = /^\d{1,13}(\.\d{1,2})?$/;

// A QR for any amount, made by the server from this branch's merchant QR; nothing is recorded.
export function QuickQr() {
  const t = useTranslations('counterSale.quickQr');
  const tf = useTranslations('forms');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const make = useMutation({
    mutationFn: () =>
      request<Qr>('POST', '/admin/payment-qr', {
        body: { amount, reference: reference.trim() || undefined },
      }),
  });
  const close = () => {
    setOpen(false);
    make.reset();
  };

  return (
    <>
      <Button variant="secondary" icon="qr" onClick={() => setOpen(true)}>
        {t('button')}
      </Button>
      <Modal
        open={open}
        onOpenChange={(next) => (next ? undefined : close())}
        size="sm"
        title={t('title')}
        description={t('note')}
      >
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (MONEY.test(amount)) make.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              {t('amount')}
              <Input
                inputMode="decimal"
                value={amount}
                autoFocus
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t('reference')}
              <Input
                value={reference}
                maxLength={25}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
          </div>
          <Button type="submit" disabled={!MONEY.test(amount) || make.isPending}>
            {make.isPending ? tf('saving') : t('make')}
          </Button>
          {make.isError ? (
            <p className="text-sm text-destructive">
              {isApiError(make.error) ? make.error.message : tf('failed')}
            </p>
          ) : null}
          {make.data ? (
            <div className="grid justify-items-center gap-1 text-center">
              <div className="w-56" dangerouslySetInnerHTML={{ __html: make.data.svg }} />
              <strong className="text-lg">{formatMoney(make.data.amount, 'en')}</strong>
              <span className="text-xs text-muted-foreground">
                {make.data.payeeName} · {make.data.reference}
              </span>
            </div>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
