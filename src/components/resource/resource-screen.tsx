'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useState, type ReactNode } from 'react';

import { Button, IconButton } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { InfoTip } from '@/components/ui/info-tip';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { isApiError, request } from '@/lib/api';
import { searchKey } from '@/lib/nepali-fold';

import { BulkGrid } from './bulk-grid';
import { ExportButton } from './export-button';
import { ConfirmDelete, type Usage } from './confirm-delete';
import { ReorderModal } from './reorder-modal';
import { resourceColumns } from './resource-columns';
import { ResourceFormModal } from './resource-form-modal';
import { useUndoableDelete } from './use-undoable-delete';
import { useResourceText, type Translate } from './translate';
import type { Resource } from './types';

type Page<T> = { items: T[]; meta: { page: number; totalPages: number; total: number } };

type ResourceScreenProps<T> = {
  resource: Resource<T>;
  // More actions on a row, before edit and delete (open its items, verify…).
  rowActions?: (row: T) => ReactNode;
  // Above the table, beside the search (a bulk-entry button…).
  toolbar?: ReactNode;
  // The tooltip of the edit pen when "Edit" is too short to say what is changed.
  editLabel?: string;
  // Pressing a row opens its edit form; off, only the pen does.
  editOnRowClick?: boolean;
  // After a new record is saved: open what comes next for it (a kit's items…).
  onCreated?: (row: T) => void;
  // Under the form of a saved record: what belongs to it (an item's packs and prices…).
  editFooter?: (row: T) => ReactNode;
  // A page of its own: `?q=` fills the search and `?open=<id>` opens that record (the global search links here).
  deepLink?: boolean;
  // New and edit are pages of their own (as for items), not forms in a window: where each one is.
  pages?: { create: string; edit: (row: T) => string };
};

// Any resource's list with search, sorting, paging and its create, edit and delete modals.
export function ResourceScreen<T>({
  resource,
  rowActions,
  editLabel,
  editOnRowClick = true,
  toolbar,
  onCreated,
  editFooter,
  deepLink = false,
  pages,
}: ResourceScreenProps<T>) {
  const router = useRouter();
  const t = useResourceText(resource.key);
  const guide = useTranslations('fieldGuide') as unknown as Translate;
  const tf = useTranslations('forms');
  const tt = useTranslations('table');
  const queryClient = useQueryClient();

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
  const [chosen, setEditing] = useState<T | 'new' | null>(
    deepLink && !pages && params.get('new') ? 'new' : null,
  );
  const [removing, setRemoving] = useState<T | null>(null);
  const deleter = useUndoableDelete(resource);
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

  const shownRows = (list.data?.items ?? []).filter(
    (row) => !deleter.hidden.has(resource.rowId(row)),
  );
  const rows =
    resource.list === 'all' && query && resource.matches
      ? shownRows.filter((row) => resource.matches!(row, searchKey(query)))
      : shownRows;

  const linked =
    openId && !dismissed && resource.canEdit !== false
      ? rows.find((row) => resource.rowId(row) === openId)
      : undefined;
  // An old link that opens a record in a window goes to the record's page when it has one.
  useEffect(() => {
    if (pages && linked) router.replace(pages.edit(linked));
  }, [pages, linked, router]);
  // Likewise an old "?new=1" link goes to the page that adds one.
  const wantsNew = Boolean(deepLink && params.get('new'));
  useEffect(() => {
    if (pages && wantsNew) router.replace(pages.create);
  }, [pages, wantsNew, router]);
  const editing = pages ? (chosen ?? null) : (chosen ?? linked ?? null);

  // Where the row about to be deleted is used: a row in use cannot be deleted.
  const usage = useQuery({
    queryKey: ['usage', removing && resource.usagePath ? resource.usagePath(removing) : null],
    queryFn: () => request<Usage>('GET', resource.usagePath!(removing!)),
    enabled: removing !== null && resource.usagePath !== undefined,
    staleTime: 0,
    gcTime: 0,
  });
  const scheduleDelete = (row: T) => {
    setRemoving(null);
    deleter.schedule(row);
  };

  const closeEditing = () => {
    setEditing(null);
    setDismissed(true);
  };

  const meta = list.data?.meta;
  const canCreate = resource.canCreate !== false;
  const canEdit = resource.canEdit !== false;
  // No buttons on any row: no actions column.
  const hasActions = !!rowActions || canEdit || resource.canDelete !== false;

  const columns = resourceColumns(resource, t, canEdit, queryClient);

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
            <Button
              icon="plus"
              onClick={() => (pages ? router.push(pages.create) : setEditing('new'))}
            >
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
        expandAll={query !== ''}
        initialSort={resource.initialSort}
        empty={t('empty')}
        groupBy={
          resource.groupBy && {
            ...resource.groupBy,
            label: (key) => {
              const name = `groups.${key}`;
              return guide.has(name) ? guide(name) : resource.groupBy!.label(key);
            },
          }
        }
        onRowClick={
          canEdit && editOnRowClick
            ? (row) => (pages ? router.push(pages.edit(row)) : setEditing(row))
            : undefined
        }
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
                    <IconButton
                      icon="edit"
                      label={editLabel ?? tf('edit')}
                      onClick={() => (pages ? router.push(pages.edit(row)) : setEditing(row))}
                    />
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

      <ResourceFormModal
        resource={resource}
        editing={editing}
        onClose={closeEditing}
        onCreated={onCreated}
        editFooter={editFooter}
      />

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
