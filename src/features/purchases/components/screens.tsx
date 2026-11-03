'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/overlays';
import { ActionModal, ConfirmDelete, ResourceScreen, useResourceText } from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { isApiError, request } from '@/lib/api';

import {
  purchaseBillsResource,
  supplierPaymentsResource,
  suppliersResource,
  voidSupplierPaymentResource,
  type PurchaseBill,
  type SupplierPayment,
} from '../resources';

import { PurchaseBillForm } from './purchase-bill-form';

export function SuppliersScreen() {
  const resource = useMemo(() => suppliersResource(), []);
  return <ResourceScreen resource={resource} />;
}

export function PurchaseBillsScreen() {
  const t = useResourceText('purchaseBills');
  const tp = useTranslations('purchases');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const resource = useMemo(() => purchaseBillsResource(t), [t]);
  const [editing, setEditing] = useState<PurchaseBill | 'new' | null>(null);
  const [removing, setRemoving] = useState<PurchaseBill | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['purchaseBills'] });

  const post = useMutation({
    mutationFn: (bill: PurchaseBill) => request('POST', `/admin/purchase-bills/${bill.id}/post`),
    onSuccess: async () => {
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
      await refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <Button icon="plus" onClick={() => setEditing('new')}>
            {tp('newBill')}
          </Button>
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
            <IconButton icon="eye" label={tp('view')} onClick={() => setEditing(row)} />
          )
        }
      />
      {editing ? (
        <PurchaseBillForm
          key={editing === 'new' ? 'new' : editing.id}
          bill={editing === 'new' ? undefined : editing}
          open
          onClose={() => setEditing(null)}
        />
      ) : null}
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
