import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/feedback';
import { Icon } from '@/components/icons';
import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { levelName, pathTo, type Catalogue, type GroupNode } from '../tree';

type FiledPuja = { id: string; code: string; nameNe: string; nameEn: string; isActive: boolean };

type GroupBrowserProps = {
  catalogue: Catalogue;
  // The group opened, with every group above it opened too.
  at?: string;
  // Pujas filed directly in the opened group.
  pujas: FiledPuja[];
};

function Column({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex w-72 shrink-0 flex-col gap-3">
      <header className="flex items-end justify-between gap-2 px-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-primary">{title}</h2>
          {subtitle ? <p className="text-sm text-primary/80">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      <ul className="grid gap-0.5">{children}</ul>
    </section>
  );
}

function GroupRow({ group, open }: { group: GroupNode; open: boolean }) {
  const t = useTranslations('pujas.browser');
  return (
    <li>
      <Link
        href={routes.pujaGroups(group.id)}
        aria-current={open ? 'true' : undefined}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted',
          open && 'bg-accent text-primary',
          !group.isActive && 'opacity-60',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="font-semibold">[{group.code}]</span> {group.nameNe}
          {group.ritualType ? (
            <span className="text-muted-foreground"> ({group.ritualType.code})</span>
          ) : null}
          <span className="block truncate text-xs text-muted-foreground">{group.nameEn}</span>
        </span>
        {!group.isActive ? <span className="chip">{t('off')}</span> : null}
        {group.children.length > 0 ? <Icon name="right" size={16} /> : null}
      </Link>
    </li>
  );
}

// The tree as the mapping sheet lays it out: one column per level, opened group by group.
export function GroupBrowser({ catalogue, at, pujas }: GroupBrowserProps) {
  const t = useTranslations('pujas.browser');
  const path = pathTo(catalogue.groups, at);
  const opened = path.at(-1);
  // Column n lists the groups at depth n under the group opened at depth n - 1.
  const columns = [catalogue.groups, ...path.map((group) => group.children)];

  if (catalogue.groups.length === 0) {
    return (
      <EmptyState
        title={t('emptyTree')}
        icon="temple"
        action={
          <Link href={routes.newPujaGroup()} className="btn btn-primary">
            {t('addTop')}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {columns.map((groups, depth) => {
        const level = levelName(catalogue, depth);
        const parent = path[depth - 1];
        return (
          <Column
            key={depth}
            title={t('level', { depth })}
            subtitle={level?.nameNe}
            action={
              <Link
                href={routes.newPujaGroup(parent?.id)}
                className="text-sm text-primary hover:underline"
              >
                {t('add')}
              </Link>
            }
          >
            {groups.length > 0 ? (
              groups.map((group) => (
                <GroupRow key={group.id} group={group} open={path[depth]?.id === group.id} />
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted-foreground">{t('empty')}</li>
            )}
          </Column>
        );
      })}

      {opened ? (
        <Column
          title={t('pujasIn', { code: opened.code })}
          subtitle={opened.nameNe}
          action={
            <Link
              href={routes.pujaGroup(opened.id)}
              className="text-sm text-primary hover:underline"
            >
              {t('edit')}
            </Link>
          }
        >
          {pujas.map((puja) => (
            <li key={puja.id}>
              <Link
                href={routes.puja(puja.id)}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm hover:bg-muted',
                  !puja.isActive && 'opacity-60',
                )}
              >
                <span className="font-semibold">[{puja.code}]</span> {puja.nameNe}
                <span className="text-muted-foreground"> ({opened.code})</span>
                <span className="block truncate text-xs text-muted-foreground">{puja.nameEn}</span>
              </Link>
            </li>
          ))}
          {pujas.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{t('noPujas')}</li>
          ) : null}
          <li className="px-3 pt-1">
            <Link href={routes.newPuja(opened.id)} className="text-sm text-primary hover:underline">
              {t('addPuja')}
            </Link>
          </li>
        </Column>
      ) : null}
    </div>
  );
}
