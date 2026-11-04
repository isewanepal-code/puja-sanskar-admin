'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type ClipboardEvent } from 'react';

import { SearchSelect } from '@/components/controls';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { isApiError, request } from '@/lib/api';
import { cn } from '@/lib/utils';

import { schemaFor, toBody } from './form-values';
import { useResourceText } from './translate';
import type { Field, Resource } from './types';

type Row = Record<string, string>;
type Status = { state: 'saved' } | { state: 'failed'; message: string } | null;

const START_ROWS = 3;
const MAX_ROWS = 200;
const SHOWN_OPTIONAL = 3;

const emptyRow = (fields: Field[]): Row =>
  Object.fromEntries(fields.map((field) => [field.name, String(field.defaultValue ?? '')]));
const emptyRows = (count: number, fields: Field[]) =>
  Array.from({ length: count }, () => emptyRow(fields));
const isBlank = (row: Row, fields: Field[]) =>
  fields.every(
    (field) => !row[field.name]?.trim() || row[field.name] === String(field.defaultValue ?? ''),
  );

type BulkGridProps<T> = {
  resource: Resource<T>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Sent with every row: the group they are all added under.
  extraBody?: Record<string, unknown>;
  description?: string;
};

// Many records at once, typed or pasted from a spreadsheet; rows are saved in order.
// Staff pick how many rows and which optional columns; empty rows are skipped.
export function BulkGrid<T>({
  resource,
  open,
  onOpenChange,
  extraBody,
  description,
}: BulkGridProps<T>) {
  const t = useResourceText(resource.key);
  const tb = useTranslations('bulk');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const offered = (resource.bulk ?? [])
    .map((name) => resource.fields.find((field) => field.name === name))
    .filter((field): field is Field => !!field && field.kind !== 'switch');

  // Required columns always show, with the first few optional ones; staff turn on the rest.
  const [hidden, setHidden] = useState<string[]>(() =>
    offered
      .filter((field) => !field.required)
      .slice(SHOWN_OPTIONAL)
      .map((field) => field.name),
  );
  const fields = offered.filter((field) => field.required || !hidden.includes(field.name));
  const schema = schemaFor(fields);

  const [rows, setRows] = useState<Row[]>(() => emptyRows(START_ROWS, offered));
  const [count, setCount] = useState(String(START_ROWS));
  const [status, setStatus] = useState<Status[]>([]);
  const [saving, setSaving] = useState(false);

  const setCell = (r: number, name: string, value: string) =>
    setRows((current) => current.map((row, i) => (i === r ? { ...row, [name]: value } : row)));

  const resize = (wanted: number) => {
    const size = Math.max(1, Math.min(MAX_ROWS, wanted || 1));
    setCount(String(size));
    setRows((current) =>
      size >= current.length
        ? [...current, ...emptyRows(size - current.length, offered)]
        : // Shrinking drops empty rows from the end only; typed rows stay.
          current.filter((row, i) => i < size || !isBlank(row, offered)),
    );
  };

  const removeRow = (r: number) => {
    setRows((current) => (current.length > 1 ? current.filter((_, i) => i !== r) : current));
    setStatus((current) => current.filter((_, i) => i !== r));
    setCount((current) => String(Math.max(1, Number(current) - 1)));
  };

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
        next[at] = { ...(next[at] ?? emptyRow(offered)) };
        line.split('\t').forEach((value, j) => {
          const field = fields[c + j];
          if (field) next[at]![field.name] = value.trim();
        });
      });
      setCount(String(next.length));
      return next;
    });
  }

  async function save() {
    const filled = rows
      .map((row, i) => ({ row, i }))
      .filter(({ row, i }) => !isBlank(row, fields) && status[i]?.state !== 'saved');
    if (filled.length === 0) {
      toast.error(tb('nothing'));
      return;
    }

    const next = [...status];
    let invalid = false;
    for (const { row, i } of filled) {
      const parsed = schema.safeParse(row);
      const issue = parsed.success ? null : parsed.error.issues[0]!;
      const rule = issue ? null : resource.check?.(row);
      next[i] = issue
        ? { state: 'failed', message: `${t(`fields.${String(issue.path[0])}`)}: ${issue.message}` }
        : rule
          ? { state: 'failed', message: `${t(`fields.${rule.field}`)}: ${rule.message}` }
          : null;
      invalid ||= next[i] !== null;
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
        const fieldBody = toBody(fields, row, 'create');
        const body = resource.shapeBody ? resource.shapeBody(fieldBody) : fieldBody;
        await request(resource.submitMethod ?? 'POST', resource.path, {
          body: { ...body, ...extraBody },
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
      queryClient.invalidateQueries({ queryKey: [resource.scope ?? resource.key] }),
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
    setRows(emptyRows(START_ROWS, offered));
    setCount(String(START_ROWS));
    setStatus([]);
  }

  const optional = offered.filter((field) => !field.required);

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
          <Button variant="secondary" disabled={saving} onClick={() => onOpenChange(false)}>
            {tb('cancel')}
          </Button>
          <Button icon="upload" disabled={saving} onClick={save}>
            {saving ? tb('saving') : tb('save')}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-md bg-muted/60 px-3 py-2.5 text-sm">
        <label className="flex items-center gap-2">
          {tb('rows')}
          <Input
            type="number"
            min={1}
            max={MAX_ROWS}
            value={count}
            onChange={(event) => setCount(event.target.value)}
            onBlur={() => resize(Number(count))}
            onKeyDown={(event) => event.key === 'Enter' && resize(Number(count))}
            className="h-8 w-20"
          />
        </label>
        <Button variant="ghost" icon="plus" size="sm" onClick={() => resize(rows.length + 1)}>
          {tb('addRow')}
        </Button>
        {optional.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">{tb('columns')}</span>
            {optional.map((field) => {
              const on = !hidden.includes(field.name);
              return (
                <button
                  key={field.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setHidden((current) =>
                      on ? [...current, field.name] : current.filter((n) => n !== field.name),
                    )
                  }
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                    on
                      ? 'border-primary/40 bg-primary/8 text-primary'
                      : 'border-border text-muted-foreground hover:bg-card',
                  )}
                >
                  {on ? '✓ ' : '+ '}
                  {t(`fields.${field.name}`)}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="max-h-[55vh] overflow-auto rounded-md border border-border">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="w-10 border-r border-b border-border px-2 py-1.5 font-medium">#</th>
              {fields.map((field) => (
                <th
                  key={field.name}
                  className="min-w-40 border-r border-b border-border px-2 py-1.5 text-left font-medium whitespace-nowrap"
                >
                  {t(`fields.${field.name}`)}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </th>
              ))}
              <th className="w-16 border-b border-border" />
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
                  <td className="border-r border-b border-border px-2 text-center text-xs text-muted-foreground">
                    {r + 1}
                  </td>
                  {fields.map((field, c) => (
                    <td key={field.name} className="border-r border-b border-border p-0">
                      {field.kind === 'select' ? (
                        <SearchSelect
                          bare
                          source={field.optionsFrom}
                          options={field.options}
                          value={row[field.name] ?? ''}
                          disabled={done}
                          required={field.required}
                          placeholder=" "
                          aria-label={`${t(`fields.${field.name}`)} ${r + 1}`}
                          onChange={(value) => setCell(r, field.name, String(value))}
                        />
                      ) : (
                        <input
                          value={row[field.name] ?? ''}
                          disabled={done}
                          type={field.kind === 'date' ? 'date' : 'text'}
                          inputMode={
                            field.kind === 'money' || field.kind === 'number'
                              ? 'decimal'
                              : undefined
                          }
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
                  <td className="border-b border-border px-1 text-center whitespace-nowrap">
                    {done ? (
                      <Icon name="check" size={16} className="mx-auto text-success" />
                    ) : (
                      <span className="inline-flex items-center">
                        {state?.state === 'failed' ? (
                          <span title={state.message}>
                            <Icon name="info" size={16} className="text-destructive" />
                          </span>
                        ) : null}
                        <IconButton
                          icon="trash"
                          variant="danger"
                          label={tf('delete')}
                          disabled={saving || rows.length === 1}
                          onClick={() => removeRow(r)}
                        />
                      </span>
                    )}
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
