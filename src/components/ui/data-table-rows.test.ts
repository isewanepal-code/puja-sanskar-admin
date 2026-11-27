import { describe, expect, it } from 'vitest';

import { compare, filterRows, groupRows, sortRows, yesNoColumns } from './data-table-rows';
import type { Column } from './data-table-types';

type Row = { name: string; qty: number; live: boolean; kind: string };

const rows: Row[] = [
  { name: 'Ghee', qty: 10, live: true, kind: 'oil' },
  { name: 'Camphor', qty: 2, live: false, kind: 'resin' },
  { name: 'Oil lamp', qty: 30, live: true, kind: 'oil' },
];

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
  { key: 'qty', header: 'Qty', cell: (r) => r.qty, sortValue: (r) => r.qty },
  { key: 'live', header: 'Live', cell: (r) => String(r.live), sortValue: (r) => r.live },
  { key: 'raw', header: 'Raw', cell: () => null, filterValue: null },
];

describe('compare', () => {
  it('puts numbers in order, and nothing last', () => {
    expect(compare(2, 10)).toBeLessThan(0);
    expect(compare(null, 1)).toBeGreaterThan(0);
    expect(compare('a2', 'a10')).toBeLessThan(0);
  });
});

describe('yesNoColumns', () => {
  it('finds the columns whose search text is yes or no', () => {
    expect([...yesNoColumns(columns, rows[0])]).toEqual(['live']);
    expect(yesNoColumns(columns, undefined).size).toBe(0);
  });
});

describe('filterRows', () => {
  it('keeps every row without a search', () => {
    expect(filterRows(rows, columns, [])).toBe(rows);
  });

  it('matches text in part, ignoring case', () => {
    expect(filterRows(rows, columns, [['name', 'OIL']]).map((r) => r.name)).toEqual(['Oil lamp']);
  });

  it('matches a yes or no exactly, and needs every search to match', () => {
    expect(filterRows(rows, columns, [['live', 'false']]).map((r) => r.name)).toEqual(['Camphor']);
    expect(
      filterRows(rows, columns, [
        ['live', 'true'],
        ['name', 'ghee'],
      ]),
    ).toHaveLength(1);
  });
});

describe('sortRows', () => {
  it('sorts by a column, either way, and leaves the input alone', () => {
    const asc = sortRows(rows, columns, { key: 'qty', direction: 'asc' });
    expect(asc.map((r) => r.qty)).toEqual([2, 10, 30]);
    expect(sortRows(rows, columns, { key: 'qty', direction: 'desc' }).map((r) => r.qty)).toEqual([
      30, 10, 2,
    ]);
    expect(rows[0]!.qty).toBe(10);
  });

  it('keeps the order for a column that does not sort', () => {
    expect(sortRows(rows, columns, { key: 'raw', direction: 'asc' })).toBe(rows);
  });
});

describe('groupRows', () => {
  const by = (order: string[]) => ({ of: (r: Row) => r.kind, label: (k: string) => k, order });

  it('brings rows of one heading together, in the given heading order', () => {
    const grouped = groupRows(rows, by(['resin', 'oil']));
    expect(grouped.map((r) => r.name)).toEqual(['Camphor', 'Ghee', 'Oil lamp']);
  });

  it('without an order, a heading stands where its first row is', () => {
    expect(groupRows(rows, by([])).map((r) => r.name)).toEqual(['Ghee', 'Oil lamp', 'Camphor']);
  });

  it('is the same list without grouping', () => {
    expect(groupRows(rows, undefined)).toBe(rows);
  });
});
