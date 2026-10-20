import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { localDigits } from '@/lib/format';

type PaginationProps = {
  locale: Locale;
  page: number;
  totalPages: number;
  // The list's path and its other query parameters; page is added here.
  pathname: string;
  query?: Record<string, string | undefined>;
};

const href = (pathname: string, query: PaginationProps['query'], page: number) => {
  const params = new URLSearchParams(
    Object.entries({ ...query, page: page > 1 ? String(page) : undefined }).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
};

// Pages the server renders as links, so every page is crawlable without JavaScript.
export async function Pagination({ locale, page, totalPages, pathname, query }: PaginationProps) {
  if (totalPages <= 1) return null;
  const t = await getTranslations({ locale, namespace: 'nav' });
  const near = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav className="pagination" aria-label={t('pages')}>
      {page > 1 ? (
        <Link href={href(pathname, query, page - 1)} rel="prev">
          {t('previous')}
        </Link>
      ) : null}
      {near.map((p, i) => (
        <span key={p} className="page-slot">
          {i > 0 && p - near[i - 1]! > 1 ? <span aria-hidden="true">…</span> : null}
          {p === page ? (
            <span aria-current="page">{localDigits(String(p), locale)}</span>
          ) : (
            <Link href={href(pathname, query, p)}>{localDigits(String(p), locale)}</Link>
          )}
        </span>
      ))}
      {page < totalPages ? (
        <Link href={href(pathname, query, page + 1)} rel="next">
          {t('next')}
        </Link>
      ) : null}
    </nav>
  );
}
