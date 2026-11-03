import { redirect } from 'next/navigation';

import { navigation } from '@/config/navigation';
import { can } from '@/config/permissions';
import { getMe, Sidebar } from '@/features/staff';
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
  const sections = navigation.filter((section) => can(me.permissions, section.permission));

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar sections={sections} staff={me} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
