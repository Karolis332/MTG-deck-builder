'use client';

import { useState } from 'react';

interface CraftCard {
  name: string;
  rarity: string;
  score: number;
  role: string;
  cmc: number;
}

interface CraftPath {
  idealGrade: string;
  ownedGrade: string;
  totalToCraft: number;
  byRarity: Record<'mythic' | 'rare' | 'uncommon' | 'common', CraftCard[]>;
  healthDelta: string[];
}

interface CraftPathPanelProps {
  commanderName: string | null;
  format: string | null;
  className?: string;
}

const RARITY_ORDER: Array<keyof CraftPath['byRarity']> = ['mythic', 'rare', 'uncommon', 'common'];
const RARITY_COLOR: Record<string, string> = {
  mythic: 'text-orange-400',
  rare: 'text-yellow-400',
  uncommon: 'text-slate-300',
  common: 'text-zinc-400',
};

export function CraftPathPanel({ commanderName, format, className }: CraftPathPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [path, setPath] = useState<CraftPath | null>(null);

  if (!commanderName) return null;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/decks/craft-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commanderName, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to compute craft path');
      setPath(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !path && !loading) void load();
  }

  return (
    <div className={className}>
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/30"
      >
        <span className="font-heading text-sm font-semibold tracking-wide text-primary">
          Upgrade Path — what to craft
        </span>
        <span className="text-xs text-muted-foreground">
          {path ? `${path.totalToCraft} cards` : open ? '…' : 'show'}
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-background/60 p-3">
          {loading && <div className="text-sm text-muted-foreground">Computing best-possible build…</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
          {path && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-accent/40 px-2 py-1">
                  Your build: <b>grade {path.ownedGrade}</b>
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="rounded-md bg-primary/20 px-2 py-1">
                  Best possible: <b>grade {path.idealGrade}</b>
                </span>
              </div>

              {path.healthDelta.length > 0 && (
                <ul className="mb-3 space-y-0.5 text-xs text-emerald-300/90">
                  {path.healthDelta.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              )}

              {path.totalToCraft === 0 ? (
                <div className="text-sm text-emerald-400">You already own every card in the optimal build.</div>
              ) : (
                <div className="space-y-3">
                  {RARITY_ORDER.map((r) => {
                    const list = path.byRarity[r];
                    if (!list?.length) return null;
                    return (
                      <div key={r}>
                        <div className={`mb-1 text-xs font-semibold uppercase tracking-wide ${RARITY_COLOR[r]}`}>
                          {r} wildcards ({list.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {list.map((c) => (
                            <span
                              key={c.name}
                              title={`${c.role} · score ${c.score}`}
                              className="rounded-md border border-border bg-card px-2 py-0.5 text-xs"
                            >
                              {c.name.split(' // ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
