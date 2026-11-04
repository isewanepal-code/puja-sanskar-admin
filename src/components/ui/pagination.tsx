'use client';

import { useTranslations } from 'next-intl';

import { SearchSelect } from '@/components/controls';
import { Icon, type IconName } from '@/components/icons';
import { cn } from '@/lib/utils';

export const PAGE_SIZES = [10, 20, 50, 100] as const;

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
};

// Pages to offer around the current one: first, last, and two either side.
function pagesAround(page: number, totalPages: number): Array<number | 'gap'> {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return pages.flatMap((p, index) => (index > 0 && p - pages[index - 1]! > 1 ? ['gap', p] : [p]));
}

const square =
  'grid size-8 place-items-center rounded-md border border-border bg-card text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40';

// Where the list is, how many rows a page holds, and the way to every page.
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onPageSize,
}: PaginationProps) {
  const t = useTranslations('table');
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const step = (icon: IconName, label: string, target: number, disabled: boolean) => (
    <button
      type="button"
      className={square}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onPage(target)}
    >
      <Icon name={icon} size={14} />
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{t('showing', { from, to, total })}</span>
        <label className="flex items-center gap-2">
          {t('perPage')}
          <SearchSelect
            value={String(pageSize)}
            required
            options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
            onChange={(value) => onPageSize(Number(value))}
            aria-label={t('perPage')}
            className="h-8 min-h-8 w-20 text-foreground"
          />
        </label>
      </div>
      {totalPages > 1 ? (
        <nav aria-label={t('pages')} className="flex items-center gap-1">
          {step('left', t('previous'), page - 1, page <= 1)}
          {pagesAround(page, totalPages).map((p, index) =>
            p === 'gap' ? (
              <span key={`gap-${index}`} className="px-1">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPage(p)}
                className={cn(
                  square,
                  'w-auto min-w-8 px-2',
                  p === page &&
                    'border-primary bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                {p}
              </button>
            ),
          )}
          {step('right', t('next'), page + 1, page >= totalPages)}
        </nav>
      ) : null}
    </div>
  );
}
