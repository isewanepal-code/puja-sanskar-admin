import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

// A small sum that updates as the numbers are typed: what is made, what it takes, what is left.
export function RepackSum({
  made,
  opens,
  label,
  stockNow,
  opened,
  stockAfter,
  tooMany,
  tooMuch,
  showLeft,
  madeShown,
  openedShown,
  leftShown,
  unit,
}: {
  made: string;
  opens: string;
  label: string;
  stockNow: number;
  opened: number;
  stockAfter: number;
  tooMany: boolean;
  tooMuch: boolean;
  showLeft: boolean;
  madeShown: number;
  openedShown: number;
  leftShown: number;
  unit: string;
}) {
  const t = useTranslations('repack');
  return (
    <div
      role="status"
      className={cn(
        'grid gap-1 rounded-md border px-3 py-2 text-sm',
        tooMuch || tooMany ? 'border-destructive' : 'border-border',
      )}
    >
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">{t('sumMake')}</span>
        <span className="font-medium tabular-nums">{made}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">{t('sumUse')}</span>
        <span className="font-medium tabular-nums">{opens}</span>
      </div>
      <div
        className={cn(
          'flex justify-between gap-3 border-t border-border pt-1',
          tooMany && 'font-semibold text-destructive',
        )}
      >
        <span className="text-muted-foreground">{t('sumAfter')}</span>
        <span className="tabular-nums">
          {stockNow} − {opened} = {stockAfter} × {label}
        </span>
      </div>
      {tooMany ? (
        <span className="text-destructive">{t('sumShort', { count: stockNow, label })}</span>
      ) : null}
      {tooMuch ? (
        <span className="text-destructive">
          {t('tooMuch', { made: madeShown, opened: openedShown, unit })}
        </span>
      ) : showLeft ? (
        <span className="text-muted-foreground">{t('sumLeft', { left: leftShown, unit })}</span>
      ) : null}
    </div>
  );
}
