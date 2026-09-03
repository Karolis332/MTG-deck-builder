'use client';

import { useMemo } from 'react';
import { TileFrame } from './TileFrame';
import { useTickOnChange } from './useTickOnChange';
import { computeCoverageStats } from './coverage-selectors';
import { CraftPathPanel } from '@/components/craft-path-panel';
import { COMMANDER_FORMATS } from '@/lib/constants';
import type { LiveRailDeck } from './types';
import type { DbCard } from '@/lib/types';

interface CoverageTileProps {
  deck: LiveRailDeck;
  onOpenCard: (card: DbCard) => void;
}

export function CoverageTile({ deck, onOpenCard }: CoverageTileProps) {
  const stats = useMemo(() => computeCoverageStats(deck.cards, deck.format), [deck.cards, deck.format]);
  const ticking = useTickOnChange(stats.ownedPct);

  const byName = useMemo(() => new Map(deck.cards.map((c) => [c.name, c])), [deck.cards]);
  const commanderName = deck.cards.find((c) => c.board === 'commander')?.name ?? null;
  const isCommanderFormat = (COMMANDER_FORMATS as readonly string[]).includes((deck.format ?? '').toLowerCase());

  return (
    <TileFrame
      title="Coverage"
      headline={
        <span className={ticking ? 'hud-tick' : undefined}>
          <span className="hud-number text-sm">{stats.ownedPct}%</span>{' '}
          <span className="hud-number text-xs text-muted-foreground">${stats.totalValueUsd.toFixed(0)}</span>
        </span>
      }
    >
      <div className="space-y-2 text-xs">
        {stats.illegalCardNames.length > 0 && (
          <div>
            <span className="text-red-400">Illegal ({stats.illegalCardNames.length}):</span>{' '}
            {stats.illegalCardNames.map((name) => (
              <button
                key={name}
                type="button"
                className="mr-1 rounded bg-red-500/10 px-1 text-red-300 hover:underline"
                onClick={() => {
                  const card = byName.get(name);
                  if (card) onOpenCard(card);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {stats.notOnArenaCount > 0 && (
          <div className="text-muted-foreground">{stats.notOnArenaCount} not on Arena</div>
        )}
        {isCommanderFormat && (
          <CraftPathPanel commanderName={commanderName} format={deck.format} className="mt-1" />
        )}
      </div>
    </TileFrame>
  );
}
