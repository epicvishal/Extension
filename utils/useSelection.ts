import { useCallback, useState } from 'react';

// Tracks which rows are ticked, by key.
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const setAll = useCallback((keys: string[], on: boolean) => {
    setSelected(on ? new Set(keys) : new Set());
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return { selected, toggle, setAll, clear };
}
