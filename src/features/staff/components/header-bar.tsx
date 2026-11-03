'use client';

import { Menu } from '@base-ui/react/menu';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import { routes } from '@/lib/routes';

import { ChangePasswordModal } from './change-password-modal';

type HeaderBarProps = {
  staff: { fullName: string; email: string; roles: string[] };
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
export function HeaderBar({ staff }: HeaderBarProps) {
  const t = useTranslations('panel');
  const router = useRouter();
  const [changing, setChanging] = useState(false);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace(routes.login());
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
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
      <ChangePasswordModal open={changing} onOpenChange={setChanging} />
    </header>
  );
}
