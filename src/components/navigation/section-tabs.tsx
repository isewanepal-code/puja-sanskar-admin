'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Tab = { href: string; label: string };

// The pages inside one sidebar section, as one segmented bar. The tab whose path the page sits
// under is current; on a narrow screen the bar scrolls sideways.
export function SectionTabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const pathname = usePathname();
  const current = tabs
    .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav aria-label={label} className="max-w-full [scrollbar-width:none] overflow-x-auto">
      <ul className="inline-flex min-w-max gap-0.5 rounded-lg bg-muted p-1">
        {tabs.map((tab) => {
          const active = tab === current;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center rounded-md px-3.5 text-sm whitespace-nowrap transition-colors',
                  active
                    ? 'bg-card font-semibold text-primary shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
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
