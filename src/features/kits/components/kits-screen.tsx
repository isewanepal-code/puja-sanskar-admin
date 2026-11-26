'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { priceGroups } from '@/features/marketing';
import { ActionModal, ResourceScreen, useResourceText } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { RowMenu } from '@/components/ui/row-menu';
import { routes } from '@/lib/routes';
import { ArchiveModal, type ArchiveTarget } from '@/features/archive';

import {
  kitFromPujaResource,
  kitPackResource,
  kitSetDefaults,
  kitSetEditResource,
  kitSetResource,
  kitTransferResource,
  kitsResource,
  type Kit,
} from '../resources';

export function KitsScreen() {
  const t = useTranslations('actions');
  const tg = useTranslations('itemGroups');
  const tk = useResourceText('kits');
  const [fromPuja, setFromPuja] = useState(false);
  // A new set, or the set a kit belongs to.
  const [setOf, setSetOf] = useState<Kit | 'new' | null>(null);
  const [sending, setSending] = useState<Kit | null>(null);
  const [packing, setPacking] = useState<{ kit: Kit; mode: 'pack' | 'unpack' } | null>(null);
  const [archiving, setArchiving] = useState<ArchiveTarget | null>(null);
  // Only the kits in this group, and in the groups inside it.
  const [groupId, setGroupId] = useState('');
  // The items count opens the items, as the button on the row does.
  const resource = useMemo(() => {
    const base = kitsResource(tk);
    return {
      ...base,
      canCreate: false,
      listQuery: { ...base.listQuery, ...(groupId && { groupId }) },
      columns: base.columns.map((column) =>
        column.key === 'items'
          ? {
              ...column,
              cell: (row: Kit) => (
                <Link
                  href={`${routes.kit(row.id)}?step=items`}
                  aria-label={t('itemsOf', { name: `${row.code} · ${row.nameNe}` })}
                  className="inline-flex min-w-8 justify-center rounded-md bg-muted px-2 py-0.5 text-sm font-medium hover:bg-primary/10"
                >
                  {row.items.length}
                </Link>
              ),
            }
          : column,
      ),
    };
  }, [tk, t, groupId]);

  return (
    <>
      <ResourceScreen
        resource={resource}
        deepLink
        pages={{ create: routes.newKit(), edit: (row) => routes.kit(row.id) }}
        toolbar={
          <>
            <SearchSelect
              source={priceGroups}
              value={groupId}
              onChange={(value) => setGroupId(String(value))}
              placeholder={tg('everyGroup')}
              aria-label={tg('filter')}
              className="w-44"
            />
            {/* Hidden for now: "Kit from a puja" and the plain add button; the New puja kit page does both. */}
            <Link
              href={routes.newKit()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('newKitPage')}
            </Link>
          </>
        }
        rowActions={(row) => (
          <>
            {/* The everyday job on the row; the rest is under the menu, as on the Stock page. */}
            {row.packed ? (
              <Button
                variant="primary"
                size="sm"
                icon="box"
                onClick={() => setPacking({ kit: row, mode: 'pack' })}
              >
                {t('packKits')}
              </Button>
            ) : null}
            <RowMenu
              compact
              label={t('moreActions')}
              items={[
                ...(row.packed
                  ? [
                      {
                        icon: 'x' as const,
                        label: t('unpackKits'),
                        onSelect: () => setPacking({ kit: row, mode: 'unpack' }),
                      },
                    ]
                  : []),
                ...(row.puja && row.tier
                  ? [
                      {
                        icon: 'grid' as const,
                        label: t('editSet'),
                        onSelect: () => setSetOf(row),
                      },
                    ]
                  : []),
                {
                  icon: 'truck',
                  label: t('sendKit'),
                  onSelect: () => setSending(row),
                },
                {
                  icon: 'archive',
                  label: t('archive'),
                  onSelect: () => setArchiving({ kind: 'kit', id: row.id, name: row.nameNe }),
                },
              ]}
            />
          </>
        )}
      />
      <ActionModal
        resource={setOf === 'new' ? kitSetResource() : null}
        size="lg"
        title={t('newKitSet')}
        description={t('newKitSetNote')}
        submitLabel={t('makeSet')}
        doneMessage={t('setMade')}
        onClose={() => setSetOf(null)}
      />
      <ActionModal
        resource={setOf && setOf !== 'new' && setOf.puja ? kitSetEditResource(setOf.puja.id) : null}
        defaults={setOf && setOf !== 'new' ? kitSetDefaults(setOf) : undefined}
        size="lg"
        title={t('editSet')}
        description={t('editSetNote')}
        submitLabel={t('saveSet')}
        doneMessage={t('setSaved')}
        onClose={() => setSetOf(null)}
      />
      <ActionModal
        resource={packing ? kitPackResource(packing.kit, packing.mode) : null}
        size="xs"
        title={t(packing?.mode === 'unpack' ? 'unpackKitsOf' : 'packKitsOf', {
          name: packing?.kit.nameNe ?? '',
        })}
        description={t(packing?.mode === 'unpack' ? 'unpackKitsNote' : 'packKitsNote')}
        submitLabel={t(packing?.mode === 'unpack' ? 'unpackKits' : 'packKits')}
        doneMessage={t(packing?.mode === 'unpack' ? 'kitsUnpacked' : 'kitsPacked')}
        onClose={() => setPacking(null)}
      />
      <ArchiveModal target={archiving} onClose={() => setArchiving(null)} />
      <ActionModal
        resource={sending ? kitTransferResource(sending) : null}
        size="md"
        title={t('sendKitOf', { name: sending?.nameNe ?? '' })}
        description={t('sendKitNote')}
        submitLabel={t('send')}
        doneMessage={t('sent')}
        onClose={() => setSending(null)}
      />
      <ActionModal
        resource={fromPuja ? kitFromPujaResource(tk) : null}
        size="md"
        title={t('kitFromPuja')}
        description={t('kitFromPujaNote')}
        submitLabel={t('makeKit')}
        doneMessage={t('kitMade')}
        onClose={() => setFromPuja(false)}
      />
    </>
  );
}
