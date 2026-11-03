'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Tab = { href: string; label: string };

// The pages inside one sidebar section; the tab whose path the page sits under is current.
export function SectionTabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const pathname = usePathname();
  const current = tabs
    .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab === current ? 'page' : undefined}
          className={cn(
            'rounded-md px-3.5 py-1.5 text-sm whitespace-nowrap text-muted-foreground hover:bg-muted',
            tab === current && 'bg-accent font-semibold text-primary',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
