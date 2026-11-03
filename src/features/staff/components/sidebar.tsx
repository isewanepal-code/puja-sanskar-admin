'use client';

import { useTranslations } from 'next-intl';

import { Icon } from '@/components/icons';
import type { NavGroup } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { Link, usePathname } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { usePanel } from './panel-shell';

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

const initial = siteConfig.name.slice(0, 1);

// The sections staff may open, grouped; each section has its own tabs inside.
export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const t = useTranslations('panel');
  const pathname = usePathname();
  const { collapsed, open, close } = usePanel();

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label={t('closeMenu')}
          onClick={close}
          className="fixed inset-0 z-40 bg-foreground/30 md:hidden"
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card shadow-xl transition-transform duration-200',
          'md:sticky md:top-0 md:z-auto md:h-dvh md:shrink-0 md:translate-x-0 md:shadow-none md:transition-[width]',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'md:w-16' : 'md:w-64',
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-border px-5',
            collapsed && 'md:justify-center md:px-0',
          )}
        >
          <Link
            href={routes.dashboard()}
            className="font-heading text-lg font-semibold whitespace-nowrap text-primary"
            title={siteConfig.name}
          >
            <span className={cn(collapsed && 'md:hidden')}>{siteConfig.name}</span>
            <span
              className={cn(
                'hidden size-8 place-items-center rounded-md bg-primary text-sm text-primary-foreground',
                collapsed && 'md:grid',
              )}
            >
              {initial}
            </span>
          </Link>
        </div>
        <nav
          aria-label={t('menu')}
          className={cn('flex-1 overflow-y-auto px-3 py-4', collapsed && 'md:px-2')}
        >
          {groups.map((group) => (
            <div key={group.key} className="mb-5 last:mb-0">
              <p
                className={cn(
                  'px-2 pb-2 text-[0.68rem] font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase',
                  collapsed && 'md:hidden',
                )}
              >
                {t(`groups.${group.key}`)}
              </p>
              <div
                className={cn(
                  'ml-3 grid gap-0.5 border-l border-border pl-2',
                  collapsed && 'md:ml-0 md:border-l-0 md:pl-0',
                )}
              >
                {group.sections.map((section) => {
                  const active = isActive(pathname, section.href);
                  const label = t(`sections.${section.key}`);
                  return (
                    <Link
                      key={section.key}
                      href={section.href}
                      title={collapsed ? label : undefined}
                      // A link followed on a phone closes the drawer.
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                        active &&
                          'bg-primary/8 font-medium text-primary hover:bg-primary/10 hover:text-primary',
                        active &&
                          !collapsed &&
                          'before:absolute before:top-1.5 before:bottom-1.5 before:-left-[9px] before:w-0.5 before:rounded-full before:bg-primary',
                        collapsed && 'md:justify-center md:px-0',
                      )}
                    >
                      <Icon name={section.icon} size={18} className="shrink-0" />
                      <span className={cn(collapsed && 'md:sr-only')}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
