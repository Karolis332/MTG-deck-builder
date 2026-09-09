'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, debounce } from '@/lib/utils';
import { TileFrame } from './TileFrame';
import { useTickOnChange } from './useTickOnChange';
import type { LiveRailDeck } from './types';

interface PowerLevelResponse {
  powerLevel: number;
  score: number;
  efficiency: number;
  tippingPoint: number;
  impactTotal: number;
  avgCost: number;
  bracket: number;
  cardsWithoutPrice: string[];
  credit: { name: string; url: string };
  perCardTop: Array<{ name: string; impact: number }>;
}

interface PowerLevelTileProps {
  deck: LiveRailDeck;
}

export function PowerLevelTile({ deck }: PowerLevelTileProps) {
  const [data, setData] = useState<PowerLevelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchDebounced = useRef(debounce(async (...args: unknown[]) => {
    const deckId = args[0] as number;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/decks/${deckId}/power-level`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load power level');
      setData(json as PowerLevelResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, 1500));

  const deckSignature = deck.cards.map((c) => `${c.board}:${c.name}:${c.quantity}`).sort().join('|');

  useEffect(() => {
    fetchDebounced.current(deck.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id, deckSignature]);

  const ticking = useTickOnChange(data?.powerLevel);

  return (
    <TileFrame
      title="Power Level"
      headline={
        <span className={cn('hud-number text-sm', ticking && 'hud-tick')}>
          {data ? `${data.powerLevel.toFixed(1)} / 10` : loading ? '…' : '—'}
        </span>
      }
    >
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!data && !error && !loading && <p className="text-sm text-muted-foreground">No power level yet.</p>}
      {data && (
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">
            Score <span className="font-medium text-foreground">{data.score.toFixed(0)}</span> · Efficiency{' '}
            <span className="font-medium text-foreground">{data.efficiency.toFixed(2)}</span> · Tipping point{' '}
            <span className="font-medium text-foreground">{data.tippingPoint}</span>
          </div>
          <div className="text-muted-foreground">
            Bracket estimate <span className="font-medium text-foreground">B{data.bracket}</span>
          </div>
          {data.cardsWithoutPrice.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {data.cardsWithoutPrice.length} card{data.cardsWithoutPrice.length === 1 ? '' : 's'} missing price data.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Power level by{' '}
            <a
              href={data.credit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              {data.credit.name}
            </a>
          </p>
        </div>
      )}
    </TileFrame>
  );
}
