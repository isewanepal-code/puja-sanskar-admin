import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { routes } from '@/lib/routes';

import type { Puja } from '../types';

type PujasTableProps = {
  pujas: Puja[];
  // "[H1] दैनिक तथा नियमित पूजा (PUJ)" for each group id.
  groupLabels: Map<string, string>;
};

export function PujasTable({ pujas, groupLabels }: PujasTableProps) {
  const t = useTranslations('pujas.list');
  const tk = useTranslations('pujas.types');

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">{t('columns.code')}</th>
            <th className="px-3 py-2 font-medium">{t('columns.name')}</th>
            <th className="px-3 py-2 font-medium">{t('columns.group')}</th>
            <th className="px-3 py-2 font-medium">{t('columns.type')}</th>
            <th className="px-3 py-2 font-medium">{t('columns.status')}</th>
          </tr>
        </thead>
        <tbody>
          {pujas.map((puja) => (
            <tr key={puja.id} className="hover:bg-muted">
              <td className="rounded-l-lg px-3 py-2.5 font-semibold whitespace-nowrap">
                <Link href={routes.puja(puja.id)} className="text-primary hover:underline">
                  {puja.code}
                </Link>
              </td>
              <td className="px-3 py-2.5">
                <div>{puja.nameNe}</div>
                <div className="text-xs text-muted-foreground">{puja.nameEn}</div>
              </td>
              <td className="px-3 py-2.5">
                {puja.groupId ? (
                  (groupLabels.get(puja.groupId) ?? '—')
                ) : (
                  <span className="text-muted-foreground">{t('unfiled')}</span>
                )}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">{tk(puja.type)}</td>
              <td className="rounded-r-lg px-3 py-2.5">
                <span className={puja.isActive ? 'chip chip-success' : 'chip'}>
                  {puja.isActive ? t('on') : t('off')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
