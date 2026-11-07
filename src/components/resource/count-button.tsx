import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type CountButtonProps = {
  children: ReactNode;
  // Read out and shown on hover: "Open packs of Loban".
  label: string;
  onClick: () => void;
};

// A count in a table that opens what it counts, without also opening the row's edit form.
export function CountButton({ children, label, onClick }: CountButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'inline-flex min-w-8 items-center justify-center rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary',
        'underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
      )}
    >
      {children}
    </button>
  );
}
