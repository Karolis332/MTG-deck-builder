'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CardInlineText } from '@/components/card-inline';
import type { GameLogEntry } from '@/lib/electron-bridge';

// ── Types ────────────────────────────────────────────────────────────────────

interface GameNarrativeProps {
  entries: GameLogEntry[];
  format: string | null;
  playerName: string | null;
  opponentName: string | null;
  playerLife: number;
  opponentLife: number;
  /** Map of grpId → { imageUriSmall, imageUriNormal, name } for card art hover */
  cardImages: Record<number, { name: string; imageUriSmall: string | null; imageUriNormal: string | null }>;
}

interface TurnChapter {
  turnNumber: number;
  selfEntries: GameLogEntry[];
  opponentEntries: GameLogEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupByTurn(entries: GameLogEntry[]): TurnChapter[] {
  const chapters: TurnChapter[] = [];
  let current: TurnChapter | null = null;

  for (const entry of entries) {
    // System entries and results go into turn 0
    if (entry.type === 'system' || entry.type === 'result') {
      // Don't group these into turns
      continue;
    }

    const turnNum: number = entry.turnNumber ?? (current?.turnNumber ?? 1);

    if (!current || current.turnNumber !== turnNum) {
      current = { turnNumber: turnNum, selfEntries: [], opponentEntries: [] };
      chapters.push(current);
    }

    if (entry.isSelf === true || entry.player === 'self') {
      current.selfEntries.push(entry);
    } else if (entry.isSelf === false || entry.player === 'opponent') {
      current.opponentEntries.push(entry);
    } else {
      // Phase labels and neutral entries go to both
      current.selfEntries.push(entry);
    }
  }

  return chapters;
}

function lifeBarClass(life: number): string {
  if (life > 14) return 'life-high';
  if (life > 7) return 'life-medium';
  return 'life-low';
}

function lifePercent(life: number, startingLife = 20): number {
  return Math.max(0, Math.min(100, (life / startingLife) * 100));
}

function romanize(num: number): string {
  const roman: [number, string][] = [
    [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let remaining = num;
  for (const [value, symbol] of roman) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

// ── Verb Icons ───────────────────────────────────────────────────────────────

const VERB_ICONS: Record<string, string> = {
  cast: '\u2728',       // ✨
  played: '\u25C7',     // ◇
  drew: '\u25C6',       // ◆
  destroyed: '\u2620',  // ☠
  exiled: '\u2300',     // ⌀
  countered: '\u2718',  // ✘
  sacrificed: '\u2694', // ⚔
  discarded: '\u2193',  // ↓
  milled: '\u2193',     // ↓
  returned: '\u21A9',   // ↩
};

// ── Sub-components ───────────────────────────────────────────────────────────

function NarrativeHeader({
  format, playerName, opponentName, playerLife, opponentLife,
}: {
  format: string | null;
  playerName: string | null;
  opponentName: string | null;
  playerLife: number;
  opponentLife: number;
}) {
  const [playerPulse, setPlayerPulse] = useState('');
  const [opponentPulse, setOpponentPulse] = useState('');
  const prevPlayerLife = useRef(playerLife);
  const prevOpponentLife = useRef(opponentLife);

  useEffect(() => {
    if (playerLife < prevPlayerLife.current) {
      setPlayerPulse('life-loss-pulse');
      setTimeout(() => setPlayerPulse(''), 600);
    } else if (playerLife > prevPlayerLife.current) {
      setPlayerPulse('life-gain-pulse');
      setTimeout(() => setPlayerPulse(''), 600);
    }
    prevPlayerLife.current = playerLife;
  }, [playerLife]);

  useEffect(() => {
    if (opponentLife < prevOpponentLife.current) {
      setOpponentPulse('life-loss-pulse');
      setTimeout(() => setOpponentPulse(''), 600);
    } else if (opponentLife > prevOpponentLife.current) {
      setOpponentPulse('life-gain-pulse');
      setTimeout(() => setOpponentPulse(''), 600);
    }
    prevOpponentLife.current = opponentLife;
  }, [opponentLife]);

  return (
    <div className="grimoire-border mx-3 mt-2 mb-1 p-3">
      {format && (
        <div className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">
          {format}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        {/* Player side */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-heading text-xs tracking-wide text-primary truncate">
              {playerName || 'You'}
            </span>
            <span className="text-xs font-bold tabular-nums text-foreground/80 ml-1">{playerLife}</span>
          </div>
          <div className={cn('narrative-life-bar', playerPulse)}>
            <div
              className={cn('narrative-life-fill', lifeBarClass(playerLife))}
              style={{ width: `${lifePercent(playerLife)}%` }}
            />
          </div>
        </div>

        {/* VS divider */}
        <div className="text-[10px] font-heading tracking-widest text-muted-foreground/40 px-1">VS</div>

        {/* Opponent side */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-heading text-xs tracking-wide text-red-400/70 truncate">
              {opponentName || 'Opponent'}
            </span>
            <span className="text-xs font-bold tabular-nums text-foreground/80 ml-1">{opponentLife}</span>
          </div>
          <div className={cn('narrative-life-bar', opponentPulse)}>
            <div
              className={cn('narrative-life-fill', lifeBarClass(opponentLife))}
              style={{ width: `${lifePercent(opponentLife)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NarrativeEntry({
  entry, cardImages,
}: {
  entry: GameLogEntry;
  cardImages: Record<number, { name: string; imageUriSmall: string | null; imageUriNormal: string | null }>;
}) {
  const icon = entry.verb ? VERB_ICONS[entry.verb] || '\u2B25' : '\u2B25'; // ⬥ default

  // Phase labels
  if (entry.type === 'phase') {
    return (
      <div className="narrative-phase-label">
        &middot; &middot; &middot; {entry.text} &middot; &middot; &middot;
      </div>
    );
  }

  // Turn headers inside player section (shouldn't happen normally but guard)
  if (entry.type === 'turn') return null;

  // Card name with art hover
  const cardImg = entry.cardGrpId ? cardImages[entry.cardGrpId] : undefined;
  const targetImg = entry.targetGrpId ? cardImages[entry.targetGrpId] : undefined;

  // Style by verb/type
  const isLand = entry.verb === 'played';
  const isCast = entry.verb === 'cast';
  const isDraw = entry.verb === 'drew';
  const isDestroyed = entry.verb === 'destroyed' || entry.verb === 'sacrificed';
  const isCountered = entry.verb === 'countered';
  const isDiscard = entry.verb === 'discarded' || entry.verb === 'milled';

  // Life entries
  if (entry.type === 'life') {
    const isLoss = entry.amount && entry.lifeBefore !== undefined && entry.lifeAfter !== undefined && entry.lifeAfter < entry.lifeBefore;
    return (
      <div className={cn(
        'narrative-entry flex items-start gap-1.5',
        isLoss ? 'text-red-400/80' : 'text-emerald-400/80',
      )}>
        <span className="mt-0.5 text-[10px] shrink-0">{isLoss ? '\u2764' : '\u2764'}</span>
        <span>{entry.text}</span>
      </div>
    );
  }

  // Damage entries
  if (entry.type === 'damage') {
    return (
      <div className="narrative-entry flex items-start gap-1.5 text-red-400/90">
        <span className="mt-0.5 text-[10px] shrink-0">{'\u2694'}</span>
        <span>
          {cardImg && entry.cardName ? (
            <CardInlineText
              name={entry.cardName}
              imageUri={cardImg.imageUriSmall}
              imageUriNormal={cardImg.imageUriNormal}
              className="text-red-300 font-semibold"
            />
          ) : entry.cardName || ''}
          {' dealt '}
          <span className="font-bold">{entry.amount}</span>
          {' damage to '}
          {targetImg && entry.targetCardName ? (
            <CardInlineText
              name={entry.targetCardName}
              imageUri={targetImg.imageUriSmall}
              imageUriNormal={targetImg.imageUriNormal}
              className="text-red-300"
            />
          ) : entry.targetCardName || ''}
        </span>
      </div>
    );
  }

  // Actions
  return (
    <div className={cn(
      'narrative-entry flex items-start gap-1.5',
      isLand && 'text-amber-600/50',
      isCast && 'text-primary/90',
      isDraw && (entry.isSelf ? 'text-sky-300/80' : 'text-muted-foreground/50 italic'),
      isDestroyed && 'text-red-400/60',
      isCountered && 'text-blue-400/70 line-through decoration-blue-400/30',
      isDiscard && 'text-muted-foreground/50',
      !entry.verb && 'text-foreground/70',
    )}>
      <span className="mt-0.5 text-[10px] shrink-0 opacity-50">{icon}</span>
      <span>
        {cardImg && entry.cardName ? (
          <>
            {/* Show player name prefix for certain verbs */}
            {(entry.verb === 'discarded' || entry.verb === 'sacrificed' || entry.verb === 'drew') && (
              <span className="text-foreground/60">
                {entry.isSelf ? '' : ''}
              </span>
            )}
            <CardInlineText
              name={entry.cardName}
              imageUri={cardImg.imageUriSmall}
              imageUriNormal={cardImg.imageUriNormal}
              className={cn(
                isCast && 'font-semibold text-primary',
                isLand && 'text-amber-600/70',
                isDraw && entry.isSelf && 'text-sky-300',
              )}
            />
            {isCast && (
              <span className="ml-1 inline-block w-1 h-3 bg-primary/20 rounded-full" />
            )}
          </>
        ) : (
          // Fallback to plain text
          <span>{entry.text}</span>
        )}
        {/* If text has more context beyond card name, show the rest */}
        {!cardImg && entry.cardName && <span>{entry.text}</span>}
      </span>
    </div>
  );
}

function ChapterHeader({ turnNumber }: { turnNumber: number }) {
  return (
    <div className="narrative-chapter-header">
      Chapter {romanize(turnNumber)} &mdash; Turn {turnNumber}
    </div>
  );
}

function PlayerSection({
  player, playerName, entries, cardImages,
}: {
  player: 'self' | 'opponent';
  playerName: string;
  entries: GameLogEntry[];
  cardImages: Record<number, { name: string; imageUriSmall: string | null; imageUriNormal: string | null }>;
}) {
  if (entries.length === 0) return null;

  // Filter out turn entries (they're rendered as chapter headers)
  const actionEntries = entries.filter(e => e.type !== 'turn');
  if (actionEntries.length === 0) return null;

  return (
    <div className={cn(
      'narrative-player-section',
      player === 'self' ? 'narrative-player-self' : 'narrative-player-opponent',
    )}>
      <div className={cn(
        'narrative-player-banner',
        player === 'self' ? 'text-primary/70' : 'text-red-400/50',
      )}>
        {playerName}
      </div>
      {actionEntries.map((entry, i) => (
        <NarrativeEntry key={i} entry={entry} cardImages={cardImages} />
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function GameNarrative({
  entries, format, playerName, opponentName,
  playerLife, opponentLife, cardImages,
}: GameNarrativeProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  // Extract system entries and result
  const systemEntries = useMemo(
    () => entries.filter(e => e.type === 'system'),
    [entries],
  );
  const resultEntry = useMemo(
    () => entries.find(e => e.type === 'result'),
    [entries],
  );

  // Group action entries into turn chapters
  const chapters = useMemo(() => groupByTurn(entries), [entries]);

  return (
    <div className="flex h-full flex-col grimoire-page">
      {/* Header with life bars */}
      <NarrativeHeader
        format={format}
        playerName={playerName}
        opponentName={opponentName}
        playerLife={playerLife}
        opponentLife={opponentLife}
      />

      {/* Narrative body */}
      <div className="flex-1 overflow-y-auto px-3 py-2 narrative-scroll">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-2 opacity-30">&#128214;</div>
              <div className="text-xs text-muted-foreground/50 font-heading tracking-wide">
                The chronicle awaits...
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* System messages (match start) */}
            {systemEntries.map((entry, i) => (
              <div
                key={`sys-${i}`}
                className="text-center text-[10px] text-muted-foreground/50 italic py-1"
              >
                {entry.text}
              </div>
            ))}

            {/* Turn chapters */}
            {chapters.map((chapter) => (
              <div key={chapter.turnNumber} className="narrative-chapter">
                <ChapterHeader turnNumber={chapter.turnNumber} />

                <PlayerSection
                  player="self"
                  playerName={playerName || 'You'}
                  entries={chapter.selfEntries}
                  cardImages={cardImages}
                />
                <PlayerSection
                  player="opponent"
                  playerName={opponentName || 'Opponent'}
                  entries={chapter.opponentEntries}
                  cardImages={cardImages}
                />
              </div>
            ))}

            {/* Victory / Defeat */}
            {resultEntry && (
              <div className={cn(
                resultEntry.verb === 'win' || resultEntry.player === 'self'
                  ? 'narrative-victory text-grimoire'
                  : 'narrative-defeat',
              )}>
                {resultEntry.text}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
