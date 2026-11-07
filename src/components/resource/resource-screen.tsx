'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useId, useState, type ReactNode } from 'react';

import { useToast } from '@/components/overlays';
import { Button, IconButton } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { isApiError, request } from '@/lib/api';

import { BulkGrid } from './bulk-grid';
import { ExportButton } from './export-button';
import { InlineToggle } from './inline-toggle';
import { ConfirmDelete } from './confirm-delete';
import { ReorderModal } from './reorder-modal';
import { ResourceForm } from './resource-form';
import { useResourceText } from './translate';
import type { Resource } from './types';

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
};

// Any resource's list with search, sorting, paging and its create, edit and delete modals.
export function ResourceScreen<T>({
  resource,
  rowActions,
  toolbar,
  onCreated,
  editFooter,
}: ResourceScreenProps<T>) {
  const t = useResourceText(resource.key);
  const tf = useTranslations('forms');
  const tt = useTranslations('table');
  const toast = useToast();
  const queryClient = useQueryClient();
  const formId = useId();

  const [search, setSearch] = useState('');
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
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [removing, setRemoving] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
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

  const rows =
    resource.list === 'all' && query && resource.matches
      ? (list.data?.items ?? []).filter((row) => resource.matches!(row, query.toLowerCase()))
      : (list.data?.items ?? []);

  const remove = useMutation({
    mutationFn: (row: T) => request('DELETE', `${resource.path}/${resource.rowId(row)}`),
    onSuccess: async () => {
      toast.success(tf('deleted'));
      setRemoving(null);
      await queryClient.invalidateQueries({ queryKey: [resource.scope ?? resource.key] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

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
    if (!canEdit || resource.singleton || !switches.has(column.key) || !column.sortValue) {
      return { ...column, header };
    }
    const on = column.sortValue;
    return {
      ...column,
      header,
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
        onOpenChange={(open) => (open ? undefined : setEditing(null))}
        size={resource.modalSize ?? 'md'}
        title={
          editing === 'new' || editing === null
            ? t('add')
            : tf('editing', { name: resource.rowLabel(editing) })
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {tf('cancel')}
            </Button>
            <Button type="submit" form={formId} disabled={saving}>
              {saving ? tf('saving') : editing === 'new' ? tf('create') : tf('save')}
            </Button>
          </>
        }
      >
        {editing !== null ? (
          <ResourceForm
            key={editing === 'new' ? 'new' : resource.rowId(editing)}
            resource={formResource}
            row={editing === 'new' ? undefined : editing}
            formId={formId}
            onPendingChange={setSaving}
            onDone={(saved) => {
              if (editing === 'new' && saved) onCreated?.(saved as T);
              setEditing(null);
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
        pending={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </div>
  );
}
