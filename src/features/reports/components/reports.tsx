'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import type { Schema } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

import { Figure, ReportScreen } from './report-screen';

type SalesBook = Schema<'SalesBookResponse'>;
type SalesRow = Schema<'SalesBookRowResponse'>;
type Vat = Schema<'VatSummaryResponse'>;
type VatMonth = Schema<'VatMonthResponse'>;
type DayBook = Schema<'DayBookResponse'>;
type DayRow = Schema<'DayBookRowResponse'>;
type Receivables = Schema<'ReceivablesResponse'>;
type Receivable = Schema<'ReceivableRowResponse'>;
type Totals = Schema<'SalesTotalsResponse'>;

const money = (amount: string) => formatMoney(amount, 'en');
const amount = <T,>(key: keyof T & string, header: string) => ({
  key,
  header,
  cell: (row: T) => money(String(row[key])),
  sortValue: (row: T) => Number(row[key]),
  align: 'right' as const,
});

function SalesTotals({ totals }: { totals: Totals }) {
  const t = useTranslations('reports.columns');
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Figure label={t('bills')} value={String(totals.bills)} />
      <Figure label={t('grossTotal')} value={money(totals.grossTotal)} />
      <Figure label={t('discountTotal')} value={money(totals.discountTotal)} />
      <Figure label={t('taxableTotal')} value={money(totals.taxableTotal)} />
      <Figure label={t('vatTotal')} value={money(totals.vatTotal)} />
      <Figure label={t('exemptTotal')} value={money(totals.exemptTotal)} />
    </div>
  );
}

// बिक्री खाता: every bill with its VAT split, as the tax office asks for it.
export function SalesBookReport() {
  const t = useTranslations('reports.columns');
  return (
    <ReportScreen<SalesBook, SalesRow>
      path="/admin/reports/sales-book"
      paged
      filters={['range', 'fiscalYear']}
      rows={(data) => data.items}
      rowKey={(row) => row.invoiceId}
      summary={(data) => <SalesTotals totals={data.totals} />}
      initialSort={{ key: 'date', direction: 'desc' }}
      columns={[
        {
          key: 'date',
          header: t('date'),
          cell: (row) => (
            <>
              <div>{row.dateBs}</div>
              <div className="text-xs text-muted-foreground">{formatDate(row.date, 'en')}</div>
            </>
          ),
          sortValue: (row) => row.date,
        },
        {
          key: 'billNumber',
          header: t('bill'),
          cell: (row) => (
            <>
              <span className="font-semibold">{row.billNumber}</span>
              {row.status === 'VOID' ? (
                <Badge tone="danger" className="ml-2">
                  VOID
                </Badge>
              ) : null}
            </>
          ),
          sortValue: (row) => row.billNumber,
        },
        {
          key: 'buyerName',
          header: t('buyer'),
          cell: (row) => (
            <>
              <div>{row.buyerName}</div>
              {row.buyerPan ? (
                <div className="text-xs text-muted-foreground">PAN {row.buyerPan}</div>
              ) : null}
            </>
          ),
          sortValue: (row) => row.buyerName,
        },
        amount<SalesRow>('grossTotal', t('grossTotal')),
        amount<SalesRow>('discountTotal', t('discountTotal')),
        amount<SalesRow>('exemptTotal', t('exemptTotal')),
        amount<SalesRow>('taxableTotal', t('taxableTotal')),
        amount<SalesRow>('vatTotal', t('vatTotal')),
      ]}
    />
  );
}

// VAT per Nepali month of a fiscal year, for the monthly return.
export function VatReport() {
  const t = useTranslations('reports.columns');
  return (
    <ReportScreen<Vat, VatMonth>
      path="/admin/reports/vat-summary"
      filters={['fiscalYear']}
      rows={(data) => data.months}
      rowKey={(row) => String(row.bsMonth)}
      summary={(data) => <SalesTotals totals={data.totals} />}
      initialSort={{ key: 'bsMonth', direction: 'asc' }}
      columns={[
        {
          key: 'bsMonth',
          header: t('month'),
          cell: (row) => (
            <>
              {row.monthNe} <span className="text-muted-foreground">· {row.monthEn}</span>
            </>
          ),
          sortValue: (row) => row.bsMonth,
        },
        {
          key: 'bills',
          header: t('bills'),
          cell: (row) => row.bills,
          sortValue: (row) => row.bills,
          align: 'right',
        },
        amount<VatMonth>('grossTotal', t('grossTotal')),
        amount<VatMonth>('taxableTotal', t('taxableTotal')),
        amount<VatMonth>('exemptTotal', t('exemptTotal')),
        amount<VatMonth>('vatTotal', t('vatTotal')),
      ]}
    />
  );
}

// Money in and out per day and payment method.
export function DayBookReport() {
  const t = useTranslations('reports');
  const tc = useTranslations('reports.columns');
  return (
    <ReportScreen<DayBook, DayRow>
      path="/admin/reports/day-book"
      filters={['range', 'fiscalYear']}
      rows={(data) => data.rows}
      rowKey={(row) => `${row.day}-${row.method}`}
      summary={(data) => (
        <div className="grid gap-3 sm:grid-cols-4">
          <Figure label={tc('receipts')} value={money(data.totals.receipts)} />
          <Figure label={tc('refunds')} value={money(data.totals.refunds)} />
          <Figure label={tc('net')} value={money(data.totals.net)} />
          <Figure label={tc('count')} value={String(data.totals.count)} />
        </div>
      )}
      initialSort={{ key: 'day', direction: 'desc' }}
      columns={[
        {
          key: 'day',
          header: tc('date'),
          cell: (row) => formatDate(row.day, 'en'),
          sortValue: (row) => row.day,
        },
        {
          key: 'method',
          header: tc('method'),
          cell: (row) => t(`methods.${row.method}`),
          sortValue: (row) => row.method,
        },
        {
          key: 'count',
          header: tc('count'),
          cell: (row) => row.count,
          sortValue: (row) => row.count,
          align: 'right',
        },
        amount<DayRow>('receipts', tc('receipts')),
        amount<DayRow>('refunds', tc('refunds')),
        amount<DayRow>('net', tc('net')),
      ]}
    />
  );
}

// Who owes the shop, or is owed a refund, oldest first.
export function ReceivablesReport() {
  const tc = useTranslations('reports.columns');
  return (
    <ReportScreen<Receivables, Receivable>
      path="/admin/reports/receivables"
      paged
      filters={['kind']}
      rows={(data) => data.items}
      rowKey={(row) => row.orderId}
      summary={(data) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Figure label={tc('orders')} value={String(data.totals.orders)} />
          <Figure label={tc('outstanding')} value={money(data.totals.outstanding)} tone="danger" />
        </div>
      )}
      initialSort={{ key: 'ageDays', direction: 'desc' }}
      columns={[
        {
          key: 'orderNumber',
          header: tc('order'),
          cell: (row) => <span className="font-semibold">{row.orderNumber}</span>,
          sortValue: (row) => row.orderNumber,
        },
        {
          key: 'contactName',
          header: tc('buyer'),
          cell: (row) => (
            <>
              <div>{row.contactName ?? '—'}</div>
              <div className="text-xs text-muted-foreground">{row.contactPhone}</div>
            </>
          ),
          sortValue: (row) => row.contactName,
        },
        {
          key: 'ageDays',
          header: tc('age'),
          cell: (row) => tc('days', { days: row.ageDays }),
          sortValue: (row) => row.ageDays,
          align: 'right',
        },
        amount<Receivable>('total', tc('grossTotal')),
        amount<Receivable>('received', tc('receipts')),
        amount<Receivable>('outstanding', tc('outstanding')),
      ]}
    />
  );
}
