'use client';

import { useTranslations } from 'next-intl';

import { Icon } from '@/components/icons';
import type { NavGroup } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { Link, usePathname } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

// The sections staff may open, grouped; each section has its own tabs inside.
export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const t = useTranslations('panel');
  const pathname = usePathname();

  return (
    <aside className="border-b border-border bg-card md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0">
      <div className="flex h-14 items-center px-5">
        <Link href={routes.dashboard()} className="font-heading text-lg font-semibold text-primary">
          {siteConfig.name}
        </Link>
      </div>
      <nav
        aria-label={t('menu')}
        className="flex gap-4 overflow-x-auto px-3 pb-3 md:flex-col md:gap-5 md:pb-6"
      >
        {groups.map((group) => (
          <div key={group.key} className="flex gap-1 md:flex-col">
            <p className="hidden px-3 pb-1 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase md:block">
              {t(`groups.${group.key}`)}
            </p>
            {group.sections.map((section) => {
              const active = isActive(pathname, section.href);
              return (
                <Link
                  key={section.key}
                  href={section.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground',
                    active &&
                      'bg-primary/8 font-medium text-primary hover:bg-primary/10 hover:text-primary',
                  )}
                >
                  <Icon name={section.icon} size={18} />
                  {t(`sections.${section.key}`)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
