import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { Schema } from '@/lib/api';
import { routes } from '@/lib/routes';

type RitualType = Schema<'AdminRitualTypeResponse'>;

export function RitualTypesTable({ ritualTypes }: { ritualTypes: RitualType[] }) {
  const t = useTranslations('pujas.ritualTypes.columns');
  const tl = useTranslations('pujas.list');

  return (
    <table className="w-full max-w-3xl text-left text-sm">
      <thead className="text-muted-foreground">
        <tr>
          <th className="px-3 py-2 font-medium">{t('code')}</th>
          <th className="px-3 py-2 font-medium">{t('name')}</th>
          <th className="px-3 py-2 font-medium">{t('order')}</th>
          <th className="px-3 py-2 font-medium">{t('status')}</th>
        </tr>
      </thead>
      <tbody>
        {ritualTypes.map((type) => (
          <tr key={type.id} className="hover:bg-muted">
            <td className="rounded-l-lg px-3 py-2.5 font-semibold">
              <Link href={routes.ritualType(type.id)} className="text-primary hover:underline">
                {type.code}
              </Link>
            </td>
            <td className="px-3 py-2.5">
              {type.nameNe} <span className="text-muted-foreground">· {type.nameEn}</span>
            </td>
            <td className="px-3 py-2.5">{type.sortOrder}</td>
            <td className="rounded-r-lg px-3 py-2.5">
              <span className={type.isActive ? 'chip chip-success' : 'chip'}>
                {type.isActive ? tl('on') : tl('off')}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
