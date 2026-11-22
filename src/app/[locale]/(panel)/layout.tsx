import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { navigationFor } from '@/config/navigation';
import { can } from '@/config/permissions';
import {
  BranchSwitcher,
  getAdminLanguage,
  getMe,
  HeaderBar,
  PanelShell,
  Sidebar,
  SIDEBAR_COOKIE,
  TestModeSwitch,
} from '@/features/staff';
import { BRANCH_COOKIE, TEST_MODE_COOKIE } from '@/lib/session';
import { resolveLocale } from '@/i18n/server';
import { isApiError } from '@/lib/api';
import { serverEnv } from '@/lib/env/server';
import { routes } from '@/lib/routes';

export default async function PanelLayout({ children, params }: LayoutProps<'/[locale]'>) {
  await resolveLocale(params);

  // The language is asked for together with who is signed in, not after it.
  const [me, defaultLanguage] = await Promise.all([getMe(), getAdminLanguage()]).catch(
    (error: unknown) => {
      // A session the API no longer accepts goes back to sign-in.
      if (isApiError(error) && error.status === 401) redirect(routes.login());
      throw error;
    },
  );

  const jar = await cookies();
  const collapsed = jar.get(SIDEBAR_COOKIE)?.value === 'collapsed';
  const branch = jar.get(BRANCH_COOKIE)?.value ?? '';
  const testMode = serverEnv.TEST_MODE_ALWAYS || jar.get(TEST_MODE_COOKIE)?.value === 'on';

  return (
    <PanelShell initialCollapsed={collapsed}>
      <Sidebar
        groups={navigationFor(me.permissions)}
        extras={
          <>
            <BranchSwitcher current={branch} />
            <TestModeSwitch initialOn={testMode} locked={serverEnv.TEST_MODE_ALWAYS} />
          </>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar
          staff={me}
          branch={branch}
          canEditWebsite={can(me.permissions, 'site-texts:edit')}
          testMode={testMode}
          testModeLocked={serverEnv.TEST_MODE_ALWAYS}
          defaultLanguage={defaultLanguage}
        />
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </PanelShell>
  );
}
