'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { useToast } from '@/components/overlays';
import { ActionModal, ResourceScreen, useResourceText } from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';

import {
  accountsResource,
  adjustResource,
  closeDayResource,
  transferResource,
  type MoneyAccount,
} from '../resources';

import { AccountBook } from './account-book';
import { MerchantQrModal } from './merchant-qr-modal';

type Method = Schema<'MethodAccountResponse'>;
type Open =
  | { what: 'book' | 'adjust' | 'close' | 'qr'; account: MoneyAccount }
  | { what: 'transfer' | 'methods' }
  | null;

// Which account each payment method pays into at the branch in the header.
function MethodAccounts({ accounts }: { accounts: MoneyAccount[] }) {
  const t = useTranslations('money');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const methods = useQuery({
    queryKey: ['moneyAccounts', 'methods'],
    queryFn: () => request<Method[]>('GET', '/admin/money-accounts/methods'),
  });
  const set = useMutation({
    mutationFn: (body: { method: string; accountId: string }) =>
      request<Method[]>('PUT', '/admin/money-accounts/methods', { body }),
    onSuccess: (next) => {
      queryClient.setQueryData(['moneyAccounts', 'methods'], next);
      toast.success(tf('saved'));
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  if (methods.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {isApiError(methods.error) ? methods.error.message : tf('failed')}
      </p>
    );
  }
  const open = accounts.filter((a) => a.isActive);
  return (
    <div className="grid gap-2">
      {(methods.data ?? []).map((row) => (
        <label key={row.method} className="grid grid-cols-[10rem_1fr] items-center gap-3 text-sm">
          <span className="font-medium">{t(`methods.${row.method}`)}</span>
          <SearchSelect
            value={row.accountId ?? ''}
            required
            options={open.map((account) => ({
              value: account.id,
              label: account.name,
              detail: account.branch.code,
            }))}
            onChange={(value) => set.mutate({ method: row.method, accountId: String(value) })}
          />
        </label>
      ))}
    </div>
  );
}

export function MoneyScreen() {
  const t = useResourceText('moneyAccounts');
  const tm = useTranslations('money');
  const queryClient = useQueryClient();
  const resource = useMemo(() => accountsResource(t), [t]);
  const [open, setOpen] = useState<Open>(null);
  const accounts = useQuery({
    // Its own key: the table above caches the same list in another shape.
    queryKey: ['moneyAccounts', 'for-methods'],
    queryFn: () => request<MoneyAccount[]>('GET', '/admin/money-accounts'),
  });
  const close = () => setOpen(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['moneyAccounts'] });
  const account = open && 'account' in open ? open.account : null;
  const name = account ? `${account.branch.code} · ${account.name}` : '';

  return (
    <>
      <ResourceScreen
        resource={resource}
        toolbar={
          <>
            <Button variant="secondary" icon="list" onClick={() => setOpen({ what: 'methods' })}>
              {tm('methodsTitle')}
            </Button>
            <Button variant="secondary" icon="share" onClick={() => setOpen({ what: 'transfer' })}>
              {tm('transfer')}
            </Button>
          </>
        }
        rowActions={(row) => (
          <>
            <IconButton
              icon="book"
              label={tm('book')}
              onClick={() => setOpen({ what: 'book', account: row })}
            />
            <IconButton
              icon="check"
              label={tm('closeDay')}
              onClick={() => setOpen({ what: 'close', account: row })}
            />
            <IconButton
              icon="coin"
              label={tm('adjust')}
              onClick={() => setOpen({ what: 'adjust', account: row })}
            />
            {row.kind !== 'CASH' ? (
              <IconButton
                icon="qr"
                label={tm('qr.button')}
                onClick={() => setOpen({ what: 'qr', account: row })}
              />
            ) : null}
          </>
        )}
      />

      <MerchantQrModal account={open?.what === 'qr' ? account : null} onClose={close} />

      <Modal
        open={open?.what === 'book'}
        onOpenChange={(next) => (next ? undefined : close())}
        size="xl"
        title={tm('bookOf', { name })}
        description={tm('bookNote')}
      >
        {account && open?.what === 'book' ? <AccountBook accountId={account.id} /> : null}
      </Modal>

      <Modal
        open={open?.what === 'methods'}
        onOpenChange={(next) => (next ? undefined : close())}
        size="md"
        title={tm('methodsTitle')}
        description={tm('methodsNote')}
      >
        {open?.what === 'methods' ? <MethodAccounts accounts={accounts.data ?? []} /> : null}
      </Modal>

      <ActionModal
        resource={open?.what === 'transfer' ? transferResource() : null}
        size="md"
        title={tm('transfer')}
        description={tm('transferNote')}
        submitLabel={tm('transfer')}
        doneMessage={tm('transferred')}
        onClose={close}
        onSaved={refresh}
      />
      <ActionModal
        resource={account && open?.what === 'adjust' ? adjustResource(account) : null}
        title={tm('adjustOf', { name })}
        description={tm('adjustNote')}
        submitLabel={tm('adjust')}
        doneMessage={tm('adjusted')}
        onClose={close}
        onSaved={refresh}
      />
      <ActionModal
        resource={account && open?.what === 'close' ? closeDayResource(account) : null}
        title={tm('closeDayOf', { name })}
        description={tm('closeDayNote', {
          balance: account ? formatMoney(account.balance, 'en') : '',
        })}
        submitLabel={tm('closeDay')}
        doneMessage={tm('dayClosed')}
        onClose={close}
        onSaved={refresh}
      />
    </>
  );
}
