import { RecordCell } from '@/components/display';

import { ActiveBadge } from './active-badge';
import type { Cell } from './types';

type Named = { nameNe: string; nameEn?: string | null };

// The columns most lists share, written once.

export const codeColumn = <T extends { code: string }>(): Cell<T> => ({
  key: 'code',
  cell: (row) => <span className="font-mono text-[0.8rem] font-semibold">{row.code}</span>,
  sortValue: (row) => row.code,
});

// On a list that can be edited, this column becomes a switch (ResourceScreen).
export const activeColumn = <T extends { isActive: boolean }>(): Cell<T> => ({
  key: 'isActive',
  cell: (row) => <ActiveBadge on={row.isActive} />,
  sortValue: (row) => row.isActive,
});

// A record on one line: its picture, Nepali name, English name and code.
export function recordColumn<T extends Named>(
  key = 'nameNe',
  more: {
    image?: (row: T) => string | null | undefined;
    chip?: (row: T) => string | null | undefined;
    code?: (row: T) => string | null | undefined;
    also?: (row: T) => string | null | undefined;
  } = {},
): Cell<T> {
  return {
    key,
    cell: (row) => (
      <RecordCell
        title={row.nameNe}
        also={more.also ? more.also(row) : row.nameEn}
        chip={more.chip?.(row)}
        code={more.code?.(row)}
        image={more.image ? (more.image(row) ?? null) : undefined}
      />
    ),
    sortValue: (row) => row.nameNe,
    filterValue: (row) =>
      [row.nameNe, row.nameEn, more.code?.(row), more.chip?.(row)].filter(Boolean).join(' '),
  };
}
