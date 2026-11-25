'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';

import { useToast } from '@/components/overlays';
import {
  ActionModal,
  ConfirmDelete,
  ResourceScreen,
  useResourceText,
  WorkbookUploadButton,
} from '@/components/resource';
import { Icon } from '@/components/icons';
import { Button, buttonVariants, IconButton } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { useTestModeOn } from '@/hooks/use-test-mode';
import { isApiError, request } from '@/lib/api';

import {
  purchaseBillsResource,
  purchaseReturnsResource,
  supplierPaymentsResource,
  suppliersResource,
  voidSupplierPaymentResource,
  type PurchaseBill,
  type SupplierPayment,
} from '../resources';

import { PurchaseBillForm } from './purchase-bill-form';
import { PurchaseBillView } from './purchase-bill-view';
import { PurchaseReturnForm } from './purchase-return-form';

export function SuppliersScreen() {
  const resource = useMemo(() => suppliersResource(), []);
  return <ResourceScreen resource={resource} deepLink />;
}

export function PurchaseBillsScreen() {
  const t = useResourceText('purchaseBills');
  const tp = useTranslations('purchases');
  const tb = useTranslations('inventory.buy');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const resource = useMemo(() => purchaseBillsResource(t), [t]);
  // A draft left over from before is still edited here; a bill that is posted is only looked at.
  const [editing, setEditing] = useState<PurchaseBill | null>(null);
  const [viewing, setViewing] = useState<PurchaseBill | null>(null);
  const [removing, setRemoving] = useState<PurchaseBill | null>(null);
  // Staging: a posted bill can be deleted too, and the stock it brought in goes with it.
  const testMode = useTestModeOn();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['purchaseBills'] });

  // One key per bill until it is posted, so a double click or a retry posts it once.
  const postKeys = useRef(new Map<string, string>());
  const post = useMutation({
    mutationFn: (bill: PurchaseBill) => {
      const key = postKeys.current.get(bill.id) ?? crypto.randomUUID();
      postKeys.current.set(bill.id, key);
      return request('POST', `/admin/purchase-bills/${bill.id}/post`, {
        headers: { 'Idempotency-Key': key },
      });
    },
    onSuccess: async (_data, bill) => {
      postKeys.current.delete(bill.id);
      toast.success(tp('posted'));
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['stock'] })]);
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  const remove = useMutation({
    mutationFn: (bill: PurchaseBill) => request('DELETE', `/admin/purchase-bills/${bill.id}`),
    onSuccess: async () => {
      toast.success(tf('deleted'));
      setRemoving(null);
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['stock'] })]);
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  // Coming from the Buy page right after saving: say what is done and what comes next.
  const router = useRouter();
  const params = useSearchParams();
  const justSaved = params.get('saved') === '1';
  const savedItems = (params.get('items') ?? '').split(',').filter(Boolean);

  return (
    <>
      {justSaved ? (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-success/40 bg-success/5 p-4 text-sm"
        >
          <Icon name="check" size={18} className="text-success" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{tp('savedTitle')}</p>
            <p className="text-muted-foreground">{tp('savedNext')}</p>
          </div>
          <Link
            href={routes.quantityPrice(savedItems[0], savedItems.slice(1), routes.purchaseBills())}
            className={buttonVariants({ variant: 'primary', size: 'sm' })}
          >
            {tp('savedPrice')}
          </Link>
          <Link
            href={routes.stock()}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            {tp('savedStock')}
          </Link>
          <Button variant="ghost" size="sm" onClick={() => router.replace(routes.purchaseBills())}>
            {tp('savedClose')}
          </Button>
        </div>
      ) : null}
      <ResourceScreen
        resource={resource}
        toolbar={
          <>
            <WorkbookUploadButton
              path="/admin/purchase-bills/sheet"
              templatePath="/admin/purchase-bills/sheet"
              title={tb('manyTitle')}
              description={tb('manyNote')}
              refresh={['purchaseBills', 'stock', 'products', 'suppliers']}
            />
            {/* New purchases are made in one place, the Buy page, so no bill is half filled in. */}
            <Link href={routes.buy()} className={buttonVariants({ variant: 'primary' })}>
              <Icon name="plus" size={16} />
              {tp('newBill')}
            </Link>
          </>
        }
        rowActions={(row) =>
          row.status === 'DRAFT' ? (
            <>
              <IconButton icon="check" label={tp('post')} onClick={() => post.mutate(row)} />
              <IconButton icon="edit" label={tf('edit')} onClick={() => setEditing(row)} />
              <IconButton
                icon="trash"
                variant="danger"
                label={tf('delete')}
                onClick={() => setRemoving(row)}
              />
            </>
          ) : (
            <>
              <IconButton icon="eye" label={tp('view')} onClick={() => setViewing(row)} />
              {testMode ? (
                <IconButton
                  icon="trash"
                  variant="danger"
                  label={tp('deletePosted')}
                  onClick={() => setRemoving(row)}
                />
              ) : null}
            </>
          )
        }
      />
      {editing ? (
        <PurchaseBillForm key={editing.id} bill={editing} open onClose={() => setEditing(null)} />
      ) : null}
      {viewing ? <PurchaseBillView bill={viewing} onClose={() => setViewing(null)} /> : null}
      <ConfirmDelete
        name={removing ? removing.supplierBillNumber : null}
        pending={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </>
  );
}

export function SupplierPaymentsScreen() {
  const t = useResourceText('supplierPayments');
  const tp = useTranslations('purchases');
  const resource = useMemo(() => supplierPaymentsResource(t), [t]);
  const [voiding, setVoiding] = useState<SupplierPayment | null>(null);
  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) =>
          row.status === 'RECORDED' ? (
            <IconButton
              icon="x"
              variant="danger"
              label={tp('void')}
              onClick={() => setVoiding(row)}
            />
          ) : null
        }
      />
      <ActionModal
        resource={voiding ? voidSupplierPaymentResource(voiding) : null}
        title={tp('voidPayment')}
        description={tp('voidNote')}
        submitLabel={tp('void')}
        doneMessage={tp('voided')}
        onClose={() => setVoiding(null)}
      />
    </>
  );
}

export function PurchaseReturnsScreen() {
  const tp = useTranslations('purchases');
  const resource = useMemo(() => purchaseReturnsResource(), []);
  const [returning, setReturning] = useState(false);
  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <Button icon="plus" onClick={() => setReturning(true)}>
            {tp('newReturn')}
          </Button>
        }
      />
      {returning ? <PurchaseReturnForm open onClose={() => setReturning(false)} /> : null}
    </>
  );
}
