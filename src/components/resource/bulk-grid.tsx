'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type ClipboardEvent } from 'react';

import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, request } from '@/lib/api';
import { cn } from '@/lib/utils';

import { schemaFor, toBody } from './form-values';
import { useResourceText } from './translate';
import type { Field, Resource } from './types';

type Row = Record<string, string>;
type Status = { state: 'saved' } | { state: 'failed'; message: string } | null;

const START_ROWS = 8;
const MORE_ROWS = 5;

const emptyRow = (fields: Field[]): Row =>
  Object.fromEntries(fields.map((field) => [field.name, String(field.defaultValue ?? '')]));
const isBlank = (row: Row, fields: Field[]) => fields.every((field) => !row[field.name]?.trim());

function Options({ field }: { field: Field }) {
  const options = useQuery({
    queryKey: ['options', field.optionsFrom?.key],
    queryFn: () => field.optionsFrom!.load(),
    enabled: !!field.optionsFrom,
    staleTime: 5 * 60 * 1000,
  });
  return (
    <>
      <option value="" />
      {(field.options ?? options.data ?? []).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}

type BulkGridProps<T> = {
  resource: Resource<T>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Sent with every row: the group they are all added under.
  extraBody?: Record<string, unknown>;
  description?: string;
};

// Many records at once, typed or pasted from a spreadsheet; rows are saved in order.
export function BulkGrid<T>({
  resource,
  open,
  onOpenChange,
  extraBody,
  description,
}: BulkGridProps<T>) {
  const t = useResourceText(resource.key);
  const tb = useTranslations('bulk');
  const toast = useToast();
  const queryClient = useQueryClient();
  const fields = (resource.bulk ?? [])
    .map((name) => resource.fields.find((field) => field.name === name))
    .filter((field): field is Field => !!field);
  const schema = schemaFor(fields);

  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: START_ROWS }, () => emptyRow(fields)),
  );
  const [status, setStatus] = useState<Status[]>([]);
  const [saving, setSaving] = useState(false);

  const setCell = (r: number, name: string, value: string) =>
    setRows((current) => current.map((row, i) => (i === r ? { ...row, [name]: value } : row)));

  // A block copied from a spreadsheet fills the grid from the cell it is pasted into.
  function onPaste(event: ClipboardEvent, r: number, c: number) {
    const text = event.clipboardData.getData('text/plain');
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();
    const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n');
    setRows((current) => {
      const next = [...current];
      lines.forEach((line, i) => {
        const at = r + i;
        next[at] = { ...(next[at] ?? emptyRow(fields)) };
        line.split('\t').forEach((value, j) => {
          const field = fields[c + j];
          if (field) next[at]![field.name] = value.trim();
        });
      });
      return next;
    });
  }

  async function save() {
    const filled = rows
      .map((row, i) => ({ row, i }))
      .filter(({ row, i }) => !isBlank(row, fields) && status[i]?.state !== 'saved');
    if (filled.length === 0) return;

    const next = [...status];
    let invalid = false;
    for (const { row, i } of filled) {
      const parsed = schema.safeParse(row);
      if (!parsed.success) {
        const issue = parsed.error.issues[0]!;
        next[i] = {
          state: 'failed',
          message: `${t(`fields.${String(issue.path[0])}`)}: ${issue.message}`,
        };
        invalid = true;
      } else next[i] = null;
    }
    setStatus(next);
    if (invalid) {
      toast.error(tb('fixRows'));
      return;
    }

    setSaving(true);
    let saved = 0;
    // One at a time and in order, so numbered codes follow the rows.
    for (const { row, i } of filled) {
      try {
        await request('POST', resource.path, {
          body: { ...toBody(fields, row, 'create'), ...extraBody },
        });
        next[i] = { state: 'saved' };
        saved += 1;
      } catch (error) {
        next[i] = { state: 'failed', message: isApiError(error) ? error.message : tb('failed') };
      }
      setStatus([...next]);
    }
    setSaving(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [resource.key] }),
      queryClient.invalidateQueries({ queryKey: ['options'] }),
    ]);

    const failed = filled.length - saved;
    if (failed === 0) {
      toast.success(tb('saved', { count: saved }));
      reset();
      onOpenChange(false);
    } else {
      toast.error(tb('partly', { saved, failed }));
    }
  }

  function reset() {
    setRows(Array.from({ length: START_ROWS }, () => emptyRow(fields)));
    setStatus([]);
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) reset();
        if (!saving) onOpenChange(next);
      }}
      size="xl"
      title={tb('title', { what: t('title') })}
      description={description ?? tb('hint')}
      footer={
        <>
          <Button
            variant="ghost"
            icon="plus"
            className="mr-auto"
            onClick={() =>
              setRows((current) => [
                ...current,
                ...Array.from({ length: MORE_ROWS }, () => emptyRow(fields)),
              ])
            }
          >
            {tb('moreRows')}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => onOpenChange(false)}>
            {tb('cancel')}
          </Button>
          <Button icon="upload" disabled={saving} onClick={save}>
            {saving ? tb('saving') : tb('save')}
          </Button>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted text-xs text-muted-foreground">
              <th className="w-10 border border-border px-2 py-1.5 font-medium">#</th>
              {fields.map((field) => (
                <th
                  key={field.name}
                  className="min-w-40 border border-border px-2 py-1.5 text-left font-medium"
                >
                  {t(`fields.${field.name}`)}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </th>
              ))}
              <th className="w-10 border border-border" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => {
              const state = status[r];
              const done = state?.state === 'saved';
              return (
                <tr
                  key={r}
                  className={cn(
                    done && 'bg-success/8',
                    state?.state === 'failed' && 'bg-destructive/5',
                  )}
                >
                  <td className="border border-border px-2 text-center text-xs text-muted-foreground">
                    {r + 1}
                  </td>
                  {fields.map((field, c) => (
                    <td key={field.name} className="border border-border p-0">
                      {field.kind === 'select' ? (
                        <select
                          value={row[field.name] ?? ''}
                          disabled={done}
                          aria-label={`${t(`fields.${field.name}`)} ${r + 1}`}
                          onChange={(event) => setCell(r, field.name, event.target.value)}
                          className="h-8 w-full bg-transparent px-2 outline-none focus:bg-primary/5"
                        >
                          <Options field={field} />
                        </select>
                      ) : (
                        <input
                          value={row[field.name] ?? ''}
                          disabled={done}
                          aria-label={`${t(`fields.${field.name}`)} ${r + 1}`}
                          onChange={(event) => setCell(r, field.name, event.target.value)}
                          onPaste={(event) => onPaste(event, r, c)}
                          className={cn(
                            'h-8 w-full bg-transparent px-2 outline-none focus:bg-primary/5',
                            field.kind === 'code' && 'uppercase',
                          )}
                        />
                      )}
                    </td>
                  ))}
                  <td
                    className="border border-border text-center"
                    title={state?.state === 'failed' ? state.message : undefined}
                  >
                    {done ? <Icon name="check" size={16} className="mx-auto text-success" /> : null}
                    {state?.state === 'failed' ? (
                      <Icon name="info" size={16} className="mx-auto text-destructive" />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {status.some((s) => s?.state === 'failed') ? (
        <ul className="mt-3 grid gap-1 text-sm text-destructive">
          {status.map((s, i) =>
            s?.state === 'failed' ? (
              <li key={i}>
                {tb('row', { row: i + 1 })}: {s.message}
              </li>
            ) : null,
          )}
        </ul>
      ) : null}
    </Modal>
  );
}
