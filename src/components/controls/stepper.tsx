'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Icon } from '@/components/icons';
import type { Locale } from '@/i18n/routing';
import { localDigits } from '@/lib/format';
import { cn } from '@/lib/utils';

type StepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  small?: boolean;
  // At the lowest count the minus becomes a bin, which asks before removing.
  onRemove?: () => void;
  disabled?: boolean;
};

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  small = false,
  onRemove,
  disabled = false,
}: StepperProps) {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const removing = onRemove !== undefined && value <= min;

  return (
    <div className={cn('stepper', small && 'stepper-sm')} role="group" aria-label={t('quantity')}>
      <button
        type="button"
        aria-label={removing ? t('remove') : t('decrease')}
        disabled={disabled || (!removing && value <= min)}
        onClick={() => (removing ? onRemove() : onChange(value - 1))}
      >
        <Icon name={removing ? 'trash' : 'minus'} size={16} />
      </button>
      <output aria-live="polite">{localDigits(String(value), locale)}</output>
      <button
        type="button"
        aria-label={t('increase')}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
