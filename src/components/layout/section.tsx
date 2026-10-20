import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type SectionProps = ComponentProps<'section'> & {
  // Full-width bands alternate white and warm cream.
  band?: 'white' | 'cream';
};

export function Section({ band, className, children, ...props }: SectionProps) {
  if (!band) {
    return (
      <section className={cn('section', className)} {...props}>
        {children}
      </section>
    );
  }
  return (
    <section className={cn('band', band === 'cream' && 'band-alt', className)} {...props}>
      <div className="container">{children}</div>
    </section>
  );
}
