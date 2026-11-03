import type { Option, Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export type MoneyAccount = Schema<'MoneyAccountResponse'>;
type Name = (key: string) => string;

const money = (amount: string) => formatMoney(amount, 'en');
const KINDS = ['CASH', 'BANK', 'WALLET'] as const;
const SIGNED = { regex: /^-?\d{1,13}(\.\d{1,2})?$/, message: 'An amount such as 150 or -150' };

// The open accounts of the branch in the header, for paying out of.
export const accountChoices = {
  key: 'money-accounts',
  load: async (): Promise<Option[]> =>
    (await request<MoneyAccount[]>('GET', '/admin/money-accounts'))
      .filter((a) => a.isActive)
      .map((a) => ({ value: a.id, label: `${a.branch.code} · ${a.name}` })),
};

// Cash drawers, bank accounts and wallets with what is in them now (2.38).
export function accountsResource(name: Name): Resource<MoneyAccount> {
  return {
    key: 'moneyAccounts',
    path: '/admin/money-accounts',
    list: 'all',
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.branch.code} · ${row.name}`,
    matches: (row, q) => `${row.name} ${row.branch.name}`.toLowerCase().includes(q),
    modalSize: 'sm',
    columns: [
      {
        key: 'branch',
        cell: (row) => <span className="font-semibold">{row.branch.code}</span>,
        sortValue: (row) => row.branch.code,
      },
      {
        key: 'name',
        cell: (row) => (
          <>
            <div>{row.name}</div>
            <div className="text-xs text-muted-foreground">{name(`kinds.${row.kind}`)}</div>
          </>
        ),
        sortValue: (row) => row.name,
      },
      {
        key: 'balance',
        cell: (row) => (
          <span
            className={Number(row.balance) < 0 ? 'font-semibold text-destructive' : 'font-semibold'}
          >
            {money(row.balance)}
          </span>
        ),
        sortValue: (row) => Number(row.balance),
        align: 'right',
      },
      {
        key: 'isActive',
        cell: (row) => (
          <Badge tone={row.isActive ? 'success' : 'neutral'}>
            {name(row.isActive ? 'open' : 'closed')}
          </Badge>
        ),
        sortValue: (row) => row.isActive,
      },
    ],
    fields: [
      {
        name: 'kind',
        kind: 'select',
        required: true,
        createOnly: true,
        options: KINDS.map((kind) => ({ value: kind, label: name(`kinds.${kind}`) })),
      },
      { name: 'name', kind: 'text', required: true, max: 80 },
      { name: 'openingBalance', kind: 'money' },
      { name: 'isActive', kind: 'switch', editOnly: true },
    ],
  };
}

const action = (key: string, path: string, fields: Resource<never>['fields']): Resource<never> => ({
  key,
  scope: 'moneyAccounts',
  path,
  list: 'all',
  rowId: () => '',
  rowLabel: () => '',
  columns: [],
  fields,
});

export const transferResource = () =>
  action('moneyTransfer', '/admin/money-accounts/transfers', [
    { name: 'fromAccountId', kind: 'select', required: true, optionsFrom: accountChoices },
    { name: 'toAccountId', kind: 'select', required: true, optionsFrom: accountChoices },
    { name: 'amount', kind: 'money', required: true },
    { name: 'day', kind: 'date' },
    { name: 'reference', kind: 'text', max: 100 },
    { name: 'note', kind: 'textarea', max: 500 },
  ]);

export const adjustResource = (account: MoneyAccount) =>
  action('moneyAdjustment', `/admin/money-accounts/${account.id}/adjustments`, [
    { name: 'amount', kind: 'text', required: true, pattern: SIGNED },
    { name: 'reason', kind: 'text', required: true, max: 300, wide: true },
    { name: 'day', kind: 'date' },
  ]);

export const closeDayResource = (account: MoneyAccount) =>
  action('dayClosing', `/admin/money-accounts/${account.id}/closings`, [
    { name: 'counted', kind: 'money', required: true },
    { name: 'note', kind: 'text', max: 300, wide: true },
  ]);
