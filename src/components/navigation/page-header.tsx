import type { ReactNode } from 'react';

import { SectionTabs } from './section-tabs';

type PageHeaderProps = {
  title: string;
  // One plain sentence on what the page is for.
  intro?: string;
  tabs?: { href: string; label: string }[];
  // Buttons at the right of the title.
  actions?: ReactNode;
};

// The top of every admin page: its title, what it is for, and the tabs inside it.
export function PageHeader({ title, intro, tabs, actions }: PageHeaderProps) {
  return (
    <header className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-semibold">{title}</h1>
          {intro ? <p className="max-w-3xl text-sm text-muted-foreground">{intro}</p> : null}
        </div>
        {actions}
      </div>
      {tabs && tabs.length > 1 ? <SectionTabs label={title} tabs={tabs} /> : null}
    </header>
  );
}
