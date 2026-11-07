import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { RANGES, type Range } from '../lib/periods';

// Last 7, 30 or 90 days; the choice is in the address, so it can be shared and reloaded.
export function RangeTabs({ current, label }: { current: Range; label: (days: Range) => string }) {
  return (
    <nav className="inline-flex rounded-lg bg-muted p-1" aria-label="Range">
      {RANGES.map((days) => (
        <Link
          key={days}
          href={`/?range=${days}`}
          aria-current={days === current ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            days === current
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label(days)}
        </Link>
      ))}
    </nav>
  );
}
