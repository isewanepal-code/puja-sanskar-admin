'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { useToast } from '@/components/overlays';
import { ResourceScreen, useResourceText } from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';

import {
  cartActivityResource,
  cartsResource,
  customersResource,
  listRequestsResource,
  messagesResource,
  remindersResource,
  type Cart,
  type Customer,
  type ListRequest,
} from '../resources';

import { ListItemsEditor } from './list-items-editor';

type CustomerDetail = Schema<'CustomerDetailResponse'>;
type Ready = Schema<'ReadyListResponse'>;

const SORTS = ['NEWEST', 'NAME', 'TOP_PAYING', 'RECENT_ORDER'] as const;

export function CustomersScreen() {
  const t = useResourceText('customers');
  const ta = useTranslations('customerActions');
  const [sort, setSort] = useState<(typeof SORTS)[number]>('NEWEST');
  const [open, setOpen] = useState<Customer | null>(null);
  const resource = useMemo(() => customersResource(sort, t), [sort, t]);
  const detail = useQuery({
    queryKey: ['customers', 'one', open?.id],
    queryFn: () => request<CustomerDetail>('GET', `/admin/customers/${open!.id}`),
    enabled: !!open,
  });

  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <SearchSelect
            value={sort}
            required
            options={SORTS.map((value) => ({ value, label: t(`sorts.${value}`) }))}
            aria-label={ta('sort')}
            className="w-48"
            onChange={(value) => setSort(value as typeof sort)}
          />
        }
        rowActions={(row) => (
          <IconButton icon="user" label={ta('details')} onClick={() => setOpen(row)} />
        )}
      />
      <Modal
        open={open !== null}
        onOpenChange={(next) => (next ? undefined : setOpen(null))}
        size="md"
        title={open?.fullName ?? ''}
        description={open?.email}
      >
        {detail.data ? (
          <div className="grid gap-4 text-sm">
            <p>
              {ta('summary', {
                orders: detail.data.orderCount,
                paid: formatMoney(detail.data.paidTotal, 'en'),
                due: formatMoney(detail.data.dueTotal, 'en'),
              })}
            </p>
            <h3 className="font-semibold">{ta('addresses')}</h3>
            {detail.data.addresses.length === 0 ? (
              <p className="text-muted-foreground">{ta('noAddresses')}</p>
            ) : null}
            <ul className="grid gap-3">
              {detail.data.addresses.map((address) => (
                <li key={address.id}>
                  <div className="font-medium">
                    {address.label} {address.isDefault ? '★' : ''}
                  </div>
                  <div>
                    {address.recipientName} · {address.phone}
                  </div>
                  <div className="text-muted-foreground">
                    {[address.addressLine, address.area, address.city, address.landmark]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{ta('loading')}</p>
        )}
      </Modal>
    </>
  );
}

export function CartsScreen() {
  const t = useResourceText('carts');
  const tc = useResourceText('cartActivity');
  const ta = useTranslations('customerActions');
  const resource = useMemo(() => cartsResource(t), [t]);
  const [open, setOpen] = useState<Cart | null>(null);

  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) => (
          <IconButton icon="bag" label={ta('cart')} onClick={() => setOpen(row)} />
        )}
      />
      <Modal
        open={open !== null}
        onOpenChange={(next) => (next ? undefined : setOpen(null))}
        size="xl"
        title={ta('cartTitle', { total: open ? formatMoney(open.subtotal, 'en') : '' })}
      >
        {open ? (
          <div className="grid gap-6">
            <ul className="grid gap-1 text-sm">
              {open.items.map((line) => (
                <li key={line.variant.id} className="flex gap-3">
                  <span className="flex-1">
                    {line.product.nameNe} · {line.variant.label}
                  </span>
                  <span className="text-muted-foreground">× {line.quantity}</span>
                  <span className="w-24 text-right">{formatMoney(line.lineTotal, 'en')}</span>
                </li>
              ))}
            </ul>
            <ResourceScreen resource={cartActivityResource(open.id, tc)} />
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export function ListRequestsScreen() {
  const t = useResourceText('listRequests');
  const ta = useTranslations('listPhotos');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const resource = useMemo(() => listRequestsResource(t), [t]);
  const [filling, setFilling] = useState<ListRequest | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);

  const markReady = useMutation({
    mutationFn: (list: ListRequest) =>
      request<Ready>('POST', `/admin/list-requests/${list.id}/ready`),
    onSuccess: async (result) => {
      setReady(result);
      await queryClient.invalidateQueries({ queryKey: ['listRequests'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) => (
          <>
            <IconButton icon="list" label={ta('fill')} onClick={() => setFilling(row)} />
            <IconButton icon="check" label={ta('ready')} onClick={() => markReady.mutate(row)} />
          </>
        )}
      />
      <Modal
        open={filling !== null}
        onOpenChange={(next) => (next ? undefined : setFilling(null))}
        size="xl"
        title={ta('fillTitle', { number: filling?.number ?? '' })}
        description={ta('fillNote')}
      >
        {filling ? <ListItemsEditor request={filling} onSaved={() => setFilling(null)} /> : null}
      </Modal>
      <Modal
        open={ready !== null}
        onOpenChange={(next) => (next ? undefined : setReady(null))}
        size="md"
        title={ta('readyTitle')}
      >
        {ready ? (
          <div className="grid gap-4">
            <pre className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
              {ready.message}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon="copy"
                onClick={() =>
                  navigator.clipboard.writeText(ready.link).then(() => toast.success(ta('copied')))
                }
              >
                {ta('copyLink')}
              </Button>
              <a
                className="inline-flex h-9 items-center rounded-md px-3.5 text-sm hover:bg-muted"
                href={ready.whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <a
                className="inline-flex h-9 items-center rounded-md px-3.5 text-sm hover:bg-muted"
                href={ready.viberUrl}
                target="_blank"
                rel="noreferrer"
              >
                Viber
              </a>
              {ready.smsUrl ? (
                <a
                  className="inline-flex h-9 items-center rounded-md px-3.5 text-sm hover:bg-muted"
                  href={ready.smsUrl}
                >
                  SMS
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export function MessagesScreen() {
  const t = useResourceText('contactMessages');
  const resource = useMemo(() => messagesResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}

export function RemindersScreen() {
  return <ResourceScreen resource={remindersResource} />;
}
