'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, request } from '@/lib/api';
import { cn } from '@/lib/utils';

import type { Resource } from './types';

type Page<T> = { items: T[]; meta: { totalPages: number } };

const PAGE_SIZE = 100;
const orderOf = (row: unknown) => (row as { sortOrder?: number }).sortOrder ?? 0;

// Every row of the list, whole: a paged list is read page by page.
async function loadEvery<T>(resource: Resource<T>): Promise<T[]> {
  if (resource.list === 'all') {
    return resource.loadAll
      ? resource.loadAll()
      : request<T[]>('GET', resource.path, { query: resource.listQuery });
  }
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const result = await request<Page<T>>('GET', resource.path, {
      query: { ...resource.listQuery, page, pageSize: PAGE_SIZE },
    });
    rows.push(...result.items);
    if (page >= result.meta.totalPages) return rows;
  }
}

function SortableRow({
  id,
  label,
  position,
  children,
}: {
  id: string;
  label: string;
  position: number;
  children: React.ReactNode;
}) {
  const tf = useTranslations('forms');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2',
        isDragging && 'relative z-10 shadow-lg ring-2 ring-primary/40',
      )}
    >
      <button
        type="button"
        className="inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={tf('arrangeHandle', { name: label })}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={18} aria-hidden="true" />
      </button>
      <span className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
        {position}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

type ReorderModalProps<T> = {
  resource: Resource<T>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// The website shows a list in the order set here: drag rows, then save once.
export function ReorderModal<T>({ resource, open, onOpenChange }: ReorderModalProps<T>) {
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  // Set once a row is dragged; until then the list is in the order the website uses now.
  const [dragged, setDragged] = useState<string[] | null>(null);

  const list = useQuery({
    queryKey: [resource.scope ?? resource.key, resource.path, 'arrange'],
    queryFn: () => loadEvery(resource),
    enabled: open,
    gcTime: 0,
  });

  const rows = useMemo(() => {
    const sorted = [...(list.data ?? [])].sort((a, b) => orderOf(a) - orderOf(b));
    if (!dragged) return sorted;
    const byId = new Map(sorted.map((row) => [resource.rowId(row), row]));
    return dragged.flatMap((id) => byId.get(id) ?? []);
  }, [list.data, dragged, resource]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = rows.map(resource.rowId);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setDragged(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  const save = useMutation({
    mutationFn: async () => {
      // Only the rows that moved are sent.
      const moved = rows.flatMap((row, index) =>
        orderOf(row) === index ? [] : [{ id: resource.rowId(row), sortOrder: index }],
      );
      for (const { id, sortOrder } of moved) {
        await request('PATCH', `${resource.path}/${id}`, { body: { sortOrder } });
      }
    },
    onSuccess: async () => {
      toast.success(tf('orderSaved'));
      await queryClient.invalidateQueries({ queryKey: [resource.scope ?? resource.key] });
      close();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const first = resource.columns[0];
  const close = () => {
    setDragged(null);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      size="md"
      title={tf('arrange')}
      description={tf('arrangeNote')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {tf('cancel')}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || rows.length < 2}>
            {save.isPending ? tf('saving') : tf('saveOrder')}
          </Button>
        </>
      }
    >
      {list.isPending ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tf('nothingToArrange')}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ol className="grid gap-2">
              {rows.map((row, index) => (
                <SortableRow
                  key={resource.rowId(row)}
                  id={resource.rowId(row)}
                  label={resource.rowLabel(row)}
                  position={index + 1}
                >
                  {first ? first.cell(row) : resource.rowLabel(row)}
                </SortableRow>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </Modal>
  );
}
