'use client';

import { useCallback, useRef, useState } from 'react';
import type { DbCard } from '@/lib/types';

/** Name → DbCard via GET /api/cards/search?q=&limit=1, cached for the component's lifetime. */
export function useCardLookup() {
  const [cards, setCards] = useState<Record<string, DbCard | null>>({});
  const inflight = useRef(new Map<string, Promise<DbCard | null>>());

  const lookup = useCallback((name: string): Promise<DbCard | null> => {
    const key = name.trim();
    if (!key) return Promise.resolve(null);
    if (key in cards) return Promise.resolve(cards[key]);
    const pending = inflight.current.get(key);
    if (pending) return pending;
    const p = fetch(`/api/cards/search?q=${encodeURIComponent(key)}&limit=1`)
      .then((r) => (r.ok ? r.json() : { cards: [] }))
      .then((d: { cards?: DbCard[] }) => {
        const hit = d.cards?.find((c) => c.name.toLowerCase() === key.toLowerCase()) ?? d.cards?.[0] ?? null;
        setCards((prev) => ({ ...prev, [key]: hit }));
        return hit;
      })
      .catch(() => {
        setCards((prev) => ({ ...prev, [key]: null }));
        return null;
      })
      .finally(() => inflight.current.delete(key));
    inflight.current.set(key, p);
    return p;
  }, [cards]);

  return { cards, lookup };
}
