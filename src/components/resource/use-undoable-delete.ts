import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/overlays';
import { isApiError, request } from '@/lib/api';

import type { Resource } from './types';

// How long a deleted record can still be brought back.
const UNDO_MS = 10_000;

// Deleted rows wait here for ten seconds, out of the list, so Undo can still bring them back.
// The delete is sent after that unless Undo was pressed. If the screen is left first it is sent at
// once, so a confirmed delete is never lost; a closed tab leaves the record where it was.
export function useUndoableDelete<T>(resource: Resource<T>) {
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const waiting = useRef(
    new Map<string, { run: () => void; timer: ReturnType<typeof setTimeout> }>(),
  );
  const scope = resource.scope ?? resource.key;

  const unhide = useCallback(
    (id: string) =>
      setHidden((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      }),
    [],
  );

  const schedule = (row: T) => {
    const id = resource.rowId(row);
    const send = async () => {
      waiting.current.delete(id);
      try {
        await request('DELETE', `${resource.path}/${id}`);
        await queryClient.invalidateQueries({ queryKey: [scope] });
      } catch (error) {
        toast.error(isApiError(error) ? error.message : tf('failed'));
      } finally {
        unhide(id);
      }
    };
    const timer = setTimeout(() => void send(), UNDO_MS);
    waiting.current.set(id, { run: () => void send(), timer });
    setHidden((current) => new Set(current).add(id));
    toast.info(tf('deletedUndo', { name: resource.rowLabel(row) }), {
      durationMs: UNDO_MS,
      action: {
        label: tf('undo'),
        onClick: () => {
          const held = waiting.current.get(id);
          if (!held) return;
          clearTimeout(held.timer);
          waiting.current.delete(id);
          unhide(id);
        },
      },
    });
  };

  useEffect(() => {
    const held = waiting.current;
    return () => {
      for (const { run, timer } of held.values()) {
        clearTimeout(timer);
        run();
      }
    };
  }, []);

  return { hidden, schedule };
}
