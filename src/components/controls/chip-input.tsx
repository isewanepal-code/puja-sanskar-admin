'use client';

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

const split = (text: string) =>
  text
    .split(/[,\n;]/)
    .map((part) => part.replace(/^#+/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

// Several words in one box: each becomes a chip on Enter or comma (or when pasted as a list), is kept
// once whatever its case, and goes with x or Backspace. The value is the words joined by ", ".
export function ChipInput({
  id,
  value,
  onChange,
  max = 20,
  maxLength = 80,
  placeholder,
  invalid,
  removeLabel = 'Remove',
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  maxLength?: number;
  placeholder?: string;
  invalid?: boolean;
  removeLabel?: string;
}) {
  const chips = split(value);
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const commit = (words: string[]) => {
    const seen = new Set(chips.map((chip) => chip.toLowerCase()));
    const next = [...chips];
    for (const word of words) {
      const key = word.toLowerCase();
      if (next.length >= max || seen.has(key)) continue;
      seen.add(key);
      next.push(word.slice(0, maxLength));
    }
    onChange(next.join(', '));
  };
  const flush = () => {
    if (draft.trim() === '') return;
    commit(split(draft));
    setDraft('');
  };
  const remove = (index: number) => onChange(chips.filter((_, i) => i !== index).join(', '));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      flush();
    } else if (event.key === 'Backspace' && draft === '' && chips.length > 0) {
      remove(chips.length - 1);
    }
  };
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (/[,\n;]/.test(text)) {
      event.preventDefault();
      commit(split(text));
    }
  };

  return (
    <div
      onClick={() => input.current?.focus()}
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-sm focus-within:border-primary',
        invalid ? 'border-destructive' : 'border-border',
      )}
    >
      {chips.map((chip, index) => (
        <span
          key={chip.toLowerCase()}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
        >
          {chip}
          <button
            type="button"
            aria-label={`${removeLabel} ${chip}`}
            onClick={(event) => {
              event.stopPropagation();
              remove(index);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </span>
      ))}
      {chips.length < max ? (
        <input
          ref={input}
          id={id}
          value={draft}
          maxLength={maxLength}
          placeholder={chips.length === 0 ? placeholder : undefined}
          autoComplete="off"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={flush}
          className="min-w-24 flex-1 bg-transparent outline-none"
        />
      ) : null}
      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
        {chips.length}/{max}
      </span>
    </div>
  );
}
