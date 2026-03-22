'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { GameLogEntry } from '@/lib/electron-bridge';

// ── Types ────────────────────────────────────────────────────────────────────

interface CardImageData {
  name: string;
  imageUriSmall: string | null;
  imageUriNormal: string | null;
}

interface GameNarrativeProps {
  entries: GameLogEntry[];
  format: string | null;
  playerName: string | null;
  opponentName: string | null;
  playerLife: number;
  opponentLife: number;
  /** Map of grpId → { imageUriSmall, imageUriNormal, name } for card art hover */
  cardImages: Record<number, CardImageData>;
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

/** Inline card art thumbnail with hover-to-enlarge preview. */
function NarrativeCardArt({
  name, imageUri, imageUriNormal, size = 'md', className,
}: {
  name: string;
  imageUri: string | null;
  imageUriNormal?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  if (!imageUri) return null;

  const dims = size === 'sm' ? 'w-[32px] h-[45px]' : 'w-[44px] h-[62px]';

  const handleMouseEnter = () => {
    if (!imageUriNormal && !imageUri) return;
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPreviewPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setShowPreview(true);
  };

  return (
    <>
      <span
        ref={ref}
        className={cn('inline-flex shrink-0 cursor-pointer', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowPreview(false)}
      >
        <img
          src={imageUri}
          alt={name}
          className={cn(dims, 'rounded border border-border/40 object-cover shadow-sm')}
          loading="lazy"
        />
      </span>
      {showPreview && (imageUriNormal || imageUri) && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: `${previewPos.x}px`, top: `${previewPos.y}px`, transform: 'translate(-50%, -105%)' }}
        >
          <img
            src={imageUriNormal || imageUri || undefined}
            alt={name}
            className="h-auto w-[250px] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

/** Inline card name with underline and hover-to-enlarge preview. */
function CardNameHover({
  name, imageUri, imageUriNormal, className,
}: {
  name: string;
  imageUri?: string | null;
  imageUriNormal?: string | null;
  className?: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (!imageUriNormal && !imageUri) return;
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPreviewPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setShowPreview(true);
  };

  return (
    <>
      <span
        ref={ref}
        className={cn('cursor-pointer underline decoration-dotted underline-offset-2', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowPreview(false)}
      >
        {name}
      </span>
      {showPreview && (imageUriNormal || imageUri) && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: `${previewPos.x}px`, top: `${previewPos.y}px`, transform: 'translate(-50%, -105%)' }}
        >
          <img
            src={imageUriNormal || imageUri || undefined}
            alt={name}
            className="h-auto w-[250px] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

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
  cardImages: Record<number, CardImageData>;
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

  const isLand = entry.verb === 'played';
  const isCast = entry.verb === 'cast';
  const isDraw = entry.verb === 'drew';
  const isDestroyed = entry.verb === 'destroyed' || entry.verb === 'sacrificed';
  const isCountered = entry.verb === 'countered';
  const isDiscard = entry.verb === 'discarded' || entry.verb === 'milled';
  const isReturned = entry.verb === 'returned';
  const isExiled = entry.verb === 'exiled';

  // ── Cast / Played — prominent card art display ──
  if ((isCast || isLand) && entry.cardName) {
    const hasArt = cardImg?.imageUriSmall;
    return (
      <div className={cn(
        'narrative-entry-card flex items-center gap-2 my-0.5 py-1 px-1.5 rounded',
        isCast && 'narrative-cast-bg',
        isLand && 'narrative-land-bg',
      )}>
        {hasArt && (
          <NarrativeCardArt
            name={entry.cardName}
            imageUri={cardImg!.imageUriSmall}
            imageUriNormal={cardImg!.imageUriNormal}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[11px] opacity-60">{icon}</span>
            <span className={cn(
              'text-[10px] uppercase tracking-wider font-heading',
              isCast ? 'text-primary/60' : 'text-amber-600/50',
            )}>
              {isCast ? 'Cast' : 'Played'}
            </span>
          </div>
          <CardNameHover
            name={entry.cardName}
            imageUri={cardImg?.imageUriSmall}
            imageUriNormal={cardImg?.imageUriNormal}
            className={cn(
              'text-[13px] font-semibold leading-tight',
              isCast ? 'text-primary' : 'text-amber-500/80',
            )}
          />
        </div>
      </div>
    );
  }

  // ── Damage — source card art + damage number + target ──
  if (entry.type === 'damage') {
    return (
      <div className="narrative-entry-card narrative-damage-bg flex items-center gap-2 my-0.5 py-1 px-1.5 rounded">
        {cardImg?.imageUriSmall && entry.cardName && (
          <NarrativeCardArt
            name={entry.cardName}
            imageUri={cardImg.imageUriSmall}
            imageUriNormal={cardImg.imageUriNormal}
            size="sm"
          />
        )}
        <div className="flex-1 min-w-0 text-red-400/90">
          <span className="text-[10px] opacity-60">{'\u2694'} </span>
          {entry.cardName && (
            <CardNameHover
              name={entry.cardName}
              imageUri={cardImg?.imageUriSmall}
              imageUriNormal={cardImg?.imageUriNormal}
              className="text-red-300 font-semibold text-xs"
            />
          )}
          <span className="text-xs"> dealt </span>
          <span className="narrative-damage-number">{entry.amount}</span>
          <span className="text-xs"> to </span>
          {targetImg?.imageUriSmall && entry.targetCardName ? (
            <span className="inline-flex items-center gap-1">
              <NarrativeCardArt
                name={entry.targetCardName}
                imageUri={targetImg.imageUriSmall}
                imageUriNormal={targetImg.imageUriNormal}
                size="sm"
                className="align-middle"
              />
              <CardNameHover
                name={entry.targetCardName}
                imageUri={targetImg.imageUriSmall}
                imageUriNormal={targetImg.imageUriNormal}
                className="text-red-300 text-xs"
              />
            </span>
          ) : (
            <span className="text-xs font-medium text-red-300">{entry.targetCardName || ''}</span>
          )}
        </div>
      </div>
    );
  }

  // ── Destroyed / Sacrificed / Exiled / Countered — card art with verb overlay ──
  if ((isDestroyed || isExiled || isCountered) && entry.cardName) {
    const hasArt = cardImg?.imageUriSmall;
    const verbLabel = entry.verb === 'destroyed' ? 'Destroyed' :
                      entry.verb === 'sacrificed' ? 'Sacrificed' :
                      entry.verb === 'exiled' ? 'Exiled' :
                      entry.verb === 'countered' ? 'Countered' : '';
    const verbColor = isCountered ? 'text-blue-400/70' :
                      isExiled ? 'text-purple-400/60' :
                      'text-red-400/60';
    return (
      <div className={cn(
        'narrative-entry-card flex items-center gap-2 my-0.5 py-1 px-1.5 rounded',
        isCountered && 'narrative-counter-bg',
        isExiled && 'narrative-exile-bg',
        isDestroyed && 'narrative-destroy-bg',
      )}>
        {hasArt && (
          <span className="relative">
            <NarrativeCardArt
              name={entry.cardName}
              imageUri={cardImg!.imageUriSmall}
              imageUriNormal={cardImg!.imageUriNormal}
              size="sm"
              className={cn(isCountered && 'opacity-50', isDestroyed && 'opacity-60')}
            />
            {/* Verb badge overlay on the card art */}
            <span className={cn(
              'absolute -bottom-0.5 -right-1 text-[8px] font-bold uppercase tracking-wider',
              'bg-background/80 rounded px-0.5',
              verbColor,
            )}>
              {icon}
            </span>
          </span>
        )}
        <div className={cn('flex-1 min-w-0', verbColor)}>
          <span className={cn('text-[10px] uppercase tracking-wider font-heading', verbColor)}>{verbLabel}</span>
          <br />
          <CardNameHover
            name={entry.cardName}
            imageUri={cardImg?.imageUriSmall}
            imageUriNormal={cardImg?.imageUriNormal}
            className={cn('text-xs', isCountered && 'line-through decoration-blue-400/30')}
          />
        </div>
      </div>
    );
  }

  // ── Life changes — with source card art when available ──
  if (entry.type === 'life') {
    const isLoss = entry.lifeBefore !== undefined && entry.lifeAfter !== undefined && entry.lifeAfter < entry.lifeBefore;
    const hasSource = isLoss && entry.cardName && entry.cardGrpId;
    const sourceImg = hasSource ? cardImages[entry.cardGrpId!] : undefined;

    if (hasSource) {
      return (
        <div className="narrative-entry-card narrative-damage-bg flex items-center gap-2 my-0.5 py-1 px-1.5 rounded">
          {sourceImg?.imageUriSmall && (
            <NarrativeCardArt
              name={entry.cardName!}
              imageUri={sourceImg.imageUriSmall}
              imageUriNormal={sourceImg.imageUriNormal}
              size="sm"
            />
          )}
          <div className="flex-1 min-w-0 text-red-400/80">
            <CardNameHover
              name={entry.cardName!}
              imageUri={sourceImg?.imageUriSmall}
              imageUriNormal={sourceImg?.imageUriNormal}
              className="text-red-300 font-semibold text-xs"
            />
            <span className="text-xs"> dealt </span>
            <span className="narrative-damage-number">{entry.amount}</span>
            <span className="text-xs text-muted-foreground/60 ml-1">
              ({entry.lifeBefore} → {entry.lifeAfter})
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className={cn(
        'narrative-entry flex items-center gap-1.5 py-0.5',
        isLoss ? 'text-red-400/80' : 'text-emerald-400/80',
      )}>
        <span className="text-[11px] shrink-0">{isLoss ? '\u2665' : '\u2665'}</span>
        <span className="text-xs">{entry.text}</span>
      </div>
    );
  }

  // ── Draw — card art for self, text-only for opponent ──
  if (isDraw) {
    if (entry.isSelf && entry.cardName && cardImg?.imageUriSmall) {
      return (
        <div className="narrative-entry flex items-center gap-1.5 py-0.5 text-sky-300/80">
          <NarrativeCardArt
            name={entry.cardName}
            imageUri={cardImg.imageUriSmall}
            imageUriNormal={cardImg.imageUriNormal}
            size="sm"
          />
          <span className="text-xs">
            Drew{' '}
            <CardNameHover
              name={entry.cardName}
              imageUri={cardImg.imageUriSmall}
              imageUriNormal={cardImg.imageUriNormal}
              className="text-sky-300 font-medium"
            />
          </span>
        </div>
      );
    }
    return (
      <div className="narrative-entry flex items-center gap-1.5 py-0.5 text-muted-foreground/50 italic">
        <span className="text-[10px] shrink-0 opacity-50">{icon}</span>
        <span className="text-xs">{entry.text}</span>
      </div>
    );
  }

  // ── Returned to hand — with card art ──
  if (isReturned && entry.cardName && cardImg?.imageUriSmall) {
    return (
      <div className="narrative-entry flex items-center gap-1.5 py-0.5 text-cyan-400/60">
        <NarrativeCardArt
          name={entry.cardName}
          imageUri={cardImg.imageUriSmall}
          imageUriNormal={cardImg.imageUriNormal}
          size="sm"
        />
        <span className="text-xs">
          <span className="text-[10px] opacity-60">{'\u21A9'}</span>{' '}
          <CardNameHover
            name={entry.cardName}
            imageUri={cardImg.imageUriSmall}
            imageUriNormal={cardImg.imageUriNormal}
            className="text-cyan-400/80"
          />{' '}
          returned to hand
        </span>
      </div>
    );
  }

  // ── Discard / Mill — text-based with card name hover ──
  if (isDiscard && entry.cardName) {
    return (
      <div className="narrative-entry flex items-center gap-1.5 py-0.5 text-muted-foreground/50">
        <span className="text-[10px] shrink-0 opacity-50">{icon}</span>
        <span className="text-xs">
          {entry.verb === 'discarded' ? 'Discarded' : 'Milled'}{' '}
          <CardNameHover
            name={entry.cardName}
            imageUri={cardImg?.imageUriSmall}
            imageUriNormal={cardImg?.imageUriNormal}
            className="text-muted-foreground/70"
          />
        </span>
      </div>
    );
  }

  // ── Default fallback — plain text ──
  return (
    <div className={cn(
      'narrative-entry flex items-start gap-1.5 py-0.5',
      !entry.verb && 'text-foreground/70',
    )}>
      <span className="mt-0.5 text-[10px] shrink-0 opacity-50">{icon}</span>
      <span className="text-xs">
        {cardImg && entry.cardName ? (
          <CardNameHover
            name={entry.cardName}
            imageUri={cardImg.imageUriSmall}
            imageUriNormal={cardImg.imageUriNormal}
            className="text-foreground/80"
          />
        ) : (
          entry.text
        )}
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
  cardImages: Record<number, CardImageData>;
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
