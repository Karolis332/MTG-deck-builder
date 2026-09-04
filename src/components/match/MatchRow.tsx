'use client';

import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';
import {
  type ArenaMatchRow,
  matchResult,
  formatLabel,
  durationSeconds,
  formatDuration,
} from './match-stats';

export const RESULT_STYLE: Record<string, string> = {
  win: 'bg-green-500/20 text-green-400 border-green-500/30',
  loss: 'bg-red-500/20 text-red-400 border-red-500/30',
  draw: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  unknown: 'bg-muted text-muted-foreground border-border',
};

export function ResultBadge({ result, className }: { result: string | null; className?: string }) {
  const r = result ?? 'unknown';
  return (
    <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none', RESULT_STYLE[r] ?? RESULT_STYLE.unknown, className)}>
      {r === 'unknown' ? '?' : r}
    </span>
  );
}

export function FormatBadge({ row }: { row: ArenaMatchRow }) {
  return (
    <span
      className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary/90"
      title={row.queue_raw ?? row.format ?? 'unknown queue'}
    >
      {formatLabel(row)}
    </span>
  );
}

interface MatchRowProps {
  row: ArenaMatchRow;
  commander: DbCard | null | undefined;
  deckName: string | null;
  onOpen: () => void;
}

export function MatchRow({ row, commander, deckName, onOpen }: MatchRowProps) {
  const result = matchResult(row);
  const dur = formatDuration(durationSeconds(row));
  const lowConfidence = row.deck_id != null && row.deck_match_confidence != null && row.deck_match_confidence < 0.7;
  const mulls = row.mulligan_count ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors hover:bg-accent/30',
        result === 'win' ? 'border-green-500/15' : result === 'loss' ? 'border-red-500/15' : 'border-border/60',
      )}
    >
      <ResultBadge result={result} className="w-10 text-center" />

      {commander?.image_uri_small ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={commander.image_uri_art_crop ?? commander.image_uri_small}
          alt={commander.name}
          title={commander.name}
          className="h-7 w-7 shrink-0 rounded object-cover ring-1 ring-border/50"
          loading="lazy"
        />
      ) : (
        <span className="h-7 w-7 shrink-0 rounded bg-muted/40 ring-1 ring-border/30" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{row.opponent_name || 'Unknown opponent'}</span>
          <FormatBadge row={row} />
        </div>
        <div className="flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
          {row.opponent_commander ? <span className="truncate" title={row.opponent_commander}>{row.opponent_commander}</span> : <span className="italic">commander n/a</span>}
          {row.deck_id != null && (
            <>
              <span>·</span>
              <a
                href={`/deck/${row.deck_id}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate text-primary/80 hover:text-primary hover:underline"
                title={lowConfidence ? `Deck match confidence ${Math.round((row.deck_match_confidence ?? 0) * 100)}%` : (row.player_commander ?? undefined)}
              >
                {deckName ?? row.player_commander ?? `Deck #${row.deck_id}`}{lowConfidence ? ' ?' : ''}
              </a>
            </>
          )}
          {row.deck_id == null && row.player_commander && (
            <>
              <span>·</span>
              <span className="truncate">{row.player_commander}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
        <span className="hud-number" title="Turns">{row.turns ? `T${row.turns}` : '—'}</span>
        <span className="hud-number w-12 text-right" title="Duration">{dur}</span>
        {row.on_play === 1 && <span title="On the play" className="text-blue-400">▲</span>}
        {row.on_play === 0 && <span title="On the draw" className="text-orange-400">▼</span>}
        {row.on_play == null && <span className="opacity-30">·</span>}
        <span title={`${mulls} mulligan${mulls === 1 ? '' : 's'}`} className={cn('w-6 text-right', mulls > 0 ? 'text-amber-400' : 'opacity-40')}>
          M{mulls}
        </span>
      </div>
    </div>
  );
}
