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

type PurchaseBook = Schema<'PurchaseBookResponse'>;
type PurchaseRow = PurchaseBook['items'][number];
type Profit = Schema<'ProfitAndLossResponse'>;
type StatementLine = {
  key: string;
  label: string;
  amount: string;
  strong?: boolean;
  indent?: boolean;
};

// खरिद खाता: posted supplier bills with the VAT paid, for the VAT return.
export function PurchaseBookReport() {
  const tc = useTranslations('reports.columns');
  return (
    <ReportScreen<PurchaseBook, PurchaseRow>
      path="/admin/reports/purchase-book"
      paged
      filters={['range', 'fiscalYear']}
      rows={(data) => data.items}
      rowKey={(row) => row.billId}
      summary={(data) => (
        <div className="grid gap-3 sm:grid-cols-4">
          <Figure label={tc('bills')} value={String(data.totals.bills)} />
          <Figure label={tc('taxableTotal')} value={money(data.totals.taxableTotal)} />
          <Figure label={tc('vatPaid')} value={money(data.totals.vatTotal)} />
          <Figure label={tc('grossTotal')} value={money(data.totals.total)} />
        </div>
      )}
      initialSort={{ key: 'date', direction: 'desc' }}
      columns={[
        {
          key: 'date',
          header: tc('date'),
          cell: (row) => formatDate(row.date, 'en'),
          sortValue: (row) => row.date,
        },
        {
          key: 'supplierName',
          header: tc('supplier'),
          cell: (row) => (
            <>
              <div>{row.supplierName}</div>
              <div className="text-xs text-muted-foreground">
                {row.supplierBillNumber}
                {row.supplierPan ? ` · PAN ${row.supplierPan}` : ''}
              </div>
            </>
          ),
          sortValue: (row) => row.supplierName,
        },
        amount<PurchaseRow>('taxableTotal', tc('taxableTotal')),
        amount<PurchaseRow>('exemptTotal', tc('exemptTotal')),
        amount<PurchaseRow>('vatTotal', tc('vatPaid')),
        amount<PurchaseRow>('total', tc('grossTotal')),
      ]}
    />
  );
}

// Sales less what they cost, stock written off and expenses; and the VAT to pay.
export function ProfitAndLossReport() {
  const t = useTranslations('reports.profit');
  const lines = (data: Profit): StatementLine[] => [
    { key: 'sales', label: t('sales'), amount: data.sales },
    { key: 'costOfSales', label: t('costOfSales'), amount: `-${data.costOfSales}` },
    { key: 'grossProfit', label: t('grossProfit'), amount: data.grossProfit, strong: true },
    { key: 'stockWrittenOff', label: t('stockWrittenOff'), amount: `-${data.stockWrittenOff}` },
    ...data.expenses.map((e) => ({
      key: `expense-${e.code}`,
      label: e.name,
      amount: `-${e.amount}`,
      indent: true,
    })),
    { key: 'totalExpenses', label: t('totalExpenses'), amount: `-${data.totalExpenses}` },
    { key: 'netProfit', label: t('netProfit'), amount: data.netProfit, strong: true },
  ];
  const shown = (amount: string) =>
    money(amount.startsWith('--') ? amount.slice(2) : amount.replace(/^-0\.00$/, '0.00'));
  return (
    <ReportScreen<Profit, StatementLine>
      path="/admin/reports/profit-and-loss"
      noExport
      filters={['range', 'fiscalYear']}
      rows={lines}
      rowKey={(row) => row.key}
      summary={(data) => (
        <div className="grid gap-3 sm:grid-cols-4">
          <Figure label={t('sales')} value={money(data.sales)} />
          <Figure label={t('grossProfit')} value={money(data.grossProfit)} />
          <Figure
            label={t('netProfit')}
            value={money(data.netProfit)}
            tone={Number(data.netProfit) < 0 ? 'danger' : undefined}
          />
          <Figure label={t('vatPayable')} value={money(data.vat.payable)} />
        </div>
      )}
      columns={[
        {
          key: 'label',
          header: t('line'),
          cell: (row) => (
            <span
              className={
                row.strong ? 'font-semibold' : row.indent ? 'pl-5 text-muted-foreground' : undefined
              }
            >
              {row.label}
            </span>
          ),
          filterValue: null,
        },
        {
          key: 'amount',
          header: t('amount'),
          cell: (row) => (
            <span className={row.strong ? 'font-semibold' : undefined}>{shown(row.amount)}</span>
          ),
          align: 'right',
          filterValue: null,
        },
      ]}
    />
  );
}
