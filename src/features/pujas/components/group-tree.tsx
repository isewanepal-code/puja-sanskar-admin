'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useMemo, useState, type ReactNode } from 'react';

import { RecordCell } from '@/components/display';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/overlays';
import {
  BulkGrid,
  ConfirmDelete,
  ResourceForm,
  useResourceText,
  type Resource,
} from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { pathTo, pujaGroupResource, type Catalogue, type GroupNode } from '@/features/puja-groups';
import { usePathname } from '@/i18n/navigation';
import { isApiError, request } from '@/lib/api';
import { cn } from '@/lib/utils';

import { pujasResource } from '../resource';
import type { Puja } from '../types';

type Page<T> = { items: T[] };

// What the one modal on the page is doing.
type Editing =
  | { what: 'group'; row?: GroupNode; parent: GroupNode | null }
  | { what: 'puja'; row?: Puja; group: GroupNode };
type Bulk = { what: 'groups'; parent: GroupNode | null } | { what: 'pujas'; group: GroupNode };
type Removing = { what: 'group'; row: GroupNode } | { what: 'puja'; row: Puja };

function Column({
  depth,
  title,
  subtitle,
  actions,
  children,
}: {
  // The level number; none for the pujas pane.
  depth?: number;
  title: string;
  subtitle?: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex w-76 shrink-0 flex-col border-r border-border last:border-r-0">
      <header className="flex h-14 items-center gap-2 border-b border-border px-3">
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary"
        >
          {depth ?? <Icon name="temple" size={13} />}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center">{actions}</div>
      </header>
      <ul className="grid max-h-[calc(100dvh-20rem)] content-start gap-px overflow-y-auto p-1.5">
        {children}
      </ul>
    </section>
  );
}

function Row({
  active,
  muted,
  onOpen,
  children,
  actions,
}: {
  active?: boolean;
  muted?: boolean;
  onOpen: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <li
      className={cn(
        'group relative flex items-center gap-1 rounded-md pr-1 hover:bg-muted',
        active &&
          'bg-primary/8 text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary hover:bg-primary/10',
        muted && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 px-2.5 py-2 text-left text-sm [overflow-wrap:anywhere]"
      >
        {children}
      </button>
      <div className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {actions}
      </div>
    </li>
  );
}

// Where the open group sits: each level from the top, one step to the right of the last.
function LevelPath({ path, onOpen }: { path: GroupNode[]; onOpen: (group: GroupNode) => void }) {
  if (path.length === 0) return null;
  return (
    <ol className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm">
      {path.map((group, depth) => (
        <li key={group.id} className="flex items-center gap-1.5">
          {depth > 0 ? <Icon name="right" size={14} className="text-muted-foreground" /> : null}
          <button
            type="button"
            onClick={() => onOpen(group)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-muted',
              depth === path.length - 1 && 'font-semibold text-primary',
            )}
          >
            <span className="grid size-5 place-items-center rounded-full bg-muted text-[0.65rem] font-bold text-muted-foreground">
              {depth}
            </span>
            {group.nameNe}
          </button>
        </li>
      ))}
    </ol>
  );
}

// The puja tree as the mapping sheet lays it out: a column per level, then the opened group's pujas.
export function GroupTree() {
  const t = useTranslations('pujas.tree');
  const tf = useTranslations('forms');
  const tp = useResourceText('pujas');
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const at = useSearchParams().get('at') ?? undefined;
  const queryClient = useQueryClient();
  const formId = useId();

  const [editing, setEditing] = useState<Editing | null>(null);
  const [bulk, setBulk] = useState<Bulk | null>(null);
  const [removing, setRemoving] = useState<Removing | null>(null);
  const [saving, setSaving] = useState(false);

  const catalogue = useQuery({
    queryKey: ['puja-groups', 'tree'],
    queryFn: () => request<Catalogue>('GET', '/admin/puja-groups/tree'),
  });
  const groups = catalogue.data?.groups ?? [];
  const path = pathTo(groups, at);
  const opened = path.at(-1);

  const pujas = useQuery({
    queryKey: ['pujas', 'list', { groupId: opened?.id }],
    queryFn: () =>
      request<Page<Puja>>('GET', '/admin/pujas', { query: { groupId: opened!.id, limit: 100 } }),
    enabled: !!opened,
  });

  const pujaResource = useMemo(
    () =>
      pujasResource(
        () => undefined,
        (kind) => tp(`kinds.${kind}`),
      ),
    [tp],
  );

  const open = (group?: GroupNode) =>
    router.replace(group ? `${pathname}?at=${group.id}` : pathname, { scroll: false });

  const remove = useMutation({
    mutationFn: (target: Removing) =>
      request(
        'DELETE',
        target.what === 'group'
          ? `/admin/puja-groups/${target.row.id}`
          : `/admin/pujas/${target.row.id}`,
      ),
    onSuccess: async (_, target) => {
      toast.success(tf('deleted'));
      setRemoving(null);
      // A removed group that was open closes back to its parent.
      const at = target.what === 'group' ? path.findIndex((g) => g.id === target.row.id) : -1;
      if (at >= 0) open(path[at - 1]);
      await queryClient.invalidateQueries({
        queryKey: [target.what === 'group' ? 'puja-groups' : 'pujas'],
      });
      await queryClient.invalidateQueries({ queryKey: ['options'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  if (catalogue.isPending) return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  if (catalogue.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {isApiError(catalogue.error) ? catalogue.error.message : t('failed')}
      </p>
    );
  }

  const levels = catalogue.data.levels;
  // Column n lists the groups at depth n under the group opened at depth n - 1.
  const columns = [groups, ...path.map((group) => group.children)];

  const columnActions = (parent: GroupNode | null) => (
    <>
      <IconButton
        icon="list"
        label={t('addMany')}
        onClick={() => setBulk({ what: 'groups', parent })}
      />
      <IconButton
        icon="plus"
        label={t('add')}
        onClick={() => setEditing({ what: 'group', parent })}
      />
    </>
  );

  // The modal's form: a group (with a code only at the top) or a puja filed in the opened group.
  let form: {
    resource: Resource<unknown>;
    row?: unknown;
    extraBody?: Record<string, unknown>;
    defaults?: Record<string, unknown>;
    title: string;
  } | null = null;
  if (editing?.what === 'group') {
    form = {
      resource: pujaGroupResource(!editing.row && !editing.parent) as Resource<unknown>,
      row: editing.row,
      extraBody: editing.parent ? { parentId: editing.parent.id } : undefined,
      title: editing.row
        ? tf('editing', { name: `[${editing.row.code}] ${editing.row.nameNe}` })
        : editing.parent
          ? t('addUnder', { code: editing.parent.code })
          : t('addTop'),
    };
  } else if (editing?.what === 'puja') {
    form = {
      resource: pujaResource as Resource<unknown>,
      row: editing.row,
      defaults: { groupId: editing.group.id, type: 'PUJA', isActive: true },
      title: editing.row
        ? tf('editing', { name: `[${editing.row.code}] ${editing.row.nameNe}` })
        : t('addPujaIn', { code: editing.group.code }),
    };
  }

  return (
    <>
      {groups.length === 0 ? (
        <div className="grid justify-items-start gap-3 py-10">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          <div className="flex gap-2">
            <Button icon="plus" onClick={() => setEditing({ what: 'group', parent: null })}>
              {t('addTop')}
            </Button>
            <Button
              variant="secondary"
              icon="list"
              onClick={() => setBulk({ what: 'groups', parent: null })}
            >
              {t('addMany')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <LevelPath path={path} onOpen={open} />
          <div className="flex w-fit max-w-full overflow-x-auto rounded-lg border border-border bg-card">
            {columns.map((list, depth) => {
              const parent = path[depth - 1] ?? null;
              return (
                <Column
                  key={depth}
                  depth={depth}
                  title={t('level', { depth })}
                  subtitle={levels.find((level) => level.depth === depth)?.nameNe}
                  actions={columnActions(parent)}
                >
                  {list.map((group) => (
                    <Row
                      key={group.id}
                      active={path[depth]?.id === group.id}
                      muted={!group.isActive}
                      onOpen={() => open(group)}
                      actions={
                        <>
                          <IconButton
                            icon="edit"
                            label={tf('edit')}
                            onClick={() => setEditing({ what: 'group', row: group, parent })}
                          />
                          <IconButton
                            icon="trash"
                            variant="danger"
                            label={tf('delete')}
                            onClick={() => setRemoving({ what: 'group', row: group })}
                          />
                        </>
                      }
                    >
                      <span className="flex items-center gap-2">
                        <RecordCell
                          className="flex-1"
                          title={group.nameNe}
                          also={group.nameEn}
                          chip={group.ritualType?.code}
                          code={group.code}
                        />
                        {group.children.length > 0 ? (
                          <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                            {group.children.length}
                            <Icon name="right" size={14} />
                          </span>
                        ) : null}
                      </span>
                    </Row>
                  ))}
                  {list.length === 0 ? (
                    <li className="px-2.5 py-2 text-sm text-muted-foreground">{t('none')}</li>
                  ) : null}
                </Column>
              );
            })}

            {opened ? (
              <Column
                title={t('pujasIn', { code: opened.code })}
                subtitle={opened.nameNe}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="list"
                      title={t('addManyPujas')}
                      onClick={() => setBulk({ what: 'pujas', group: opened })}
                    >
                      {t('many')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="plus"
                      title={t('addPuja')}
                      onClick={() => setEditing({ what: 'puja', group: opened })}
                    >
                      {t('one')}
                    </Button>
                  </>
                }
              >
                {(pujas.data?.items ?? []).map((puja) => (
                  <Row
                    key={puja.id}
                    muted={!puja.isActive}
                    onOpen={() => setEditing({ what: 'puja', row: puja, group: opened })}
                    actions={
                      <IconButton
                        icon="trash"
                        variant="danger"
                        label={tf('delete')}
                        onClick={() => setRemoving({ what: 'puja', row: puja })}
                      />
                    }
                  >
                    <RecordCell title={puja.nameNe} also={puja.nameEn} code={puja.code} />
                  </Row>
                ))}
                {pujas.data && pujas.data.items.length === 0 ? (
                  <li className="px-2.5 py-2 text-sm text-muted-foreground">{t('noPujas')}</li>
                ) : null}
              </Column>
            ) : null}
          </div>
        </div>
      )}

      <Modal
        open={form !== null}
        onOpenChange={(next) => (next ? undefined : setEditing(null))}
        size="lg"
        title={form?.title ?? ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {tf('cancel')}
            </Button>
            <Button type="submit" form={formId} disabled={saving}>
              {saving ? tf('saving') : form?.row ? tf('save') : tf('create')}
            </Button>
          </>
        }
      >
        {form ? (
          <ResourceForm
            key={`${editing?.what}-${(form.row as { id?: string } | undefined)?.id ?? 'new'}`}
            resource={form.resource}
            row={form.row}
            extraBody={form.extraBody}
            defaults={form.defaults}
            formId={formId}
            onPendingChange={setSaving}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      {bulk?.what === 'groups' ? (
        <BulkGrid
          key={`groups-${bulk.parent?.id ?? 'top'}`}
          resource={pujaGroupResource(!bulk.parent)}
          open
          onOpenChange={(next) => (next ? undefined : setBulk(null))}
          extraBody={bulk.parent ? { parentId: bulk.parent.id } : undefined}
          description={bulk.parent ? t('bulkUnder', { code: bulk.parent.code }) : undefined}
        />
      ) : null}
      {bulk?.what === 'pujas' ? (
        <BulkGrid
          key={`pujas-${bulk.group.id}`}
          resource={{ ...pujaResource, bulk: ['code', 'nameNe', 'nameEn', 'type'] }}
          open
          onOpenChange={(next) => (next ? undefined : setBulk(null))}
          extraBody={{ groupId: bulk.group.id }}
          description={t('bulkPujasIn', { code: bulk.group.code })}
        />
      ) : null}

      <ConfirmDelete
        name={removing ? `[${removing.row.code}] ${removing.row.nameNe}` : null}
        pending={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </>
  );
}
