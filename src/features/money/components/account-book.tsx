'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { BsDatePicker } from '@/components/ui/bs-date-picker';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { Figure } from '@/features/reports';
import { isApiError, request, type Schema } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

type Book = Schema<'MoneyBookResponse'>;
type Entry = Book['entries']['items'][number];

const money = (amount: string) => formatMoney(amount, 'en');
const signed = (amount: string) => (amount.startsWith('-') ? amount.slice(1) : amount);

// An account's cash or bank book: every line in date order with the balance after it.
export function AccountBook({ accountId }: { accountId: string }) {
  const t = useTranslations('money');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const book = useQuery({
    queryKey: ['moneyAccounts', 'book', accountId, from, to, page, pageSize],
    queryFn: () =>
      request<Book>('GET', `/admin/money-accounts/${accountId}/book`, {
        query: { ...(from && to && { from, to }), page, limit: pageSize },
      }),
  });
  const data = book.data;

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          {t('from')}
          <div className="w-56">
            <BsDatePicker
              value={from}
              onChange={(v) => {
                setFrom(v);
                setPage(1);
              }}
            />
          </div>
        </label>
        <label className="grid gap-1 text-sm">
          {t('to')}
          <div className="w-56">
            <BsDatePicker
              value={to}
              onChange={(v) => {
                setTo(v);
                setPage(1);
              }}
            />
          </div>
        </label>
        <p className="pb-2 text-xs text-muted-foreground">{t('periodNote')}</p>
      </div>
      {book.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {isApiError(book.error) ? book.error.message : t('failed')}
        </p>
      ) : null}
      {data ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Figure label={t('opening')} value={money(data.opening)} />
          <Figure label={t('in')} value={money(data.moneyIn)} />
          <Figure label={t('out')} value={money(data.moneyOut)} />
          <Figure
            label={t('closing')}
            value={money(data.closing)}
            tone={Number(data.closing) < 0 ? 'danger' : undefined}
          />
        </div>
      ) : null}
      <DataTable<Entry>
        rows={data?.entries.items ?? []}
        loading={book.isPending}
        rowKey={(row) => row.id}
        columns={[
          {
            key: 'day',
            header: t('date'),
            cell: (row) => formatDate(row.day, 'en'),
            sortValue: (row) => row.day,
          },
          {
            key: 'kind',
            header: t('what'),
            cell: (row) => (
              <>
                <div className={row.voided ? 'line-through' : undefined}>
                  {t(`kinds.${row.kind}`)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[row.order, row.reference, row.note].filter(Boolean).join(' · ')}
                  {row.voided ? ` · ${t('voided')}` : ''}
                </div>
              </>
            ),
            filterValue: (row) =>
              `${t(`kinds.${row.kind}`)} ${row.order ?? ''} ${row.reference ?? ''} ${row.note ?? ''}`,
          },
          {
            key: 'in',
            header: t('in'),
            cell: (row) => (row.amount.startsWith('-') ? '' : money(row.amount)),
            align: 'right',
          },
          {
            key: 'out',
            header: t('out'),
            cell: (row) => (row.amount.startsWith('-') ? money(signed(row.amount)) : ''),
            align: 'right',
          },
          {
            key: 'balance',
            header: t('balance'),
            cell: (row) => <span className="font-semibold">{money(row.balance)}</span>,
            align: 'right',
          },
        ]}
        empty={t('noEntries')}
      />
      {data && data.entries.meta.total > 0 ? (
        <Pagination
          page={page}
          totalPages={data.entries.meta.totalPages}
          total={data.entries.meta.total}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
    </div>
  );
}
