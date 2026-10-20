import type { Locale } from '@/i18n/routing';
import { localDigits } from '@/lib/format';

type RatingProps = {
  average: string | null;
  count: number;
  locale: Locale;
  label: string;
};

// "★ 4.6 (64)"; nothing until the first review.
export function Rating({ average, count, locale, label }: RatingProps) {
  if (!average || count === 0) return null;
  return (
    <span className="rating" aria-label={label}>
      <span className="star" aria-hidden="true">
        ★
      </span>{' '}
      {localDigits(Number(average).toFixed(1), locale)}
      <span className="muted"> ({localDigits(String(count), locale)})</span>
    </span>
  );
}
