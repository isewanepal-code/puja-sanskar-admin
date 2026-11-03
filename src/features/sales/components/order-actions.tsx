'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ActionModal, useResourceText } from '@/components/resource';
import { useToast } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { request, type Schema } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';

import {
  deliveryFeeResource,
  issueBillResource,
  receivePaymentResource,
  refundResource,
  statusResource,
  voidPaymentResource,
  type Order,
  type Payment,
} from '../resources';

type Account = Schema<'OrderAccountResponse'>;
type Message = Schema<'OrderMessageResponse'>;
type Qr = Schema<'PaymentQrResponse'>;

type Open =
  | { what: 'status' | 'fee' | 'receive' | 'refund' | 'bill' | 'message' | 'qr' }
  | { what: 'void'; payment: Payment }
  | null;

const money = (amount: string) => formatMoney(amount, 'en');

// Everything staff do to an order from its page: move it on, take money, bill it, tell the customer.
export function OrderActions({ order }: { order: Order }) {
  const t = useTranslations('orderActions');
  const tp = useResourceText('receivePayment');
  const ts = useResourceText('orderStatus');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const saved = () => {
    router.refresh();
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const account = useQuery({
    queryKey: ['orders', 'account', order.id],
    queryFn: () => request<Account>('GET', `/admin/orders/${order.id}/payments`),
  });
  const message = useQuery({
    queryKey: ['orders', 'message', order.id],
    queryFn: () => request<Message>('GET', `/admin/orders/${order.id}/message`),
    enabled: open?.what === 'message',
  });
  const qr = useQuery({
    queryKey: ['orders', 'qr', order.id],
    queryFn: () => request<Qr>('GET', `/admin/orders/${order.id}/payment-qr`),
    enabled: open?.what === 'qr',
  });
  const settlement = account.data?.settlement;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {order.nextStatuses.length > 0 ? (
          <Button icon="truck" onClick={() => setOpen({ what: 'status' })}>
            {t('status')}
          </Button>
        ) : null}
        <Button variant="secondary" icon="coin" onClick={() => setOpen({ what: 'receive' })}>
          {t('receive')}
        </Button>
        <Button variant="secondary" icon="qr" onClick={() => setOpen({ what: 'qr' })}>
          {t('qr')}
        </Button>
        <Button variant="secondary" icon="chat" onClick={() => setOpen({ what: 'message' })}>
          {t('message')}
        </Button>
        <Button variant="ghost" icon="truck" onClick={() => setOpen({ what: 'fee' })}>
          {t('fee')}
        </Button>
        <Button variant="ghost" icon="book" onClick={() => setOpen({ what: 'bill' })}>
          {t('bill')}
        </Button>
        {settlement && Number(settlement.refundDue) > 0 ? (
          <Button variant="ghost" icon="refresh" onClick={() => setOpen({ what: 'refund' })}>
            {t('refund')}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-lg bg-card p-4 ring-1 ring-border">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
          <h2 className="font-semibold">{t('payments')}</h2>
          {settlement ? (
            <>
              <span>
                {t('received')} <strong>{money(settlement.received)}</strong>
              </span>
              <span>
                {t('due')}{' '}
                <strong className={Number(settlement.due) > 0 ? 'text-destructive' : ''}>
                  {money(settlement.due)}
                </strong>
              </span>
              {Number(settlement.refunded) > 0 ? (
                <span>
                  {t('refunded')} <strong>{money(settlement.refunded)}</strong>
                </span>
              ) : null}
            </>
          ) : null}
        </div>
        {account.data && account.data.payments.length > 0 ? (
          <ul className="grid gap-1 text-sm">
            {account.data.payments.map((payment) => (
              <li key={payment.id} className="flex items-center gap-3">
                <Badge tone={payment.kind === 'REFUND' ? 'warning' : 'success'}>
                  {tp(`kinds.${payment.kind}`)}
                </Badge>
                <span
                  className={payment.status === 'VOID' ? 'line-through opacity-60' : 'font-medium'}
                >
                  {money(payment.amount)}
                </span>
                <span className="text-muted-foreground">
                  {tp(`methods.${payment.method}`)}
                  {payment.reference ? ` · ${payment.reference}` : ''} ·{' '}
                  {formatDateTime(payment.paidAt, 'en')}
                </span>
                {payment.status === 'RECORDED' ? (
                  <IconButton
                    icon="x"
                    variant="danger"
                    label={t('void')}
                    className="ml-auto"
                    onClick={() => setOpen({ what: 'void', payment })}
                  />
                ) : (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {payment.voidReason}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noPayments')}</p>
        )}
      </div>

      <ActionModal
        resource={open?.what === 'status' ? statusResource(order, ts) : null}
        title={t('statusTitle', { number: order.number })}
        description={t('statusNote')}
        submitLabel={t('status')}
        doneMessage={t('statusDone')}
        onSaved={saved}
        onClose={close}
      />
      <ActionModal
        resource={open?.what === 'fee' ? deliveryFeeResource(order) : null}
        defaults={{ deliveryFee: order.deliveryFee }}
        title={t('feeTitle', { number: order.number })}
        submitLabel={t('fee')}
        doneMessage={t('saved')}
        onSaved={saved}
        onClose={close}
      />
      <ActionModal
        resource={open?.what === 'receive' ? receivePaymentResource(order, tp) : null}
        defaults={{ method: 'CASH', amount: settlement?.due, issueBill: true }}
        size="md"
        title={t('receiveTitle', { number: order.number })}
        description={t('receiveNote')}
        submitLabel={t('receive')}
        doneMessage={t('received')}
        onSaved={saved}
        onClose={close}
      />
      <ActionModal
        resource={open?.what === 'refund' ? refundResource(order, tp) : null}
        defaults={{ method: 'CASH', amount: settlement?.refundDue }}
        title={t('refundTitle', { number: order.number })}
        submitLabel={t('refund')}
        doneMessage={t('refunded')}
        onSaved={saved}
        onClose={close}
      />
      <ActionModal
        resource={open?.what === 'void' ? voidPaymentResource(open.payment) : null}
        title={t('voidTitle')}
        description={t('voidNote')}
        submitLabel={t('void')}
        doneMessage={t('voided')}
        onSaved={saved}
        onClose={close}
      />
      <ActionModal
        resource={open?.what === 'bill' ? issueBillResource(order) : null}
        title={t('billTitle', { number: order.number })}
        description={t('billNote')}
        submitLabel={t('bill')}
        doneMessage={t('billed')}
        onSaved={saved}
        onClose={close}
      />

      <Modal
        open={open?.what === 'message'}
        onOpenChange={(next) => (next ? undefined : close())}
        size="md"
        title={t('message')}
      >
        {message.data ? (
          <div className="grid gap-4">
            <pre className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
              {message.data.message}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon="copy"
                onClick={() =>
                  navigator.clipboard
                    .writeText(message.data!.message)
                    .then(() => toast.success(t('copied')))
                }
              >
                {t('copy')}
              </Button>
              <a
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm hover:bg-muted"
                href={message.data.whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <a
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm hover:bg-muted"
                href={message.data.viberUrl}
                target="_blank"
                rel="noreferrer"
              >
                Viber
              </a>
              {message.data.smsUrl ? (
                <a
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm hover:bg-muted"
                  href={message.data.smsUrl}
                >
                  SMS
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        )}
      </Modal>

      <Modal
        open={open?.what === 'qr'}
        onOpenChange={(next) => (next ? undefined : close())}
        size="xs"
        title={t('qr')}
      >
        {qr.data ? (
          <div className="grid justify-items-center gap-2 text-center">
            {/* The API draws the QR as SVG of its own making. */}
            <div className="w-56" dangerouslySetInnerHTML={{ __html: qr.data.svg }} />
            <strong>{money(qr.data.amount)}</strong>
            <span className="text-sm text-muted-foreground">
              {qr.data.payeeName} · {qr.data.reference}
            </span>
          </div>
        ) : qr.isError ? (
          <p className="text-sm text-destructive">{t('qrMissing')}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        )}
      </Modal>
    </section>
  );
}
