'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { ItemGroups, priceGroups } from '@/features/marketing';
import { ActionModal, CountButton, ResourceScreen, useResourceText } from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { routes } from '@/lib/routes';
import { ArchiveModal, type ArchiveTarget } from '@/features/archive';

import { KitPriceSummary } from './kit-price-summary';
import {
  kitFromPujaResource,
  kitPackResource,
  kitItemsResource,
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
  const [itemsOf, setItemsOf] = useState<Kit | null>(null);
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
      listQuery: { ...base.listQuery, ...(groupId && { groupId }) },
      columns: base.columns.map((column) =>
        column.key === 'items'
          ? {
              ...column,
              cell: (row: Kit) => (
                <CountButton
                  label={t('itemsOf', { name: `${row.code} · ${row.nameNe}` })}
                  onClick={() => setItemsOf(row)}
                >
                  {row.items.length}
                </CountButton>
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
            <Button variant="secondary" icon="temple" onClick={() => setFromPuja(true)}>
              {t('kitFromPuja')}
            </Button>
            <Link
              href={routes.newKit()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('newKitPage')}
            </Link>
          </>
        }
        onCreated={setItemsOf}
        editFooter={(row) => (
          <div className="mt-5 grid gap-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">{tg('title')}</h3>
            <ItemGroups kind="kit" id={row.id} />
          </div>
        )}
        rowActions={(row) => (
          <>
            {row.packed ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="box"
                  onClick={() => setPacking({ kit: row, mode: 'pack' })}
                >
                  {t('packKits')}
                </Button>
                <IconButton
                  icon="x"
                  label={t('unpackKits')}
                  onClick={() => setPacking({ kit: row, mode: 'unpack' })}
                />
              </>
            ) : null}
            <IconButton icon="truck" label={t('sendKit')} onClick={() => setSending(row)} />
            <IconButton
              icon="archive"
              label={t('archive')}
              onClick={() => setArchiving({ kind: 'kit', id: row.id, name: row.nameNe })}
            />
            {row.puja && row.tier ? (
              <IconButton icon="grid" label={t('editSet')} onClick={() => setSetOf(row)} />
            ) : null}
            <Link
              href={routes.kit(row.id)}
              className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
            >
              {t('openKit')}
            </Link>
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
      <Modal
        open={itemsOf !== null}
        onOpenChange={(next) => (next ? undefined : setItemsOf(null))}
        size="xl"
        title={t('itemsOf', { name: itemsOf ? `${itemsOf.code} · ${itemsOf.nameNe}` : '' })}
        description={t('itemsNote')}
      >
        {itemsOf ? (
          <>
            <KitPriceSummary kitId={itemsOf.id} />
            <ResourceScreen resource={kitItemsResource(itemsOf.id)} />
          </>
        ) : null}
      </Modal>
    </>
  );
}
