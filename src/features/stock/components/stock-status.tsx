import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import type { Schema } from '@/lib/api';

// One word a shopkeeper reads at a glance. A size with no row yet was never bought; one with a row and
// nothing on the shelf is sold out.
export function StockStatus({ level }: { level: Schema<'StockLevelResponse'> }) {
  const t = useTranslations('stockStatus');
  const never = level.updatedAt === null && level.onHand <= 0;
  return (
    <div className="grid justify-items-end gap-0.5">
      <Badge
        tone={
          never
            ? 'neutral'
            : level.available <= 0
              ? 'danger'
              : level.isLowStock
                ? 'warning'
                : 'success'
        }
      >
        {never
          ? t('never')
          : level.available <= 0
            ? t('out')
            : level.isLowStock
              ? t('low')
              : t('ok')}
      </Badge>
      {level.reserved > 0 ? (
        <span className="text-[0.7rem] text-muted-foreground">
          {t('kept', { count: level.reserved })}
        </span>
      ) : null}
    </div>
  );
}
