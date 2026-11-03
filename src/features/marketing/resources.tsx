import { ActiveBadge, type Resource } from '@/components/resource';
import { formatMoney } from '@/lib/format';
import type { Schema } from '@/lib/api';

type Pandit = Schema<'AdminPanditResponse'>;

export const panditsResource: Resource<Pandit> = {
  key: 'pandits',
  path: '/admin/pandits',
  list: 'paged',
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.code} · ${row.nameNe}`,
  initialSort: { key: 'sortOrder', direction: 'asc' },
  modalSize: 'lg',
  bulk: ['code', 'referralCode', 'nameNe', 'nameEn', 'area', 'phone'],
  columns: [
    {
      key: 'code',
      cell: (row) => <span className="font-semibold">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      key: 'nameNe',
      cell: (row) => (
        <>
          <div>{row.nameNe}</div>
          <div className="text-xs text-muted-foreground">{row.area ?? row.nameEn}</div>
        </>
      ),
      sortValue: (row) => row.nameNe,
    },
    { key: 'referralCode', cell: (row) => row.referralCode, sortValue: (row) => row.referralCode },
    {
      key: 'ordersBrought',
      cell: (row) => row.ordersBrought,
      sortValue: (row) => row.ordersBrought,
      align: 'right',
    },
    {
      key: 'salesBrought',
      cell: (row) => formatMoney(row.salesBrought, 'en'),
      sortValue: (row) => Number(row.salesBrought),
      align: 'right',
    },
    { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
    {
      key: 'isActive',
      cell: (row) => <ActiveBadge on={row.isActive} />,
      sortValue: (row) => row.isActive,
    },
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    {
      name: 'referralCode',
      kind: 'code',
      required: true,
      pattern: {
        regex: /^[A-Z0-9][A-Z0-9-]{2,31}$/,
        message: 'Capital letters, digits or -, such as PANDIT-RAM',
      },
    },
    { name: 'nameNe', kind: 'text', required: true, max: 160 },
    { name: 'nameEn', kind: 'text', required: true, max: 160 },
    { name: 'area', kind: 'text', max: 120 },
    {
      name: 'phone',
      kind: 'text',
      pattern: { regex: /^\+?[0-9]{7,15}$/, message: 'Digits only, such as 9801234567' },
    },
    { name: 'customerDiscountPercent', kind: 'percent', section: 'terms' },
    { name: 'commissionPercent', kind: 'percent' },
    { name: 'photoUrl', kind: 'image', max: 2048, section: 'profile', wide: true },
    { name: 'bioNe', kind: 'html', max: 1000 },
    { name: 'bioEn', kind: 'html', max: 1000 },
    { name: 'sortOrder', kind: 'number' },
    { name: 'slug', kind: 'slug', max: 160 },
    { name: 'isActive', kind: 'switch' },
  ],
};
