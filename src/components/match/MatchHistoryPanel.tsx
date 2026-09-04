'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { TileFrame } from '@/components/command-center/tiles/TileFrame';
import {
  type ArenaMatchRow,
  type MatchFilters,
  type NormalizedFormat,
  type DatePreset,
  type ResultFilter,
  EMPTY_FILTERS,
  FORMAT_LABELS,
  computeRecord,
  currentStreak,
  sparklineSeries,
  sparklinePoints,
  filterMatches,
  normalizeFormat,
  matchTime,
} from './match-stats';
import { MatchRow } from './MatchRow';
import { MatchDetail } from './MatchDetail';
import { useCardLookup } from './use-card-lookup';

const PAGE = 50;
const DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'All time' }, { id: '7d', label: '7 days' }, { id: '30d', label: '30 days' }, { id: '90d', label: '90 days' },
];
const RESULTS: Array<{ id: ResultFilter; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'win', label: 'W' }, { id: 'loss', label: 'L' }, { id: 'draw', label: 'D' },
];

interface MatchHistoryPanelProps {
  deckId: number;
  onOpenCard?: (card: DbCard) => void;
  onAskConsultant?: (prompt: string) => void;
  className?: string;
}

export function MatchHistoryPanel({ deckId, onOpenCard, onAskConsultant, className }: MatchHistoryPanelProps) {
  const [rows, setRows] = useState<ArenaMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deckNames, setDeckNames] = useState<Record<number, string>>({});
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_FILTERS);
  const [shown, setShown] = useState(PAGE);
  const [detail, setDetail] = useState<ArenaMatchRow | null>(null);
  const { cards: commanderCards, lookup } = useCardLookup();

  useEffect(() => {
    let alive = true;
    fetch('/api/arena-matches')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { matches?: ArenaMatchRow[] }) => {
        if (!alive) return;
        const sorted = [...(d.matches ?? [])].sort((a, b) => matchTime(b) - matchTime(a));
        setRows(sorted);
        // Default to this deck when it has linked matches; otherwise show everything.
        setFilters((f) => ({ ...f, deckId: sorted.some((m) => m.deck_id === deckId) ? deckId : null }));
      })
      .catch((e: Error) => { if (alive) toast({ title: `Match history failed to load: ${e.message}`, tone: 'error' }); })
      .finally(() => { if (alive) setLoading(false); });
    fetch('/api/decks')
      .then((r) => (r.ok ? r.json() : { decks: [] }))
      .then((d: { decks?: Array<{ id: number; name: string }> }) => {
        if (!alive) return;
        setDeckNames(Object.fromEntries((d.decks ?? []).map((x) => [x.id, x.name])));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [deckId]);

  // Batched opponent-commander image lookups, one per distinct name, only for visible rows.
  const filtered = useMemo(() => filterMatches(rows, filters), [rows, filters]);
  const visible = filtered.slice(0, shown);
  useEffect(() => {
    const names = new Set(visible.map((r) => r.opponent_commander).filter((n): n is string => !!n));
    names.forEach((n) => { if (!(n in commanderCards)) lookup(n); });
  }, [visible, commanderCards, lookup]);

  const record = computeRecord(filtered);
  const streak = currentStreak(filtered);
  const series = sparklineSeries(filtered);
  const presentFormats = useMemo(() => {
    const set = new Set<NormalizedFormat>(rows.map(normalizeFormat));
    return (Object.keys(FORMAT_LABELS) as NormalizedFormat[]).filter((f) => set.has(f));
  }, [rows]);
  const hasThisDeck = rows.some((m) => m.deck_id === deckId);

  const toggleFormat = (f: NormalizedFormat) =>
    setFilters((s) => ({ ...s, formats: s.formats.includes(f) ? s.formats.filter((x) => x !== f) : [...s.formats, f] }));
  const set = <K extends keyof MatchFilters>(k: K, v: MatchFilters[K]) => { setFilters((s) => ({ ...s, [k]: v })); setShown(PAGE); };

  const headline = record.total > 0 ? (
    <div className="flex items-center gap-2 text-xs">
      <span className="hud-number font-bold"><span className="text-green-400">{record.wins}</span>–<span className="text-red-400">{record.losses}</span>{record.draws > 0 && <span className="text-yellow-400">–{record.draws}</span>}</span>
      <span className={cn('hud-number rounded px-1.5 py-0.5 font-bold', (record.winPct ?? 0) >= 50 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
        {record.winPct ?? '—'}%
      </span>
      {streak && (
        <span className={cn('text-[10px] font-semibold', streak.kind === 'win' ? 'text-green-400' : 'text-red-400')} title="Current streak">
          {streak.kind === 'win' ? 'W' : 'L'}{streak.length}
        </span>
      )}
      <Sparkline series={series} />
    </div>
  ) : <span className="text-[10px] text-muted-foreground">{loading ? 'loading…' : 'no matches'}</span>;

  return (
    <>
      <TileFrame title="Match History" headline={headline} className={className}>
        {/* Filters */}
        <div className="mb-2 space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {hasThisDeck && (
              <Chip active={filters.deckId === deckId} onClick={() => set('deckId', filters.deckId === deckId ? null : deckId)}>This deck</Chip>
            )}
            {presentFormats.map((f) => (
              <Chip key={f} active={filters.formats.includes(f)} onClick={() => { toggleFormat(f); setShown(PAGE); }}>{FORMAT_LABELS[f]}</Chip>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex overflow-hidden rounded-md border border-border/60">
              {RESULTS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => set('result', r.id)}
                  className={cn('px-1.5 py-0.5 text-[10px]', filters.result === r.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent/40')}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={filters.opponent}
              onChange={(e) => set('opponent', e.target.value)}
              placeholder="Opponent / commander"
              aria-label="Filter by opponent"
              className="min-w-0 flex-1 rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] outline-none focus:border-primary"
            />
            <select
              value={filters.date}
              onChange={(e) => set('date', e.target.value as DatePreset)}
              aria-label="Date range"
              className="rounded-md border border-border/60 bg-background/60 px-1 py-0.5 text-[10px] outline-none"
            >
              {DATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Rows */}
        {loading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Loading matches…</p>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No matches for these filters.{' '}
            <button type="button" className="text-primary hover:underline" onClick={() => { setFilters(EMPTY_FILTERS); setShown(PAGE); }}>Clear</button>
          </p>
        ) : (
          <div className="space-y-1">
            {visible.map((row) => (
              <MatchRow
                key={row.id}
                row={row}
                commander={row.opponent_commander ? commanderCards[row.opponent_commander] : null}
                deckName={row.deck_id != null ? deckNames[row.deck_id] ?? null : null}
                onOpen={() => setDetail(row)}
              />
            ))}
            {filtered.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="w-full rounded-md border border-border/60 py-1 text-[10px] text-muted-foreground hover:bg-accent/40"
              >
                Load {Math.min(PAGE, filtered.length - shown)} more · {filtered.length - shown} remaining
              </button>
            )}
          </div>
        )}
      </TileFrame>

      {detail && (
        <MatchDetail
          row={detail}
          deckName={detail.deck_id != null ? deckNames[detail.deck_id] ?? null : null}
          onClose={() => setDetail(null)}
          onOpenCard={onOpenCard}
          onAskConsultant={onAskConsultant}
        />
      )}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-2 py-0.5 text-[10px] transition-colors',
        active ? 'border-primary/60 bg-primary/20 text-primary' : 'border-border/60 text-muted-foreground hover:bg-accent/40',
      )}
    >
      {children}
    </button>
  );
}

function Sparkline({ series }: { series: number[] }) {
  if (series.length < 2) return null;
  const w = 48, h = 14;
  const up = series[series.length - 1] >= 0;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-label={`Last ${series.length} results`}>
      <polyline
        points={sparklinePoints(series, w - 2, h - 2)}
        fill="none"
        stroke={up ? '#4ade80' : '#f87171'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        transform="translate(1,1)"
      />
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="space-y-1.5 py-3 text-center text-xs text-muted-foreground">
      <p className="font-medium text-foreground/80">No Arena matches parsed yet.</p>
      <p>
        In MTG Arena enable <span className="text-foreground/80">Options → Account → Detailed Logs (Plugin Support)</span>, play a match,
        then run <span className="text-foreground/80">Settings → Arena → Parse Full Log</span> here. Live matches are picked up automatically while the log watcher runs.
      </p>
    </div>
  );
}
