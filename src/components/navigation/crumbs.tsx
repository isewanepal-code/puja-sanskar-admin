import { getTranslations } from 'next-intl/server';

import { JsonLd } from '@/components/seo';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCanonicalUrl } from '@/lib/seo';

export type Crumb = { label: string; href?: string };

type CrumbsProps = {
  locale: Locale;
  // After Home; the last one is the current page and has no link.
  items: Crumb[];
};

export async function Crumbs({ locale, items }: CrumbsProps) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const trail: Crumb[] = [{ label: t('home'), href: '/' }, ...items];

  return (
    <>
      <nav className="crumbs" aria-label={t('breadcrumb')}>
        {trail.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="crumb">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href && i < trail.length - 1 ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: trail.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.label,
            ...(crumb.href && { item: getCanonicalUrl(locale, crumb.href) }),
          })),
        }}
      />
    </>
  );
}
