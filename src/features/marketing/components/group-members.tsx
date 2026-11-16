'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ActionModal } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { request } from '@/lib/api';

import { addMembersResource, type PriceGroup, type PriceGroupDetail } from '../price-groups';

// What is in a group, with the way to add many at once and to take some out.
export function GroupMembers({
  group,
  onClose,
}: {
  group: PriceGroup | null;
  onClose: () => void;
}) {
  const t = useTranslations('groupMembers');
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const detail = useQuery({
    queryKey: ['priceGroups', 'detail', group?.id],
    queryFn: () => request<PriceGroupDetail>('GET', `/admin/price-groups/${group!.id}`),
    enabled: group !== null,
  });
  const remove = useMutation({
    mutationFn: (member: PriceGroupDetail['members'][number]) =>
      request('POST', `/admin/price-groups/${group!.id}/members/remove`, {
        body: member.productId ? { productIds: [member.productId] } : { kitIds: [member.kitId] },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['priceGroups'] }),
  });
  const members = detail.data?.members ?? [];

  return (
    <>
      <Modal
        open={group !== null}
        onOpenChange={(open) => (open ? undefined : onClose())}
        size="lg"
        title={t('title', { name: group?.name ?? '' })}
        description={t('note')}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t('count', { count: members.length })}</p>
          <Button icon="plus" onClick={() => setAdding(true)}>
            {t('add')}
          </Button>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{detail.isPending ? '…' : t('empty')}</p>
        ) : (
          <ul className="grid max-h-[50vh] gap-1 overflow-y-auto">
            {members.map((member) => (
              <li
                key={member.productId ?? member.kitId}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <Badge>{member.kitId ? t('kit') : t('item')}</Badge>
                <span className="min-w-0 flex-1 truncate">{member.nameNe}</span>
                <span className="text-xs text-muted-foreground">{member.code}</span>
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(member)}
                >
                  {t('remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
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
