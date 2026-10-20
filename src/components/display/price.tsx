import type { Locale } from '@/i18n/routing';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

type PriceProps = {
  amount: string;
  locale: Locale;
  // The "was" price, struck through when higher.
  was?: string | null;
  className?: string;
};

export function Price({ amount, locale, was, className }: PriceProps) {
  return (
    <>
      <span className={cn('price', className)}>{formatMoney(amount, locale)}</span>
      {was ? <s className="price-was">{formatMoney(was, locale)}</s> : null}
    </>
  );
}
