'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'draft:';
const WAIT_MS = 700;

export type SavedDraft<T> = { value: T; savedAt: number };

function read<T>(key: string): SavedDraft<T> | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as SavedDraft<T>) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch {
    // Storage full or blocked: the draft is only a convenience.
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clean.
  }
}

// A form's unsent work kept in this browser, so a slip (the back button, a closed tab, a wrong click)
// costs nothing. While the form has work in it the draft is saved a moment after each change; on the
// next visit `found` holds what was kept, to continue or throw away. Nothing leaves this browser, and
// only what can be written as text is kept (a chosen photo is not).
export function useDraft<T>(key: string | null, value: T, dirty: boolean) {
  const [found, setFound] = useState<SavedDraft<T> | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const latest = useRef(value);
  const live = useRef(true);
  useEffect(() => {
    latest.current = value;
  });

  // What an earlier visit left, read once the page is in the browser.
  useEffect(() => {
    if (!key) return;
    const timer = setTimeout(() => setFound(read<T>(key)), 0);
    return () => clearTimeout(timer);
  }, [key]);

  // Any new change makes the draft worth keeping again.
  useEffect(() => {
    live.current = true;
  }, [value]);

  useEffect(() => {
    if (!key || !dirty) return;
    const timer = setTimeout(() => {
      if (!live.current) return;
      write(key, latest.current);
      setLastSaved(Date.now());
    }, WAIT_MS);
    return () => clearTimeout(timer);
  }, [key, dirty, value]);

  const saveNow = useCallback(() => {
    if (!key) return;
    write(key, latest.current);
    setLastSaved(Date.now());
  }, [key]);

  // After a save, or a deliberate discard: no draft, and none is written again until the form is
  // touched anew.
  const clear = useCallback(() => {
    live.current = false;
    if (key) remove(key);
    setFound(null);
    setLastSaved(null);
  }, [key]);

  return { found, lastSaved, saveNow, clear, dismiss: () => setFound(null) };
}
