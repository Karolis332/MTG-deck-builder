'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { DeckCardEntry } from '@/lib/game-state-engine';
import type { MulliganAdvice } from '@/lib/mulligan-advisor';

interface GameDeckTrackerProps {
  deckList: DeckCardEntry[];
  librarySize: number;
  drawProbabilities: Record<number, number>;
  cardsDrawn: number[];
  mulliganAdvice: MulliganAdvice | null;
  showMulligan: boolean;
  isSideboarding: boolean;
  opponentCardsSeen: number[];
}

interface GroupedCard {
  grpId: number;
  name: string;
  remaining: number;
  total: number;
  probability: number;
  manaCost: string | null;
  typeLine: string | null;
}

function getCategory(typeLine: string | null): string {
  if (!typeLine) return 'Other';
  const t = typeLine.toLowerCase();
  if (t.includes('land')) return 'Lands';
  if (t.includes('creature')) return 'Creatures';
  if (t.includes('instant')) return 'Instants';
  if (t.includes('sorcery')) return 'Sorceries';
  if (t.includes('enchantment')) return 'Enchantments';
  if (t.includes('artifact')) return 'Artifacts';
  if (t.includes('planeswalker')) return 'Planeswalkers';
  return 'Other';
}

const CATEGORY_ORDER = ['Creatures', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Planeswalkers', 'Lands', 'Other'];

function ManaSymbol({ symbol }: { symbol: string }) {
  const colorMap: Record<string, string> = {
    W: 'bg-amber-50 text-stone-800',
    U: 'bg-blue-600 text-white',
    B: 'bg-stone-400 text-stone-900',
    R: 'bg-red-600 text-white',
    G: 'bg-green-700 text-white',
  };
  const isNum = /^\d+$/.test(symbol);

  return (
    <span className={cn(
      'inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold leading-none',
      isNum ? 'bg-stone-600/50 text-stone-300' : (colorMap[symbol] || 'bg-stone-600/50 text-stone-300')
    )}>
      {isNum ? symbol : ''}
    </span>
  );
}

function renderManaCost(manaCost: string) {
  const symbols = manaCost.match(/\{([^}]+)\}/g) ?? [];
  return (
    <span className="flex items-center gap-px ml-1">
      {symbols.map((s, i) => (
        <ManaSymbol key={i} symbol={s.replace(/[{}]/g, '')} />
      ))}
    </span>
  );
}

export function GameDeckTracker({
  deckList, librarySize, drawProbabilities, cardsDrawn,
  mulliganAdvice, showMulligan, isSideboarding,
}: GameDeckTrackerProps) {
  const grouped = useMemo(() => {
    const cards: GroupedCard[] = deckList.map(entry => ({
      grpId: entry.grpId,
      name: entry.card?.name ?? `Card #${entry.grpId}`,
      remaining: entry.remaining,
      total: entry.qty,
      probability: drawProbabilities[entry.grpId] ?? 0,
      manaCost: entry.card?.manaCost ?? null,
      typeLine: entry.card?.typeLine ?? null,
    }));

    const groups: Record<string, GroupedCard[]> = {};
    for (const card of cards) {
      const cat = getCategory(card.typeLine);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(card);
    }
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => b.probability - a.probability);
    }
    return groups;
  }, [deckList, drawProbabilities]);

  const drawnSet = useMemo(() => new Set(cardsDrawn), [cardsDrawn]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="font-heading text-sm tracking-wide text-primary">Your Deck</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-medium text-primary">
          {librarySize}
        </span>
      </div>

      {/* Mulligan panel */}
      {showMulligan && mulliganAdvice && (
        <div className={cn(
          'mx-2 mt-2 rounded-lg border p-3',
          mulliganAdvice.recommendation === 'keep'
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-red-500/30 bg-red-500/5'
        )}>
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-sm font-bold font-heading tracking-widest',
              mulliganAdvice.recommendation === 'keep' ? 'text-green-400' : 'text-red-400'
            )}>
              {mulliganAdvice.recommendation.toUpperCase()}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {Math.round(mulliganAdvice.confidence * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                mulliganAdvice.score >= 60 ? 'bg-green-500' : mulliganAdvice.score >= 45 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${mulliganAdvice.score}%` }}
            />
          </div>
          {mulliganAdvice.reasoning.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {mulliganAdvice.reasoning.slice(0, 3).map((r, i) => (
                <div key={i} className="text-[10px] text-muted-foreground leading-snug">
                  <span className="text-primary mr-1">&#8226;</span>{r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sideboard panel */}
      {isSideboarding && (
        <div className="mx-2 mt-2 space-y-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="text-center text-xs font-heading tracking-wide text-amber-400 mb-2">Sideboarding</div>
            {opponentCardsSeen.length > 0 && (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Opponent played {opponentCardsSeen.length} card{opponentCardsSeen.length !== 1 ? 's' : ''}
                </div>
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                  Review the opponent tracker to plan your sideboard swaps.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card list */}
      <div className="flex-1 overflow-y-auto">
        {CATEGORY_ORDER.map(cat => {
          const cards = grouped[cat];
          if (!cards || cards.length === 0) return null;
          const remaining = cards.reduce((s, c) => s + c.remaining, 0);
          const total = cards.reduce((s, c) => s + c.total, 0);

          return (
            <div key={cat}>
              <div className="flex items-center justify-between bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{cat}</span>
                <span>{remaining}/{total}</span>
              </div>
              {cards.map(card => {
                const isGone = card.remaining === 0;
                const pctWidth = card.probability > 0 ? Math.min(card.probability * 100, 100) : 0;

                return (
                  <div
                    key={card.grpId}
                    className={cn(
                      'relative flex items-center gap-1 border-b border-border/10 px-2 py-[3px] text-[11px]',
                      isGone && 'opacity-30 line-through'
                    )}
                  >
                    {/* Probability bar */}
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/[0.07] transition-all duration-300"
                      style={{ width: `${pctWidth}%` }}
                    />
                    <span className="relative z-10 w-7 text-right font-mono text-[10px] text-muted-foreground">
                      {card.remaining}/{card.total}
                    </span>
                    <span className="relative z-10 flex-1 truncate text-foreground">
                      {card.name}
                    </span>
                    {card.manaCost && <span className="relative z-10">{renderManaCost(card.manaCost)}</span>}
                    {card.probability > 0 && !isGone && (
                      <span className="relative z-10 w-9 text-right font-mono text-[10px] text-primary">
                        {(card.probability * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
