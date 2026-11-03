import type { Schema } from '@/lib/api';

export type GroupNode = Schema<'AdminPujaGroupTreeResponse'>;
export type Catalogue = Schema<'AdminPujaGroupCatalogueResponse'>;
export type GroupOption = { id: string; label: string; depth: number };

// The groups from the top down to the one asked for; empty when it is not in the tree.
export function pathTo(roots: GroupNode[], id: string | undefined): GroupNode[] {
  if (!id) return [];
  for (const node of roots) {
    if (node.id === id) return [node];
    const below = pathTo(node.children, id);
    if (below.length > 0) return [node, ...below];
  }
  return [];
}

// "[H1] दैनिक तथा नियमित पूजा (PUJ)", the way the mapping sheet writes a group.
export const groupLabel = (group: Pick<GroupNode, 'code' | 'nameNe' | 'ritualType'>) =>
  `[${group.code}] ${group.nameNe}${group.ritualType ? ` (${group.ritualType.code})` : ''}`;

// Every group in tree order, for a select that shows the depth.
export function groupOptions(roots: GroupNode[]): GroupOption[] {
  return roots.flatMap((node) => [
    { id: node.id, label: groupLabel(node), depth: node.depth },
    ...groupOptions(node.children),
  ]);
}

export function levelName(catalogue: Pick<Catalogue, 'levels'>, depth: number) {
  return catalogue.levels.find((level) => level.depth === depth) ?? null;
}
