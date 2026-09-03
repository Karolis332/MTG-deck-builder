'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn, debounce } from '@/lib/utils';
import { TileFrame } from './TileFrame';
import { useTickOnChange } from './useTickOnChange';
import type { LiveRailDeck } from './types';
import type { DbCard } from '@/lib/types';

const COMMANDER_BENCHMARK_FORMATS = new Set(['commander', 'brawl', 'competitivebrawl']);

interface MetricDelta {
  build: number;
  refMedian: number;
  delta: number;
}

interface BenchmarkResponse {
  commander: string;
  format: string;
  targetBracket: number;
  refCount: number;
  refsPerBracket: Record<string, number>;
  bracketFilterApplied: boolean;
  quantitiesAvailable: boolean;
  overlapMeanPct: number;
  overlapBestPct: number;
  staplesMissing: Array<{
    name: string;
    freq: number;
    card: { id: string; name: string; image_uri_small: string | null; price_usd: string | null } | null;
  }>;
  oddCards: string[];
  deltas: Record<
    'lands' | 'ramp' | 'draw' | 'removal' | 'boardWipes' | 'tutors' | 'winCons' | 'protection' | 'avgCmcNonLand',
    MetricDelta
  >;
  curveL1: number;
  qualityIndex: number;
  unknownRefNames: string[];
  cachedAt: string;
}

const METRIC_LABELS: Record<string, string> = {
  lands: 'Lands', ramp: 'Ramp', draw: 'Draw', removal: 'Removal', boardWipes: 'Board wipes',
  tutors: 'Tutors', winCons: 'Win cons', protection: 'Protection', avgCmcNonLand: 'Avg CMC',
};

interface BenchmarkTileProps {
  deck: LiveRailDeck;
  onOpenCard: (card: DbCard) => void;
  onAskConsultant: (prompt: string) => void;
}

export function BenchmarkTile({ deck, onOpenCard, onAskConsultant }: BenchmarkTileProps) {
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchDebounced = useRef(debounce(async (...args: unknown[]) => {
    const deckId = args[0] as number;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/decks/${deckId}/benchmark`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load benchmark');
      setData(json as BenchmarkResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, 1500));

  const applicable = COMMANDER_BENCHMARK_FORMATS.has((deck.format ?? '').toLowerCase());
  const deckSignature = deck.cards.map((c) => `${c.board}:${c.name}:${c.quantity}`).sort().join('|');

  useEffect(() => {
    if (!applicable) return;
    fetchDebounced.current(deck.id);
    // deckSignature captures content changes; deck.id/applicable cover deck switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicable, deck.id, deckSignature]);

  const ticking = useTickOnChange(data?.qualityIndex);
  const byName = useMemo(() => new Map(deck.cards.map((c) => [c.name, c])), [deck.cards]);

  if (!applicable) {
    return (
      <TileFrame title="Benchmark" headline={<span className="text-xs text-muted-foreground">n/a</span>}>
        <p className="text-xs text-muted-foreground">Benchmarking is n/a for {deck.format ?? 'this format'}.</p>
      </TileFrame>
    );
  }

  return (
    <TileFrame
      title="Benchmark"
      headline={
        <span className={cn('hud-number text-sm', ticking && 'hud-tick')}>
          {data ? `${data.qualityIndex} / vs top ${data.refCount}` : loading ? '…' : '—'}
        </span>
      }
    >
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!data && !error && !loading && <p className="text-xs text-muted-foreground">No benchmark yet.</p>}
      {data && (
        <div className="space-y-2 text-xs">
          <div>
            Overlap: <span className="font-medium">{data.overlapMeanPct}%</span> mean,{' '}
            <span className="font-medium">{data.overlapBestPct}%</span> best
            {data.bracketFilterApplied && (
              <span className="ml-1 rounded bg-primary/20 px-1 text-[10px]">bracket-filtered</span>
            )}
          </div>
          {!data.quantitiesAvailable && (
            <p className="text-[10px] text-muted-foreground">Owned quantities unavailable for this deck.</p>
          )}
          {data.staplesMissing.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.staplesMissing.slice(0, 8).map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className="flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 hover:text-primary"
                  onClick={() => {
                    const owned = byName.get(s.name);
                    if (owned) onOpenCard(owned);
                    else if (s.card) onOpenCard(s.card as DbCard);
                    else onAskConsultant(`Add ${s.name}`);
                  }}
                  title={`${Math.round(s.freq * 100)}% of top decks`}
                >
                  {s.card?.image_uri_small && (
                    <img src={s.card.image_uri_small} alt="" className="h-6 w-auto rounded-sm" />
                  )}
                  {s.name}
                  <span
                    role="button"
                    tabIndex={-1}
                    className="ml-1 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAskConsultant(`Add ${s.name}`);
                    }}
                  >
                    +
                  </span>
                </button>
              ))}
            </div>
          )}
          <table className="w-full text-[11px]">
            <tbody>
              {Object.entries(data.deltas).map(([key, d]) => (
                <tr key={key}>
                  <td className="pr-2 text-muted-foreground">{METRIC_LABELS[key] ?? key}</td>
                  <td className="text-right tabular-nums">{d.build}</td>
                  <td className="pl-1 text-right tabular-nums text-muted-foreground">{d.refMedian.toFixed(1)}</td>
                  <td
                    className={cn(
                      'pl-1 text-right tabular-nums',
                      d.delta > 0 ? 'text-green-400' : d.delta < 0 ? 'text-red-400' : 'text-muted-foreground'
                    )}
                  >
                    {d.delta > 0 ? '+' : ''}
                    {d.delta.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TileFrame>
  );
}
