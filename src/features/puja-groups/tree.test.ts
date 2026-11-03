import { describe, expect, it } from 'vitest';

import { groupLabel, groupOptions, pathTo, type GroupNode } from './tree';

const node = (code: string, depth: number, children: GroupNode[] = []) =>
  ({
    id: code,
    code,
    nameNe: code,
    depth,
    ritualType: depth > 0 ? { code: 'PUJ' } : null,
    children,
  }) as GroupNode;

const tree = [node('H', 0, [node('H1', 1, [node('H1.1', 2)]), node('H2', 1)]), node('B', 0)];

describe('puja group tree', () => {
  it('should find the path from the top down to a group', () => {
    expect(pathTo(tree, 'H1.1').map((g) => g.code)).toEqual(['H', 'H1', 'H1.1']);
    expect(pathTo(tree, 'missing')).toEqual([]);
    expect(pathTo(tree, undefined)).toEqual([]);
  });

  it('should write a group as the mapping sheet does', () => {
    expect(groupLabel(node('H1', 1))).toBe('[H1] H1 (PUJ)');
    expect(groupLabel(node('H', 0))).toBe('[H] H');
  });

  it('should list every group in tree order', () => {
    expect(groupOptions(tree).map((o) => o.label)).toEqual([
      '[H] H',
      '[H1] H1 (PUJ)',
      '[H1.1] H1.1 (PUJ)',
      '[H2] H2 (PUJ)',
      '[B] B',
    ]);
  });
});
