'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import {
  type ArenaMatchRow,
  matchResult,
  formatLabel,
  durationSeconds,
  formatDuration,
  parseGameResults,
  parseJson,
  buildTurnLanes,
} from './match-stats';
import { ResultBadge } from './MatchRow';
import { TurnTimeline, CardChip, makeResolver, type CardResolver } from './TurnTimeline';
import { useCardLookup } from './use-card-lookup';

interface TelemetryPayload {
  grpIdCards?: Record<string, { card_name: string; image_uri_small: string | null; image_uri_normal: string | null }>;
  cards?: Record<string, { image_uri_small: string | null; image_uri_normal: string | null }>;
}

interface MatchDetailProps {
  row: ArenaMatchRow;
  deckName: string | null;
  onClose: () => void;
  onOpenCard?: (card: DbCard) => void;
  onAskConsultant?: (prompt: string) => void;
}

// Modal, not a drawer: the rail is the narrowest pane of a three-pane layout and the
// timeline needs two lanes side by side. Same overlay pattern as CardDetailModal.
export function MatchDetail({ row, deckName, onClose, onOpenCard, onAskConsultant }: MatchDetailProps) {
  const [tel, setTel] = useState<TelemetryPayload>({});
  const [loading, setLoading] = useState(true);
  const { lookup } = useCardLookup();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/arena-telemetry?match_id=${encodeURIComponent(row.match_id)}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: TelemetryPayload) => { if (alive) setTel(d ?? {}); })
      .catch(() => { if (alive) setTel({}); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [row.match_id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const resolve: CardResolver = useMemo(() => makeResolver(tel.grpIdCards ?? {}, tel.cards ?? {}), [tel]);
  const lanes = useMemo(() => buildTurnLanes(row), [row]);
  const result = matchResult(row);
  const games = parseGameResults(row);
  const openingHand = parseJson<unknown[]>(row.opening_hand, []).map(String);
  const sideboard = parseJson<unknown[]>(row.sideboard_changes, []);
  const deckCards = parseJson<Array<{ id?: unknown; qty?: unknown; name?: unknown }>>(row.deck_cards, []);
  const commanderTurns = parseJson<unknown[]>(row.commander_cast_turns, []).map(String);

  const openCard = onOpenCard
    ? (name: string) => {
        lookup(name).then((card) => {
          if (card) onOpenCard(card);
          else toast({ title: `No card data for ${name}`, tone: 'warn' });
        });
      }
    : undefined;

  const explain = () => {
    if (!onAskConsultant) return;
    const oppCards = parseJson<unknown[]>(row.opponent_cards_seen, []).map(String).map(resolve).map((c) => c.name).filter((n) => !n.startsWith('#')).slice(0, 15);
    const mine = parseJson<unknown[]>(row.cards_played, []).map(String).map(resolve).map((c) => c.name).filter((n) => !n.startsWith('#')).slice(0, 20);
    const lines = [
      `Explain this ${formatLabel(row)} match I ${result ?? 'played'} vs ${row.opponent_name ?? 'an unknown opponent'}${row.opponent_commander ? ` (${row.opponent_commander})` : ''}.`,
      `Turns: ${row.turns ?? '?'}; on the ${row.on_play === 1 ? 'play' : row.on_play === 0 ? 'draw' : 'unknown'}; mulligans: ${row.mulligan_count ?? 0}.`,
      mine.length ? `I played: ${mine.join(', ')}.` : '',
      oppCards.length ? `Opponent showed: ${oppCards.join(', ')}.` : '',
      lanes.length ? `Life by turn: ${lanes.filter((l) => l.life).map((l) => `T${l.turn} ${l.life!.player}/${l.life!.opponent}`).join(', ')}.` : '',
      'What decided the game, and what should I change in the deck or my play?',
    ].filter(Boolean);
    onAskConsultant(lines.join('\n'));
    toast({ title: 'Sent to consultant', tone: 'ok' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Match detail">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="hud-panel hud-scanlines relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden">
        {/* Summary strip */}
        <div className="flex items-center gap-3 px-4 py-3">
          <ResultBadge result={result} className="text-xs" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              vs {row.opponent_name ?? 'Unknown'}
              {row.opponent_commander && <span className="text-muted-foreground"> · {row.opponent_commander}</span>}
            </div>
            <div className="truncate text-[10px] text-muted-foreground" title={row.queue_raw ?? row.format ?? undefined}>
              {formatLabel(row)}
              {deckName || row.player_commander ? ` · ${deckName ?? row.player_commander}` : ''}
              {row.match_start_time ? ` · ${new Date(row.match_start_time).toLocaleString()}` : ` · parsed ${row.parsed_at}`}
            </div>
          </div>
          <Stat label="Turns" value={row.turns != null ? String(row.turns) : '—'} />
          <Stat label="Time" value={formatDuration(durationSeconds(row))} />
          <Stat label="Start" value={row.on_play === 1 ? 'Play' : row.on_play === 0 ? 'Draw' : '—'} />
          <Stat label="Mulls" value={String(row.mulligan_count ?? 0)} />
          <button type="button" onClick={onClose} className="ml-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">✕</button>
        </div>
        <div className="hud-divider" />

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {(games.length > 0 || (row.game_count ?? 1) > 1) && (
            <Section title="Games">
              <div className="flex flex-wrap gap-1.5">
                {games.length > 0
                  ? games.map((g) => (
                      <span key={g.game} className="flex items-center gap-1 rounded border border-border/50 px-1.5 py-0.5 text-[10px]">
                        G{g.game} <ResultBadge result={g.result} />
                      </span>
                    ))
                  : <span className="text-[10px] text-muted-foreground">{row.game_count} games — per-game results not recorded for this match.</span>}
              </div>
            </Section>
          )}

          <Section title={`Opening hand${(row.mulligan_count ?? 0) > 0 ? ` · after ${row.mulligan_count} mulligan${row.mulligan_count === 1 ? '' : 's'}` : ''}`}>
            {openingHand.length === 0
              ? <span className="text-[10px] text-muted-foreground">Not recorded.</span>
              : <div className="flex flex-wrap gap-1">{openingHand.map((id, i) => <CardChip key={i} card={resolve(id)} onClick={openCard} />)}</div>}
          </Section>

          <Section title="Turn timeline">
            {loading
              ? <p className="py-3 text-center text-xs text-muted-foreground">Resolving cards…</p>
              : <TurnTimeline lanes={lanes} resolve={resolve} onOpenCard={openCard} />}
            {commanderTurns.length > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">Commander cast on turn{commanderTurns.length > 1 ? 's' : ''} {commanderTurns.join(', ')}.</p>
            )}
          </Section>

          {sideboard.length > 0 && (
            <Section title="Sideboard changes">
              <ul className="space-y-0.5 text-[10px]">
                {sideboard.map((s, i) => <li key={i} className="text-foreground/80">{typeof s === 'string' ? s : JSON.stringify(s)}</li>)}
              </ul>
            </Section>
          )}

          {deckCards.length > 0 && (
            <Section title={`Deck at match time · ${deckCards.reduce((n, c) => n + (Number(c.qty) || 1), 0)} cards`}>
              <div className="flex flex-wrap gap-1">
                {deckCards.map((c, i) => {
                  const card = resolve(String(c.name ?? c.id ?? ''));
                  const qty = Number(c.qty) || 1;
                  return (
                    <span key={i} className="inline-flex items-center gap-0.5">
                      {qty > 1 && <span className="text-[9px] text-muted-foreground">{qty}×</span>}
                      <CardChip card={card} onClick={openCard} />
                    </span>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        {onAskConsultant && (
          <>
            <div className="hud-divider" />
            <div className="flex justify-end px-4 py-2">
              <button
                type="button"
                onClick={explain}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Explain this match
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="hud-number text-sm font-bold leading-tight">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn(className)}>
      <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}
