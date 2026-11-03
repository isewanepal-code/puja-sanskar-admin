'use client';

import { Popover } from '@base-ui/react/popover';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Icon } from '@/components/icons';
import { control } from '@/components/ui/input';
import type { Choice, ChoiceSource } from '@/lib/choices';
import { cn } from '@/lib/utils';

const matches = (choice: Choice, words: string[]) => {
  const text = `${choice.label} ${choice.detail ?? ''} ${choice.group ?? ''}`.toLowerCase();
  return words.every((word) => text.includes(word));
};

function useDebounced<T>(value: T, ms = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

type Props = {
  source: ChoiceSource;
  value: string | string[];
  onChange: (value: string | string[], chosen: Choice[]) => void;
  multiple?: boolean;
  id?: string;
  placeholder?: string;
  // Labels already known for the saved values, so nothing is fetched to show them.
  known?: Choice[];
  invalid?: boolean;
  disabled?: boolean;
  // Leaves out the empty choice of a required field.
  required?: boolean;
  // Borderless, for a cell of the bulk grid.
  bare?: boolean;
  className?: string;
  'aria-label'?: string;
};

// The one dropdown of the admin. A short list is searched here; a long one is searched by
// the API as staff type and pages in more on scroll, so nothing loads every record.
export function SearchSelect({
  source,
  value,
  onChange,
  multiple = false,
  id,
  placeholder,
  known,
  invalid,
  disabled,
  required,
  bare,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const t = useTranslations('select');
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const [active, setActive] = useState(0);
  // Choices picked here, so their labels stay after the search moves on.
  const [picked, setPicked] = useState<Choice[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const endRef = useRef<HTMLLIElement>(null);

  const values = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value]);
  const remote = 'search' in source ? source : null;

  // A whole list loads once (or as soon as a value needs its label) and is searched here.
  const whole = useQuery({
    queryKey: ['options', source.key],
    queryFn: () => ('load' in source ? source.load() : Promise.resolve<Choice[]>([])),
    enabled: !remote && (open || values.length > 0),
    staleTime: 5 * 60 * 1000,
  });
  const results = useInfiniteQuery({
    queryKey: ['options', source.key, 'search', q],
    queryFn: ({ pageParam }) => remote!.search(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.more ? pages.length + 1 : undefined),
    enabled: open && !!remote,
    staleTime: 60 * 1000,
  });

  const needle = text.trim().toLowerCase();
  const choices = useMemo(() => {
    if (remote) return results.data?.pages.flatMap((page) => page.choices) ?? [];
    const words = needle.split(/\s+/).filter(Boolean);
    return (whole.data ?? []).filter((choice) => matches(choice, words));
  }, [remote, results.data, whole.data, needle]);

  const shown = useMemo(
    () =>
      new Map(
        [...(known ?? []), ...(whole.data ?? []), ...choices, ...picked].map((c) => [c.value, c]),
      ),
    [known, whole.data, choices, picked],
  );
  const missing = values.filter((v) => !shown.has(v));
  const found = useQuery({
    queryKey: ['options', source.key, 'find', missing],
    queryFn: async () =>
      (await Promise.all(missing.map((v) => remote!.find!(v).catch(() => null)))).filter(
        (choice): choice is Choice => choice !== null,
      ),
    enabled: missing.length > 0 && !!remote?.find,
    staleTime: 5 * 60 * 1000,
  });
  const labels = useMemo(
    () => new Map([...shown, ...(found.data ?? []).map((c) => [c.value, c] as const)]),
    [shown, found.data],
  );

  // Scrolling to the end of the list asks for the next page.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = results;
  useEffect(() => {
    const end = endRef.current;
    if (!open || !end || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { root: listRef.current, rootMargin: '80px' },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage, choices.length]);

  const loadingLabels = found.isFetching || (!remote && whole.isPending);
  const labelOf = (v: string) => labels.get(v)?.label ?? (loadingLabels ? t('loading') : v);
  const chosen = (vs: string[]) =>
    vs.map((v) => labels.get(v)).filter((c): c is Choice => c !== undefined);

  const pick = (choice: Choice | null) => {
    if (choice)
      setPicked((current) => [...current.filter((c) => c.value !== choice.value), choice]);
    if (!multiple) {
      onChange(choice?.value ?? '', choice ? [choice] : []);
      setOpen(false);
      setText('');
      return;
    }
    if (!choice) return onChange([], []);
    const next = values.includes(choice.value)
      ? values.filter((v) => v !== choice.value)
      : [...values, choice.value];
    const lookup = new Map(labels).set(choice.value, choice);
    onChange(
      next,
      next.map((v) => lookup.get(v)).filter((c): c is Choice => c !== undefined),
    );
  };

  const move = (to: number) => {
    setActive(to);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${to}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(Math.min(active + 1, choices.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(Math.max(active - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (choices[active]) pick(choices[active]);
    }
  };

  const loading = (remote ? results.isPending : whole.isPending) || isFetchingNextPage;
  const failed = remote ? results.isError : whole.isError;

  return (
    <Popover.Root open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <Popover.Trigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-haspopup="listbox"
        className={cn(
          bare
            ? 'flex h-8 w-full items-center gap-1 bg-transparent px-2 text-left text-sm outline-none focus:bg-primary/5'
            : cn(control, 'flex min-h-9 items-center gap-1 py-1 text-left'),
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {values.length === 0 ? (
            <span className="truncate text-muted-foreground">{placeholder ?? t('choose')}</span>
          ) : multiple ? (
            values.map((v) => (
              <span
                key={v}
                className="inline-flex max-w-full items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs"
              >
                <span className="truncate">{labelOf(v)}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={t('remove', { name: labelOf(v) })}
                  onClick={(event) => {
                    event.stopPropagation();
                    const next = values.filter((x) => x !== v);
                    onChange(next, chosen(next));
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Icon name="x" size={12} />
                </span>
              </span>
            ))
          ) : (
            <span className="truncate">{labelOf(values[0]!)}</span>
          )}
        </span>
        <Icon name="down" size={14} className="shrink-0 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start" className="z-[60]">
          <Popover.Popup className="w-[var(--anchor-width)] min-w-72 overflow-hidden rounded-md bg-card shadow-lg ring-1 ring-border outline-none">
            <div className="flex items-center gap-2 border-b border-border px-2.5">
              <Icon name="search" size={14} className="text-muted-foreground" />
              <input
                autoFocus
                type="search"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={t('search')}
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={choices[active] ? `${listId}-${active}` : undefined}
                className="h-10 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-multiselectable={multiple || undefined}
              className="max-h-72 overflow-y-auto py-1"
            >
              {!multiple && !required && values.length > 0 && !needle ? (
                <li
                  role="option"
                  aria-selected={false}
                  onClick={() => pick(null)}
                  className="cursor-pointer px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  {t('none')}
                </li>
              ) : null}
              {choices.map((choice, index) => {
                const selected = values.includes(choice.value);
                const heading =
                  choice.group && choice.group !== choices[index - 1]?.group ? choice.group : null;
                return (
                  <li key={`${choice.value}-${index}`} role="presentation">
                    {heading ? (
                      <div className="px-3 pt-2 pb-1 text-[0.68rem] font-semibold tracking-wider text-muted-foreground uppercase">
                        {heading}
                      </div>
                    ) : null}
                    <div
                      id={`${listId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => pick(choice)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                        index === active && 'bg-muted',
                        selected && 'font-medium text-primary',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {choice.label}
                        {choice.detail ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {choice.detail}
                          </span>
                        ) : null}
                      </span>
                      {selected ? <Icon name="check" size={14} /> : null}
                    </div>
                  </li>
                );
              })}
              {loading ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">{t('loading')}</li>
              ) : failed ? (
                <li className="px-3 py-2 text-sm text-destructive">{t('failed')}</li>
              ) : choices.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">{t('noMatch')}</li>
              ) : null}
              <li ref={endRef} aria-hidden className="h-px" />
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
