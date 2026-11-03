import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getCatalogue, groupOptions } from '@/features/puja-groups';
import { getPuja, PujaForm } from '@/features/pujas';
import { Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/server';
import { found } from '@/lib/api';
import { routes } from '@/lib/routes';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/pujas/list/[id]'>): Promise<Metadata> {
  const puja = await found(getPuja((await params).id));
  return { title: `[${puja.code}] ${puja.nameEn}` };
}

export default async function PujaPage({ params }: PageProps<'/[locale]/pujas/list/[id]'>) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: 'pujas' });
  const [puja, catalogue] = await Promise.all([found(getPuja((await params).id)), getCatalogue()]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">
          {t('puja.editTitle', { code: puja.code })} · {puja.nameNe}
        </h2>
        {puja.groupId ? (
          <Link
            href={routes.pujaGroups(puja.groupId)}
            className="text-sm text-primary hover:underline"
          >
            {t('tabs.groups')}
          </Link>
        ) : null}
      </div>
      <PujaForm key={puja.updatedAt} puja={puja} groups={groupOptions(catalogue.groups)} />
    </div>
  );
}
