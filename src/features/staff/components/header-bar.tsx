'use client';

import { Menu } from '@base-ui/react/menu';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import { routes } from '@/lib/routes';

import { BranchSwitcher } from './branch-switcher';
import { ChangePasswordModal } from './change-password-modal';
import { usePanel } from './panel-shell';

type HeaderBarProps = {
  staff: { fullName: string; email: string; roles: string[] };
  // The branch code chosen, or empty for every branch.
  branch: string;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const item =
  'flex w-full cursor-default items-center gap-2 rounded px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted';

// Who is signed in, with their password and sign-out, on every page.
export function HeaderBar({ staff, branch }: HeaderBarProps) {
  const t = useTranslations('panel');
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const panel = usePanel();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace(routes.login());
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-card px-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_12px_-4px_rgb(0_0_0/0.08)] md:px-6">
      <button
        type="button"
        onClick={panel.toggle}
        aria-label={panel.collapsed ? t('showMenu') : t('hideMenu')}
        title={panel.collapsed ? t('showMenu') : t('hideMenu')}
        className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icon name="sidebar" size={18} />
      </button>
      <div className="ml-auto flex items-center gap-3">
        <BranchSwitcher current={branch} />
        <Menu.Root>
          <Menu.Trigger className="flex items-center gap-2.5 rounded-md py-1 pr-2 pl-1 text-sm hover:bg-muted">
            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials(staff.fullName)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block leading-tight font-medium">{staff.fullName}</span>
              <span className="block text-xs leading-tight text-muted-foreground">
                {staff.roles.join(', ')}
              </span>
            </span>
            <Icon name="down" size={14} className="text-muted-foreground" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end" className="z-50">
              <Menu.Popup className="min-w-56 rounded-md bg-card p-1 shadow-lg ring-1 ring-border">
                <div className="px-2.5 py-2 text-xs text-muted-foreground">{staff.email}</div>
                <Menu.Item className={item} onClick={() => setChanging(true)}>
                  <Icon name="lock" size={16} />
                  {t('changePassword')}
                </Menu.Item>
                <Menu.Item className={item} onClick={signOut}>
                  <Icon name="logout" size={16} />
                  {t('signOut')}
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <ChangePasswordModal open={changing} onOpenChange={setChanging} />
    </header>
  );
}
