import type { Option, Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { accountChoices } from '@/features/money';
import { request, type Schema } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

export type ExpenseCategory = Schema<'ExpenseCategoryResponse'>;
export type Expense = Schema<'ExpenseResponse'>;
type Name = (key: string) => string;

const money = (amount: string) => formatMoney(amount, 'en');
const PAN = { regex: /^\d{9}$/, message: 'A PAN is 9 digits' };

export const categoryChoices = {
  key: 'expense-categories',
  load: async (): Promise<Option[]> =>
    (await request<ExpenseCategory[]>('GET', '/admin/expense-categories'))
      .filter((c) => c.isActive)
      .map((c) => ({ value: c.id, label: c.name })),
};

export const expenseCategoriesResource: Resource<ExpenseCategory> = {
  key: 'expenseCategories',
  path: '/admin/expense-categories',
  list: 'all',
  canDelete: false,
  rowId: (row) => row.id,
  rowLabel: (row) => row.name,
  matches: (row, q) => `${row.code} ${row.name}`.toLowerCase().includes(q),
  modalSize: 'sm',
  columns: [
    { key: 'name', cell: (row) => row.name, sortValue: (row) => row.name },
    {
      key: 'code',
      cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      key: 'isActive',
      cell: (row) => (
        <Badge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? '✓' : '—'}</Badge>
      ),
      sortValue: (row) => row.isActive,
    },
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    { name: 'name', kind: 'text', required: true, max: 80 },
    { name: 'isActive', kind: 'switch', editOnly: true },
  ],
};

// What a branch spent, paid out of one of its accounts (2.37).
export function expensesResource(name: Name, categories: Map<string, string>): Resource<Expense> {
  return {
    key: 'expenses',
    path: '/admin/expenses',
    list: 'paged',
    canEdit: false,
    canDelete: false,
    searchable: false,
    rowId: (row) => row.id,
    rowLabel: (row) => categories.get(row.categoryId) ?? '',
    modalSize: 'md',
    columns: [
      { key: 'day', cell: (row) => formatDate(row.day, 'en'), sortValue: (row) => row.day },
      {
        key: 'categoryId',
        cell: (row) => (
          <>
            <div>{categories.get(row.categoryId) ?? '—'}</div>
            <div className="text-xs text-muted-foreground">
              {[row.payee, row.note].filter(Boolean).join(' · ')}
            </div>
          </>
        ),
        sortValue: (row) => categories.get(row.categoryId) ?? '',
        filterValue: (row) =>
          `${categories.get(row.categoryId) ?? ''} ${row.payee ?? ''} ${row.note ?? ''}`,
      },
      {
        key: 'vatAmount',
        cell: (row) => (Number(row.vatAmount) > 0 ? money(row.vatAmount) : '—'),
        sortValue: (row) => Number(row.vatAmount),
        align: 'right',
      },
      {
        key: 'amount',
        cell: (row) => (
          <span className={row.status === 'VOID' ? 'line-through' : 'font-semibold'}>
            {money(row.amount)}
          </span>
        ),
        sortValue: (row) => Number(row.amount),
        align: 'right',
      },
      {
        key: 'status',
        cell: (row) => (
          <Badge tone={row.status === 'VOID' ? 'neutral' : 'success'}>
            {name(`statuses.${row.status}`)}
          </Badge>
        ),
        sortValue: (row) => row.status,
      },
    ],
    fields: [
      { name: 'categoryId', kind: 'select', required: true, optionsFrom: categoryChoices },
      { name: 'accountId', kind: 'select', required: true, optionsFrom: accountChoices },
      { name: 'amount', kind: 'money', required: true },
      { name: 'vatAmount', kind: 'money' },
      { name: 'day', kind: 'date' },
      { name: 'payee', kind: 'text', max: 160 },
      { name: 'payeePan', kind: 'text', pattern: PAN },
      { name: 'reference', kind: 'text', max: 100 },
      { name: 'note', kind: 'textarea', max: 500 },
      { name: 'receiptUrl', kind: 'image', wide: true },
    ],
  };
}

export const voidExpenseResource = (expense: Expense): Resource<never> => ({
  key: 'voidExpense',
  scope: 'expenses',
  path: `/admin/expenses/${expense.id}/void`,
  list: 'all',
  rowId: () => '',
  rowLabel: () => '',
  columns: [],
  fields: [{ name: 'reason', kind: 'text', required: true, max: 500, wide: true }],
});
