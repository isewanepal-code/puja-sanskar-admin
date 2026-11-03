import { activeColumn, type Resource } from '@/components/resource';
import { type Schema } from '@/lib/api';

type Mantra = Schema<'AdminMantraResponse'>;

export const mantrasResource: Resource<Mantra> = {
  key: 'mantras',
  path: '/admin/mantras',
  list: 'paged',
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.code} · ${row.nameNe}`,
  initialSort: { key: 'sortOrder', direction: 'asc' },
  modalSize: 'lg',
  bulk: ['code', 'nameNe', 'nameEn', 'text'],
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
          <div className="text-xs text-muted-foreground">{row.nameEn}</div>
        </>
      ),
      sortValue: (row) => row.nameNe,
    },
    {
      key: 'durationSeconds',
      cell: (row) => (row.durationSeconds ? `${row.durationSeconds}s` : '—'),
      sortValue: (row) => row.durationSeconds,
    },
    { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
    activeColumn(),
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    { name: 'nameNe', kind: 'text', required: true, max: 160 },
    { name: 'nameEn', kind: 'text', required: true, max: 160 },
    { name: 'text', kind: 'textarea', required: true, max: 2000 },
    { name: 'romanized', kind: 'textarea', max: 2000 },
    { name: 'audioUrl', kind: 'url', max: 2048, wide: true },
    { name: 'durationSeconds', kind: 'number' },
    { name: 'sortOrder', kind: 'number' },
    { name: 'slug', kind: 'slug', max: 160, wide: true },
    { name: 'isActive', kind: 'switch' },
  ],
};
