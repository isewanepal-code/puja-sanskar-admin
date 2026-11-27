'use client';

import { Popover } from '@base-ui/react/popover';
import { useTranslations } from 'next-intl';

import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

type ColumnSearchProps = {
  label: string;
  value: string;
  yesNo: boolean;
  onChange: (value: string) => void;
};

// The funnel beside a heading: a small search for that column, marked while it narrows rows.
export function ColumnSearch({ label, value, yesNo, onChange }: ColumnSearchProps) {
  const t = useTranslations('table');
  const active = value.trim() !== '';
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={label}
        title={label}
        className={cn(
          'relative grid size-6 place-items-center rounded-sm transition-colors hover:bg-card hover:text-foreground',
          active
            ? 'text-primary'
            : 'text-muted-foreground/35 group-hover:text-muted-foreground data-[popup-open]:text-foreground',
        )}
      >
        <Icon name="filter" size={12} />
        {active ? (
          <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary" />
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup
            initialFocus={(type) => type === 'keyboard' || undefined}
            className="w-60 rounded-md bg-card p-2.5 text-left normal-case shadow-lg ring-1 ring-border outline-none"
          >
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
            {yesNo ? (
              <div className="grid grid-cols-3 gap-1">
                {(['', 'true', 'false'] as const).map((choice) => (
                  <button
                    key={choice || 'any'}
                    type="button"
                    onClick={() => onChange(choice)}
                    className={cn(
                      'h-8 rounded-sm border border-border text-sm transition-colors hover:bg-muted',
                      value === choice && 'border-primary bg-primary/8 text-primary',
                    )}
                  >
                    {choice === '' ? t('any') : choice === 'true' ? t('yes') : t('no')}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="search"
                autoFocus
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={t('filter')}
                className="h-9 w-full rounded-sm border border-border bg-card px-2.5 text-sm focus:border-primary focus:outline-none"
              />
            )}
            {active ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {t('clearFilter')}
              </button>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
