'use client';

import { Popover } from '@base-ui/react/popover';
import { useState, type ReactNode } from 'react';

import { Icon, type IconName } from '@/components/icons';
import { cn } from '@/lib/utils';

export type RowMenuItem = {
  icon: IconName;
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

// The rest of a row's actions behind one "More" button, each named in words rather than an icon.
export function RowMenu({
  label,
  items,
  compact = false,
}: {
  label: string;
  items: RowMenuItem[];
  // Only the dots, when the row is short of room; the label is still read out and shown on hover.
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={label}
        title={label}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[0.8rem] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {compact ? (
          <span aria-hidden="true" className="px-0.5 text-base leading-none">
            ⋯
          </span>
        ) : (
          label
        )}
        {compact ? null : <Icon name="down" size={12} aria-hidden="true" />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="end" className="z-[60]">
          <Popover.Popup className="min-w-44 overflow-hidden rounded-md bg-card py-1 shadow-lg ring-1 ring-border outline-none">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted',
                  item.danger && 'text-destructive',
                )}
              >
                <Icon name={item.icon} size={15} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
