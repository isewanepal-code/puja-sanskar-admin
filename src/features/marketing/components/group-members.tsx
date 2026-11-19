'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { ActionModal } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { isApiError, request } from '@/lib/api';

import { addMembersResource, type PriceGroup, type PriceGroupDetail } from '../price-groups';

type Member = PriceGroupDetail['members'][number];
const keyOf = (member: Member) => member.productId ?? `kit:${member.kitId}`;

// What is in a group: the groups inside it, and the items and kits in it itself. Many can be taken out
// at once, or all of them; adding is by search, category or pasted codes.
export function GroupMembers({
  group,
  onClose,
}: {
  group: PriceGroup | null;
  onClose: () => void;
}) {
  const t = useTranslations('groupMembers');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  // Ticked rows, for taking several out at once.
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const detail = useQuery({
    queryKey: ['priceGroups', 'detail', group?.id],
    queryFn: () => request<PriceGroupDetail>('GET', `/admin/price-groups/${group!.id}`),
    enabled: group !== null,
  });
  const members = detail.data?.members ?? [];
  const inside = detail.data?.children ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['priceGroups'] });

  const takeOut = useMutation({
    mutationFn: (these: Member[]) =>
      request('POST', `/admin/price-groups/${group!.id}/members/remove`, {
        body: {
          productIds: these.flatMap((m) => (m.productId ? [m.productId] : [])),
          kitIds: these.flatMap((m) => (m.kitId ? [m.kitId] : [])),
        },
      }),
    onSuccess: async (_, these) => {
      setTicked(new Set());
      toast.success(t('tookOut', { count: these.length }));
      await refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });
  const takeOutGroup = useMutation({
    mutationFn: (childId: string) =>
      request('PATCH', `/admin/price-groups/${group!.id}`, {
        body: { childGroupIds: inside.filter((c) => c.id !== childId).map((c) => c.id) },
      }),
    onSuccess: async () => {
      toast.success(t('groupTakenOut'));
      await refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const chosen = members.filter((m) => ticked.has(keyOf(m)));
  const allTicked = members.length > 0 && chosen.length === members.length;
  const busy = takeOut.isPending || takeOutGroup.isPending;

  return (
    <>
      <Modal
        open={group !== null}
        onOpenChange={(open) => (open ? undefined : onClose())}
        size="lg"
        title={t('title', { name: group?.name ?? '' })}
        description={t('note')}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t('counts', {
              direct: members.length,
              total: detail.data?.totalCount ?? members.length,
            })}
          </p>
          <Button icon="plus" onClick={() => setAdding(true)}>
            {t('add')}
          </Button>
        </div>

        {detail.data?.parents.length ? (
          <p className="mb-3 text-sm">
            <span className="text-muted-foreground">{t('insideOf')} </span>
            {detail.data.parents.map((p) => (
              <Badge key={p.id} tone="info" className="mr-1">
                {p.name}
              </Badge>
            ))}
          </p>
        ) : null}

        {inside.length > 0 ? (
          <section className="mb-4 grid gap-1.5">
            <h3 className="text-sm font-semibold">{t('groupsInside')}</h3>
            <ul className="flex flex-wrap gap-2">
              {inside.map((child) => (
                <li
                  key={child.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pr-2 pl-3 text-sm"
                >
                  {child.name}
                  <button
                    type="button"
                    aria-label={`${t('remove')} ${child.name}`}
                    disabled={busy}
                    onClick={() => takeOutGroup.mutate(child.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="grid gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t('directItems')}</h3>
            {members.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={allTicked}
                    onChange={(event) =>
                      setTicked(event.target.checked ? new Set(members.map(keyOf)) : new Set())
                    }
                  />
                  {t('selectAll')}
                </label>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={chosen.length === 0 || busy}
                  onClick={() => takeOut.mutate(chosen)}
                >
                  {t('takeOutSelected', { count: chosen.length })}
                </Button>
              </div>
            ) : null}
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {detail.isPending ? '…' : inside.length ? t('emptyDirect') : t('empty')}
            </p>
          ) : (
            <ul className="grid max-h-[45vh] gap-1 overflow-y-auto">
              {members.map((member) => (
                <li
                  key={keyOf(member)}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    aria-label={member.nameNe}
                    checked={ticked.has(keyOf(member))}
                    onChange={(event) =>
                      setTicked((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(keyOf(member));
                        else next.delete(keyOf(member));
                        return next;
                      })
                    }
                  />
                  <Badge>{member.kitId ? t('kit') : t('item')}</Badge>
                  <span className="min-w-0 flex-1 truncate">{member.nameNe}</span>
                  <span className="text-xs text-muted-foreground">{member.code}</span>
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    disabled={busy}
                    onClick={() => takeOut.mutate([member])}
                  >
                    {t('remove')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Modal>
      <ActionModal
        resource={adding && group ? addMembersResource(group.id) : null}
        size="lg"
        title={t('addTitle')}
        description={t('addNote')}
        submitLabel={t('addSubmit')}
        doneMessage={t('added')}
        onClose={() => setAdding(false)}
      />
    </>
  );
}
