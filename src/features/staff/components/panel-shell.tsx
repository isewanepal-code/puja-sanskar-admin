'use client';

import { createContext, use, useState, type ReactNode } from 'react';

import { SIDEBAR_COOKIE } from '../sidebar-cookie';

type Panel = {
  // Desktop: the sidebar shrinks to its icons.
  collapsed: boolean;
  // Phone: the sidebar slides over the page.
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const PanelContext = createContext<Panel | null>(null);
const DESKTOP = '(min-width: 768px)';

export function usePanel(): Panel {
  const panel = use(PanelContext);
  if (!panel) throw new Error('usePanel needs a PanelShell above it');
  return panel;
}

type PanelShellProps = { initialCollapsed: boolean; children: ReactNode };

// Holds the sidebar's state for the sidebar and the header's toggle; the choice survives reloads.
export function PanelShell({ initialCollapsed, children }: PanelShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (!window.matchMedia(DESKTOP).matches) {
      setOpen((current) => !current);
      return;
    }
    const next = !collapsed;
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'open'}; path=/; max-age=31536000; samesite=lax`;
    setCollapsed(next);
  };

  return (
    <PanelContext value={{ collapsed, open, toggle, close: () => setOpen(false) }}>
      <div className="flex min-h-screen bg-background">{children}</div>
    </PanelContext>
  );
}
