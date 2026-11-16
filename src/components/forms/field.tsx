import type { ReactNode } from 'react';

import { InfoTip } from '@/components/ui/info-tip';
import { cn } from '@/lib/utils';

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  // A longer explanation, opened by the "i" beside the label.
  help?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
};

// A label, its control, then either the API's complaint or a hint.
export function Field({ label, htmlFor, hint, help, error, className, children }: FieldProps) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <span className="inline-flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {help ? <InfoTip text={help} /> : null}
      </span>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// A titled part of a long form, separated by space rather than boxes.
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
