'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useToast } from '@/components/overlays';
import { Button, IconButton } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { InfoTip } from '@/components/ui/info-tip';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { isApiError, request } from '@/lib/api';

import { BulkGrid } from './bulk-grid';
import { ExportButton } from './export-button';
import { InlineNumber } from './inline-number';
import { InlineToggle } from './inline-toggle';
import { ConfirmDelete, type Usage } from './confirm-delete';
import { ReorderModal } from './reorder-modal';
import { ResourceForm } from './resource-form';
import { useResourceText } from './translate';
import type { Resource } from './types';

// How long a deleted record can still be brought back.
const UNDO_MS = 10_000;

type Page<T> = { items: T[]; meta: { page: number; totalPages: number; total: number } };

type ResourceScreenProps<T> = {
  resource: Resource<T>;
  // More actions on a row, before edit and delete (open its items, verify…).
  rowActions?: (row: T) => ReactNode;
  // Above the table, beside the search (a bulk-entry button…).
  toolbar?: ReactNode;
  // After a new record is saved: open what comes next for it (a kit's items…).
  onCreated?: (row: T) => void;
  // Under the form of a saved record: what belongs to it (an item's packs and prices…).
  editFooter?: (row: T) => ReactNode;
  // A page of its own: `?q=` fills the search and `?open=<id>` opens that record (the global search links here).
  deepLink?: boolean;
};

// Any resource's list with search, sorting, paging and its create, edit and delete modals.
export function ResourceScreen<T>({
  resource,
  rowActions,
  toolbar,
  onCreated,
  editFooter,
  deepLink = false,
}: ResourceScreenProps<T>) {
  const t = useResourceText(resource.key);
  const tf = useTranslations('forms');
  const tt = useTranslations('table');
  const toast = useToast();
  const queryClient = useQueryClient();
  const formId = useId();

  const params = useSearchParams();
  const [search, setSearch] = useState(deepLink ? (params.get('q') ?? '') : '');
  const openId = deepLink ? params.get('open') : null;
  // The record a link asked for opens once, as soon as the list has it; closing it keeps it closed.
  const [dismissed, setDismissed] = useState(false);
  // Text typed under the headings of a paged list joins the search box: the API looks on every page.
  const [columnText, setColumnText] = useState<Record<string, string>>({});
  const query = useDeferredValue(
    [search, ...Object.values(columnText)]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' '),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [chosen, setEditing] = useState<T | 'new' | null>(null);
  const [removing, setRemoving] = useState<T | null>(null);
  // Deleted rows wait here for ten seconds, out of the list, so Undo can still bring them back.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const waiting = useRef(
    new Map<string, { run: () => void; timer: ReturnType<typeof setTimeout> }>(),
  );
  const [saving, setSaving] = useState(false);
  // "Save and add another" keeps the modal and starts a blank form.
  const again = useRef(false);
  const [round, setRound] = useState(0);
  const [bulk, setBulk] = useState(false);
  const [arranging, setArranging] = useState(false);

  const list = useQuery({
    queryKey: [
      resource.scope ?? resource.key,
      resource.path,
      resource.listQuery ?? {},
      resource.list === 'paged' ? { q: query, page, pageSize } : 'all',
    ],
    queryFn: async (): Promise<Page<T>> => {
      if (resource.list === 'all') {
        const items = resource.loadAll
          ? await resource.loadAll()
          : await request<T[]>('GET', resource.path, { query: resource.listQuery });
        return { items, meta: { page: 1, totalPages: 1, total: items.length } };
      }
      return request<Page<T>>('GET', resource.path, {
        query: {
          ...resource.listQuery,
          ...(resource.searchable !== false && { q: query }),
          page,
          limit: pageSize,
        },
      });
    },
    placeholderData: keepPreviousData,
  });

  const shownRows = (list.data?.items ?? []).filter((row) => !hidden.has(resource.rowId(row)));
  const rows =
    resource.list === 'all' && query && resource.matches
      ? shownRows.filter((row) => resource.matches!(row, query.toLowerCase()))
      : shownRows;

  const linked =
    openId && !dismissed && resource.canEdit !== false
      ? rows.find((row) => resource.rowId(row) === openId)
      : undefined;
  const editing = chosen ?? linked ?? null;

  // Where the row about to be deleted is used: a row in use cannot be deleted.
  const usage = useQuery({
    queryKey: ['usage', removing && resource.usagePath ? resource.usagePath(removing) : null],
    queryFn: () => request<Usage>('GET', resource.usagePath!(removing!)),
    enabled: removing !== null && resource.usagePath !== undefined,
    staleTime: 0,
    gcTime: 0,
  });
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
  // The delete is sent after ten seconds unless Undo was pressed. If the page is left first it is sent
  // at once, so a confirmed delete is never lost; a closed tab leaves the record where it was.
  const scheduleDelete = (row: T) => {
    const id = resource.rowId(row);
    const name = resource.rowLabel(row);
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
    setRemoving(null);
    toast.info(tf('deletedUndo', { name }), {
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

  const closeEditing = () => {
    setEditing(null);
    setDismissed(true);
  };

  const meta = list.data?.meta;
  const canCreate = resource.canCreate !== false;
  const canEdit = resource.canEdit !== false;
  // No buttons on any row: no actions column.
  const hasActions = !!rowActions || canEdit || resource.canDelete !== false;

  // A column showing an on/off field of the form becomes a switch staff flip in the list.
  const switches = new Set(
    resource.fields
      .filter((field) => field.kind === 'switch' && !field.createOnly)
      .map((f) => f.name),
  );
  const columns: Column<T>[] = resource.columns.map((column) => {
    const header = t(`fields.${column.key}`);
    // resources.<key>.columnHelp.<column>, when written, explains the heading in plain words.
    const help = t.has(`columnHelp.${column.key}`) ? t(`columnHelp.${column.key}`) : undefined;
    const inline = canEdit ? resource.inline?.[column.key] : undefined;
    if (inline) {
      return {
        ...column,
        header,
        help,
        cell: (row: T) => {
          const start = inline.value(row);
          return (
            <InlineNumber
              display={column.cell(row)}
              initial={start === null || start === undefined ? '' : String(start)}
              type={inline.type}
              allowZero={inline.allowZero}
              label={`${header}: ${resource.rowLabel(row)}`}
              onSave={async (value) => {
                await (inline.save
                  ? inline.save(row, value)
                  : request('PATCH', `${resource.path}/${resource.rowId(row)}`, {
                      body: { [column.key]: value },
                    }));
                await queryClient.invalidateQueries({ queryKey: [scope] });
              }}
            />
          );
        },
      };
    }
    if (!canEdit || resource.singleton || !switches.has(column.key) || !column.sortValue) {
      return { ...column, header, help };
    }
    const on = column.sortValue;
    return {
      ...column,
      header,
      help,
      cell: (row: T) => (
        <InlineToggle
          path={`${resource.path}/${resource.rowId(row)}`}
          field={column.key}
          on={on(row) === true}
          label={`${header}: ${resource.rowLabel(row)}`}
          scope={resource.scope ?? resource.key}
        />
      ),
    };
  });

  // The order is dragged, so the form has no number to type.
  const formResource = resource.reorder
    ? { ...resource, fields: resource.fields.filter((field) => field.name !== 'sortOrder') }
    : resource;

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {resource.searchable !== false ? (
          <Input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={tt('search')}
            aria-label={tt('search')}
            className="sm:w-72"
          />
        ) : null}
        {meta ? (
          <span className="text-sm text-muted-foreground">
            {tt('count', { total: meta.total })}
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {t.has('about') ? (
            <InfoTip text={t('about')} label={tf('howItWorks')} align="right" />
          ) : null}
          {toolbar}
          {resource.exportPath ? (
            <ExportButton
              path={resource.exportPath}
              query={{ ...resource.listQuery, ...(resource.searchable !== false && { q: query }) }}
            />
          ) : null}
          {resource.reorder && !resource.singleton ? (
            <Button variant="secondary" icon="list" onClick={() => setArranging(true)}>
              {tf('arrange')}
            </Button>
          ) : null}
          {resource.bulk ? (
            <Button variant="secondary" icon="list" onClick={() => setBulk(true)}>
              {tf('bulkAdd')}
            </Button>
          ) : null}
          {canCreate ? (
            <Button icon="plus" onClick={() => setEditing('new')}>
              {t('add')}
            </Button>
          ) : null}
        </div>
      </div>

      {list.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {isApiError(list.error) ? list.error.message : tt('failed')}
        </p>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={resource.rowId}
        loading={list.isPending}
        initialSort={resource.initialSort}
        empty={t('empty')}
        onRowClick={canEdit ? (row) => setEditing(row) : undefined}
        onTextSearch={
          resource.list === 'paged' && resource.searchable !== false
            ? (texts) => {
                setColumnText(texts);
                setPage(1);
              }
            : undefined
        }
        actions={
          hasActions
            ? (row) => (
                <div className="inline-flex items-center gap-0.5">
                  {rowActions?.(row)}
                  {canEdit ? (
                    <IconButton icon="edit" label={tf('edit')} onClick={() => setEditing(row)} />
                  ) : null}
                  {resource.canDelete !== false ? (
                    <IconButton
                      icon="trash"
                      variant="danger"
                      label={tf('delete')}
                      onClick={() => setRemoving(row)}
                    />
                  ) : null}
                </div>
              )
            : undefined
        }
      />

      {meta && resource.list === 'paged' && meta.total > 0 ? (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}

      <Modal
        open={editing !== null}
        onOpenChange={(open) => (open ? undefined : closeEditing())}
        size={resource.modalSize ?? 'md'}
        resetKey={round}
        title={
          editing === 'new' || editing === null
            ? t('add')
            : tf('editing', { name: resource.rowLabel(editing) })
        }
        description={
          t.has('aboutForm')
            ? t('aboutForm')
            : editing === 'new'
              ? tf('aboutCreate')
              : tf('aboutEdit')
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeEditing}>
              {tf('cancel')}
            </Button>
            {editing === 'new' && !onCreated ? (
              <Button
                type="submit"
                form={formId}
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  again.current = true;
                }}
              >
                {tf('saveAndAdd')}
              </Button>
            ) : null}
            <Button
              type="submit"
              form={formId}
              disabled={saving}
              onClick={() => {
                again.current = false;
              }}
            >
              {saving ? tf('saving') : editing === 'new' ? tf('create') : tf('save')}
            </Button>
          </>
        }
      >
        {editing !== null ? (
          <ResourceForm
            key={editing === 'new' ? `new-${round}` : resource.rowId(editing)}
            resource={formResource}
            row={editing === 'new' ? undefined : editing}
            formId={formId}
            onPendingChange={setSaving}
            onDone={(saved) => {
              if (editing === 'new' && again.current) {
                // Saved; the same modal starts a blank form, with the cursor in the first box.
                again.current = false;
                setRound((n) => n + 1);
                setTimeout(
                  () =>
                    document
                      .querySelector<HTMLElement>(
                        '[role=dialog] input:not([type=hidden]):not([disabled]), [role=dialog] textarea',
                      )
                      ?.focus(),
                  80,
                );
                return;
              }
              if (editing === 'new' && saved) onCreated?.(saved as T);
              closeEditing();
            }}
          />
        ) : null}
        {editing !== null && editing !== 'new' ? editFooter?.(editing) : null}
      </Modal>

      {resource.reorder ? (
        <ReorderModal resource={resource} open={arranging} onOpenChange={setArranging} />
      ) : null}

      {resource.bulk ? <BulkGrid resource={resource} open={bulk} onOpenChange={setBulk} /> : null}

      <ConfirmDelete
        name={removing ? resource.rowLabel(removing) : null}
        usage={resource.usagePath === undefined ? null : usage.isError ? null : usage.data}
        pending={false}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && scheduleDelete(removing)}
      />
    </div>
  );
}
