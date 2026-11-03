'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/overlays';
import { ActionModal, ResourceScreen, useResourceText } from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';

import { billsResource, voidBillResource, type Invoice } from '../resources';

type Print = Schema<'BillPrintResponse'>;
type Share = Schema<'BillShareResponse'>;

// The API's printable bill opened on its own and handed to the printer.
function printHtml(html: string) {
  const sheet = window.open('', '_blank', 'noopener=no,width=820,height=1000');
  if (!sheet) return false;
  sheet.document.write(html);
  sheet.document.close();
  sheet.focus();
  sheet.print();
  return true;
}

export function BillsScreen() {
  const t = useTranslations('bills');
  const tf = useTranslations('forms');
  const tb = useResourceText('bills');
  const toast = useToast();
  const resource = useMemo(() => billsResource(tb), [tb]);
  const [open, setOpen] = useState<{ what: 'share' | 'void'; bill: Invoice } | null>(null);

  const share = useQuery({
    queryKey: ['bills', 'share', open?.bill.id],
    queryFn: () => request<Share>('GET', `/admin/invoices/${open!.bill.id}/share`),
    enabled: open?.what === 'share',
  });
  const fail = (error: unknown) => toast.error(isApiError(error) ? error.message : tf('failed'));
  const print = useMutation({
    mutationFn: (bill: Invoice) => request<Print>('POST', `/admin/invoices/${bill.id}/print`),
    onSuccess: (result) =>
      printHtml(result.html) ? toast.info(result.copyLabel) : toast.error(t('popup')),
    onError: fail,
  });
  const email = useMutation({
    mutationFn: (bill: Invoice) => request('POST', `/admin/invoices/${bill.id}/email`),
    onSuccess: () => toast.success(t('emailed')),
    onError: fail,
  });

  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) => (
          <>
            <IconButton icon="book" label={t('print')} onClick={() => print.mutate(row)} />
            <IconButton
              icon="share"
              label={t('share')}
              onClick={() => setOpen({ what: 'share', bill: row })}
            />
            <IconButton icon="mail" label={t('email')} onClick={() => email.mutate(row)} />
            {row.status === 'ISSUED' ? (
              <IconButton
                icon="x"
                variant="danger"
                label={t('void')}
                onClick={() => setOpen({ what: 'void', bill: row })}
              />
            ) : null}
          </>
        )}
      />
      <ActionModal
        resource={open?.what === 'void' ? voidBillResource(open.bill) : null}
        title={t('voidTitle', { number: open?.bill.number ?? '' })}
        description={t('voidNote')}
        submitLabel={t('void')}
        doneMessage={t('voided')}
        onClose={() => setOpen(null)}
      />
      <Modal
        open={open?.what === 'share'}
        onOpenChange={(next) => (next ? undefined : setOpen(null))}
        size="md"
        title={t('shareTitle', { number: open?.bill.number ?? '' })}
      >
        {share.data ? (
          <div className="grid gap-4">
            <pre className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
              {share.data.message}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon="copy"
                onClick={() =>
                  navigator.clipboard
                    .writeText(share.data!.link)
                    .then(() => toast.success(t('copied')))
                }
              >
                {t('copyLink')}
              </Button>
              <a
                className="inline-flex h-9 items-center rounded-md px-3.5 text-sm hover:bg-muted"
                href={share.data.whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <a
                className="inline-flex h-9 items-center rounded-md px-3.5 text-sm hover:bg-muted"
                href={share.data.viberUrl}
                target="_blank"
                rel="noreferrer"
              >
                Viber
              </a>
              {share.data.smsUrl ? (
                <a
                  className="inline-flex h-9 items-center rounded-md px-3.5 text-sm hover:bg-muted"
                  href={share.data.smsUrl}
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
    </>
  );
}
