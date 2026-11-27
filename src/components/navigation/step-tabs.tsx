import { cn } from '@/lib/utils';

// The numbered steps of a record's page (details, items, packing): one is open, a click opens another.
export function StepTabs<Step extends string>({
  steps,
  current,
  onSelect,
  label,
  ariaLabel,
}: {
  steps: readonly Step[];
  current: Step;
  onSelect: (step: Step) => void;
  label: (step: Step) => string;
  ariaLabel: string;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label={ariaLabel}>
      {steps.map((name, index) => (
        <li key={name}>
          <button
            type="button"
            aria-current={current === name ? 'step' : undefined}
            onClick={() => onSelect(name)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
              current === name
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="grid size-5 place-items-center rounded-full bg-muted text-[0.7rem]">
              {index + 1}
            </span>
            {label(name)}
          </button>
        </li>
      ))}
    </ol>
  );
}
