'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import { siteConfig } from '@/config/site';
import type { NavSection } from '@/config/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type SidebarProps = {
  sections: NavSection[];
  staff: { fullName: string; email: string; roles: string[] };
};

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function Sidebar({ sections, staff }: SidebarProps) {
  const t = useTranslations('panel');
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    setLeaving(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace(routes.login());
    router.refresh();
  }

  return (
    <aside className="flex flex-col gap-6 border-b border-border bg-card p-4 md:min-h-screen md:w-60 md:border-r md:border-b-0">
      <Link href={routes.dashboard()} className="font-heading text-lg font-semibold text-primary">
        {siteConfig.name}
      </Link>

      <nav aria-label={t('menu')} className="flex gap-1 overflow-x-auto md:flex-col">
        {sections.map((section) => {
          const active = isActive(pathname, section.href);
          return (
            <Link
              key={section.key}
              href={section.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap hover:bg-muted',
                active && 'bg-accent font-semibold text-primary',
              )}
            >
              <Icon name={section.icon} size={18} />
              {t(`sections.${section.key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 text-sm md:mt-auto md:flex-col md:items-stretch md:border-t md:border-border md:pt-4">
        <div className="hidden md:block">
          <div className="font-semibold">{staff.fullName}</div>
          <div className="truncate text-muted-foreground">{staff.email}</div>
          <div className="text-xs text-muted-foreground">{staff.roles.join(', ')}</div>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={leaving}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted disabled:opacity-50"
        >
          <Icon name="logout" size={18} />
          {t('signOut')}
        </button>
      </div>
    </aside>
  );
}
