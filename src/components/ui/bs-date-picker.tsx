'use client';

import { Popover } from '@base-ui/react/popover';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Icon } from '@/components/icons';
import {
  adToBs,
  BS_FIRST_YEAR,
  BS_LAST_YEAR,
  BS_MONTHS,
  bsMonthLength,
  bsMonthStartsOn,
  bsToAd,
  formatBsDate,
  parseIsoDay,
  toIsoDay,
  type CalendarDay,
} from '@/lib/format';
import { cn } from '@/lib/utils';

type BsDatePickerProps = {
  id?: string;
  // AD, as the API takes it: "2026-11-03", or "2026-11-03T10:30" with a time.
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  invalid?: boolean;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const YEARS = Array.from({ length: BS_LAST_YEAR - BS_FIRST_YEAR + 1 }, (_, i) => BS_FIRST_YEAR + i);

const today = (): CalendarDay => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
};

const sameDay = (a: CalendarDay | null, b: CalendarDay) =>
  !!a && a.year === b.year && a.month === b.month && a.day === b.day;

const select =
  'h-8 rounded-sm border border-border bg-card px-1.5 text-sm text-foreground focus:border-primary focus:outline-none';

// Picks a day on the Nepali calendar and hands back its AD date.
export function BsDatePicker({ id, value, onChange, withTime, invalid }: BsDatePickerProps) {
  const t = useTranslations('datePicker');
  const day = value ? value.slice(0, 10) : '';
  const time = value.length > 10 ? value.slice(11, 16) : '';
  const chosen = day ? adToBs(parseIsoDay(day)) : null;
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(() => chosen ?? adToBs(today()));

  const emit = (ad: string, at = time) => onChange(withTime ? `${ad}T${at || '10:00'}` : ad);
  const pick = (bs: CalendarDay) => {
    emit(toIsoDay(bsToAd(bs)));
    if (!withTime) setOpen(false);
  };
  const move = (by: number) =>
    setShown(({ year, month }) => {
      const index = year * 12 + (month - 1) + by;
      const next = { year: Math.floor(index / 12), month: (index % 12) + 1, day: 1 };
      return next.year < BS_FIRST_YEAR || next.year > BS_LAST_YEAR ? { year, month, day: 1 } : next;
    });

  const length = bsMonthLength(shown.year, shown.month);
  const lead = bsMonthStartsOn(shown.year, shown.month);
  const todayBs = adToBs(today());

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next && chosen) setShown(chosen);
        setOpen(next);
      }}
    >
      <Popover.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-left text-sm transition-colors hover:border-foreground/30 focus-visible:border-primary focus-visible:outline-none aria-invalid:border-destructive',
          !value && 'text-muted-foreground',
        )}
      >
        <Icon name="calendar" size={16} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">
          {day ? (
            <>
              {formatBsDate(day, 'en')}
              {time ? `, ${time}` : ''}
              <span className="ml-2 text-xs text-muted-foreground">{day}</span>
            </>
          ) : (
            t('choose')
          )}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-[60]">
          <Popover.Popup
            // Keyboard users land inside; a click leaves the focus ring off.
            initialFocus={(type) => type === 'keyboard'}
            className="w-72 rounded-md bg-card p-3 shadow-lg ring-1 ring-border outline-none"
          >
            <div className="mb-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label={t('previousMonth')}
                className="grid size-8 place-items-center rounded-sm hover:bg-muted"
              >
                <Icon name="left" size={14} />
              </button>
              <select
                aria-label={t('month')}
                value={shown.month}
                onChange={(event) => setShown({ ...shown, month: Number(event.target.value) })}
                className={cn(select, 'flex-1')}
              >
                {BS_MONTHS.map(([en, ne], index) => (
                  <option key={en} value={index + 1}>
                    {en} · {ne}
                  </option>
                ))}
              </select>
              <select
                aria-label={t('year')}
                value={shown.year}
                onChange={(event) => setShown({ ...shown, year: Number(event.target.value) })}
                className={select}
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label={t('nextMonth')}
                className="grid size-8 place-items-center rounded-sm hover:bg-muted"
              >
                <Icon name="right" size={14} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((weekday) => (
                <span
                  key={weekday}
                  className="py-1 text-[0.7rem] font-medium text-muted-foreground"
                >
                  {weekday}
                </span>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <span key={`lead-${i}`} />
              ))}
              {Array.from({ length }, (_, i) => {
                const cell = { ...shown, day: i + 1 };
                const selected = sameDay(chosen, cell);
                return (
                  <button
                    key={cell.day}
                    type="button"
                    onClick={() => pick(cell)}
                    aria-pressed={selected}
                    className={cn(
                      'grid h-8 place-items-center rounded-sm text-sm transition-colors hover:bg-muted',
                      sameDay(todayBs, cell) && 'font-semibold text-primary',
                      selected && 'bg-primary text-primary-foreground hover:bg-primary',
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            {withTime ? (
              <label className="mt-3 flex items-center justify-between gap-2 text-sm">
                {t('time')}
                <input
                  type="time"
                  value={time}
                  disabled={!day}
                  onChange={(event) => emit(day, event.target.value)}
                  className={cn(select, 'w-32')}
                />
              </label>
            ) : null}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setShown(todayBs);
                  pick(todayBs);
                }}
                className="font-medium text-primary hover:underline"
              >
                {t('today')}
              </button>
              {value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('clear')}
                </button>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
