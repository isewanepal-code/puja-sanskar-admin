import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

// Every text box, select and text area shares these lines.
export const control =
  'w-full rounded-md border border-border bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60 aria-invalid:border-destructive';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-9', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea className={cn(control, 'min-h-20 py-2 leading-relaxed', className)} {...props} />
  );
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, 'h-9 pr-8', className)} {...props} />;
}

type SwitchProps = Omit<ComponentProps<'input'>, 'type'> & { label: string };

// An on/off choice with its label beside it.
export function Switch({ label, className, ...props }: SwitchProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm', className)}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 rounded-full bg-border transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-card after:shadow after:transition-transform peer-checked:after:translate-x-4"
      />
      {label}
    </label>
  );
}
