'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Tab = { href: string; label: string };

// The pages inside one sidebar section, as underlined tabs on one rule. The tab whose path the
// page sits under is current; on a narrow screen the row scrolls sideways.
export function SectionTabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const pathname = usePathname();
  const current = tabs
    .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav
      aria-label={label}
      className="-mx-1 [scrollbar-width:none] overflow-x-auto border-b border-border"
    >
      <ul className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => {
          const active = tab === current;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative -mb-px inline-flex h-10 items-center px-3 text-sm whitespace-nowrap transition-colors',
                  'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors',
                  active
                    ? 'font-semibold text-primary after:bg-primary'
                    : 'text-muted-foreground after:bg-transparent hover:text-foreground hover:after:bg-border',
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
