'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

type QuantityInputProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  // Parts of a pack (1.5) may be typed; otherwise whole numbers only.
  fraction?: boolean;
  'aria-label'?: string;
  className?: string;
};

// A box for a quantity that can be typed with a decimal point without losing "1." on the way.
export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 999,
  fraction = false,
  className,
  ...rest
}: QuantityInputProps) {
  // What is being typed; null when the box just shows the quantity.
  const [draft, setDraft] = useState<string | null>(null);
  const pattern = fraction ? /^\d{0,3}(\.\d{0,3})?$/ : /^\d{0,3}$/;

  return (
    <input
      aria-label={rest['aria-label']}
      inputMode={fraction ? 'decimal' : 'numeric'}
      value={draft ?? String(value)}
      onChange={(event) => {
        const typed = event.target.value;
        if (!pattern.test(typed)) return;
        setDraft(typed);
        const number = Number(typed);
        if (typed !== '' && !Number.isNaN(number) && number >= min && number <= max) {
          onChange(number);
        }
      }}
      onBlur={() => setDraft(null)}
      className={cn(
        'h-8 w-14 border-x border-border bg-transparent text-center text-sm tabular-nums outline-none',
        className,
      )}
    />
  );
}
