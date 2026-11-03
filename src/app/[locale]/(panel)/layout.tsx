import { redirect } from 'next/navigation';

import { navigationFor } from '@/config/navigation';
import { getMe, HeaderBar, Sidebar } from '@/features/staff';
import { resolveLocale } from '@/i18n/server';
import { isApiError } from '@/lib/api';
import { routes } from '@/lib/routes';

export default async function PanelLayout({ children, params }: LayoutProps<'/[locale]'>) {
  await resolveLocale(params);

  const me = await getMe().catch((error: unknown) => {
    // A session the API no longer accepts goes back to sign-in.
    if (isApiError(error) && error.status === 401) redirect(routes.login());
    throw error;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar groups={navigationFor(me.permissions)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar staff={me} />
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
