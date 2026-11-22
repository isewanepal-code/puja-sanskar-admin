'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';

import { Icon } from '@/components/icons';
import type { NavGroup, NavSection } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { Link, usePathname } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { usePanel } from './panel-shell';

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

// The one section that fits the page best: the longest address that still matches, so Units lights
// up on /catalogue/units and Categories (/catalogue) does not light with it.
const currentHref = (pathname: string, groups: NavGroup[]) =>
  groups
    .flatMap((group) => group.sections.map((section) => section.href))
    .filter((href) => isActive(pathname, href))
    .sort((a, b) => b.length - a.length)[0];

const initial = siteConfig.name.slice(0, 1);

const OPEN_KEY = 'ps-sidebar-open';

// Which groups are opened is kept for this browser; a blocked store just means the default.
function readOpen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

// Only some sections have a hint; t.has() checks it, so the key is typed as one that exists.
const hintKey = (key: NavSection['key']) => `sectionHint.${key}` as 'sectionHint.addItem';

// The sections staff may open, grouped; each section has its own tabs inside.
export function Sidebar({
  groups,
  extras,
}: {
  groups: NavGroup[];
  // What the header has no room for on a phone (the branch and the mode), shown at the top of the drawer.
  extras?: ReactNode;
}) {
  const t = useTranslations('panel');
  const pathname = usePathname();
  const { collapsed, open, close, toggle } = usePanel();
  const current = currentHref(pathname, groups);
  const currentGroup = groups.find((g) => g.sections.some((x) => x.href === current))?.key;
  // Every group starts shut but the overview and the one you are in; opening one is remembered.
  const [open_, setOpen_] = useState<Record<string, boolean>>({});
  // Read after the first paint, so the server and browser agree on what they first draw.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen_(readOpen()));
    return () => cancelAnimationFrame(frame);
  }, []);
  const isOpen = (key: string) => key === currentGroup || key === 'overview' || open_[key] === true;
  const setAll = (value: boolean) => {
    const next = Object.fromEntries(groups.map((g) => [g.key, value]));
    setOpen_(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      // Nothing to keep it in; it still works this time.
    }
  };
  const toggleGroup = (key: string) => {
    const next = { ...open_, [key]: !isOpen(key) };
    setOpen_(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      // As above.
    }
  };

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
            'flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4',
            collapsed && 'md:justify-center md:px-0',
          )}
        >
          <Link
            href={routes.dashboard()}
            title={siteConfig.name}
            className="flex min-w-0 items-center gap-2.5"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground">
              {initial}
            </span>
            <span
              className={cn(
                'truncate font-heading text-[0.95rem] font-semibold text-foreground',
                collapsed && 'md:hidden',
              )}
            >
              {siteConfig.name}
            </span>
          </Link>
        </div>
        <nav
          aria-label={t('menu')}
          className={cn('flex-1 overflow-y-auto px-3 py-4', collapsed && 'md:px-2')}
        >
          {extras ? <div className="mb-4 grid gap-2 md:hidden">{extras}</div> : null}
          <div className={cn('mb-3 flex justify-end gap-3 px-1 text-xs', collapsed && 'md:hidden')}>
            <button
              type="button"
              onClick={() => setAll(true)}
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              {t('expandAll')}
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              {t('collapseAll')}
            </button>
          </div>
          {groups.map((group, groupIndex) => {
            const shown = collapsed || isOpen(group.key);
            return (
              <div
                key={group.key}
                className={cn(
                  'mb-3 last:mb-0',
                  groupIndex > 0 && 'border-t border-border pt-3',
                  collapsed && 'md:mb-2 md:pt-2',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={shown}
                  aria-controls={`nav-${group.key}`}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[0.76rem] font-bold tracking-wider whitespace-nowrap text-foreground uppercase hover:bg-muted',
                    // Returns stand out: they are easy to lose between selling and buying.
                    group.key === 'returns' && 'text-primary',
                    collapsed && 'md:hidden',
                  )}
                >
                  <span>{t(`groups.${group.key}`)}</span>
                  <Icon
                    name={shown ? 'down' : 'right'}
                    size={14}
                    className="text-muted-foreground"
                  />
                </button>
                <div
                  id={`nav-${group.key}`}
                  hidden={!shown}
                  className={cn(
                    'mt-1 ml-3 grid gap-0.5 border-l border-border pl-2',
                    collapsed && 'md:ml-0 md:border-l-0 md:pl-0',
                  )}
                >
                  {group.sections.map((section) => {
                    const active = section.href === current;
                    const label = t(`sections.${section.key}`);
                    // What the screen is for, shown on hover.
                    const help = t(`sectionHelp.${section.key}`);
                    return (
                      <Link
                        key={section.key}
                        href={section.href}
                        title={collapsed ? `${label}: ${help}` : help}
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
                        <span className={cn('grid leading-tight', collapsed && 'md:sr-only')}>
                          {label}
                          {/* A few plain words under the main pages, so anyone can tell them apart. */}
                          {t.has(hintKey(section.key)) ? (
                            <span className="text-[0.7rem] font-normal text-muted-foreground">
                              {t(hintKey(section.key))}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="hidden shrink-0 border-t border-border p-2 md:block">
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? t('showMenu') : t('hideMenu')}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <Icon name={collapsed ? 'right' : 'left'} size={16} className="shrink-0" />
            <span className={cn(collapsed && 'sr-only')}>
              {collapsed ? t('showMenu') : t('hideMenu')}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
