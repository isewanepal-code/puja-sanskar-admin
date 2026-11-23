'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useToast } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { ALWAYS_SHOWN, navigation } from '@/config/navigation';
import { isApiError, request } from '@/lib/api';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';

const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'INVENTORY_MANAGER',
  'ORDER_MANAGER',
  'ACCOUNTANT',
  'STORE_STAFF',
] as const;

type Hidden = Record<string, string[]>;

// Which sidebar entries each role sees: a ticked box shows the entry. Only the menu is tidied here;
// the permission of the role still decides what it may open.
export function MenuAccessScreen() {
  const t = useTranslations('menuAccess');
  const tp = useTranslations('panel');
  const tf = useTranslations('forms');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [edited, setEdited] = useState<Hidden | null>(null);

  const settings = useQuery({
    queryKey: ['settings', 'menus'],
    queryFn: () => request<{ hiddenMenus: Hidden }>('GET', '/admin/settings'),
  });
  const saved = settings.data?.hiddenMenus ?? {};
  const hidden = edited ?? saved;
  const dirty = edited !== null;
  const isHidden = (role: string, key: string) => hidden[role]?.includes(key) ?? false;

  const setMany = (role: string, keys: string[], hide: boolean) => {
    const current = new Set(hidden[role] ?? []);
    for (const key of keys) {
      if (hide) current.add(key);
      else current.delete(key);
    }
    setEdited({ ...hidden, [role]: [...current] });
  };

  const save = useMutation({
    mutationFn: () => request('PATCH', '/admin/settings', { body: { hiddenMenus: hidden } }),
    onSuccess: async () => {
      toast.success(t('saved'));
      setEdited(null);
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  const guard = useUnsavedGuard(dirty && !save.isPending);

  if (settings.isError) return <p className="text-sm text-destructive">{t('loadFailed')}</p>;

  return (
    <>
      {guard}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-semibold">
                {t('entry')}
              </th>
              {ROLES.map((role) => (
                <th key={role} className="px-3 py-2 text-center font-semibold">
                  {t(`roles.${role}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {navigation.map((group) => {
              const keys = group.sections
                .map((section) => section.key)
                .filter((key) => !ALWAYS_SHOWN.includes(key));
              return (
                <GroupRows
                  key={group.key}
                  title={tp(`groups.${group.key}`)}
                  keys={keys}
                  rows={group.sections.map((section) => ({
                    key: section.key,
                    label: tp(`sections.${section.key}`),
                    fixed: ALWAYS_SHOWN.includes(section.key),
                  }))}
                  groupLabel={t('group')}
                  fixedLabel={t('fixed')}
                  isHidden={isHidden}
                  setMany={setMany}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('hint')}</p>
        <div className="flex gap-2">
          {dirty ? (
            <Button variant="secondary" onClick={() => setEdited(null)}>
              {t('reset')}
            </Button>
          ) : null}
          <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? t('saving') : t('save')}
          </Button>
        </div>
      </div>
    </>
  );
}

function GroupRows({
  title,
  keys,
  rows,
  groupLabel,
  fixedLabel,
  isHidden,
  setMany,
}: {
  title: string;
  keys: string[];
  rows: { key: string; label: string; fixed: boolean }[];
  groupLabel: string;
  fixedLabel: string;
  isHidden: (role: string, key: string) => boolean;
  setMany: (role: string, keys: string[], hide: boolean) => void;
}) {
  return (
    <>
      <tr className="bg-muted/40">
        <th className="sticky left-0 z-[5] bg-muted/40 px-3 py-2 text-left font-heading font-bold">
          {title}
        </th>
        {ROLES.map((role) => {
          const allShown = keys.length > 0 && keys.every((key) => !isHidden(role, key));
          return (
            <td key={role} className="px-3 py-2 text-center">
              {keys.length > 0 ? (
                <input
                  type="checkbox"
                  className="size-4"
                  aria-label={`${groupLabel}: ${title} · ${role}`}
                  checked={allShown}
                  onChange={(e) => setMany(role, keys, !e.target.checked)}
                />
              ) : null}
            </td>
          );
        })}
      </tr>
      {rows.map((row) => (
        <tr key={row.key}>
          <td className="sticky left-0 z-[5] border-t border-border bg-card py-2 pr-3 pl-6">
            {row.label}
          </td>
          {ROLES.map((role) => (
            <td key={role} className="border-t border-border px-3 py-2 text-center">
              {row.fixed ? (
                <span className="text-xs text-muted-foreground" title={fixedLabel}>
                  ✓
                </span>
              ) : (
                <input
                  type="checkbox"
                  className="size-4"
                  aria-label={`${row.label} · ${role}`}
                  checked={!isHidden(role, row.key)}
                  onChange={(e) => setMany(role, [row.key], !e.target.checked)}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
