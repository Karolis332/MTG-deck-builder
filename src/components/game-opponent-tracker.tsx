'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getElectronAPI } from '@/lib/electron-bridge';

interface GameOpponentTrackerProps {
  opponentCardsSeen: number[];
  opponentBattlefield: number[];
  opponentGraveyard: number[];
  opponentLife: number;
  opponentName: string | null;
}

interface ResolvedCardInfo {
  name: string;
  manaCost: string | null;
  typeLine: string | null;
}

export function GameOpponentTracker({
  opponentCardsSeen, opponentBattlefield, opponentGraveyard,
  opponentLife, opponentName,
}: GameOpponentTrackerProps) {
  const [resolvedCards, setResolvedCards] = useState<Record<number, ResolvedCardInfo>>({});

  const allVisibleGrpIds = useMemo(() => {
    const seen = new Set<number>();
    const result: number[] = [];
    for (const grpId of [...opponentCardsSeen, ...opponentBattlefield, ...opponentGraveyard]) {
      if (!seen.has(grpId)) {
        seen.add(grpId);
        result.push(grpId);
      }
    }
    return result;
  }, [opponentCardsSeen, opponentBattlefield, opponentGraveyard]);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api || allVisibleGrpIds.length === 0) return;

    api.resolveGrpIds(allVisibleGrpIds).then((resolved) => {
      const mapped: Record<number, ResolvedCardInfo> = {};
      for (const [grpIdStr, card] of Object.entries(resolved)) {
        const c = card as { name?: string; manaCost?: string; typeLine?: string };
        mapped[Number(grpIdStr)] = {
          name: c.name ?? `Card #${grpIdStr}`,
          manaCost: c.manaCost ?? null,
          typeLine: c.typeLine ?? null,
        };
      }
      setResolvedCards(mapped);
    });
  }, [allVisibleGrpIds]);

  const battlefieldSet = new Set(opponentBattlefield);
  const graveyardSet = new Set(opponentGraveyard);

  // Infer opponent colors
  const colors = new Set<string>();
  for (const card of Object.values(resolvedCards)) {
    if (card.manaCost) {
      for (const c of ['W', 'U', 'B', 'R', 'G']) {
        if (card.manaCost.includes(c)) colors.add(c);
      }
    }
  }

  const COLOR_EMOJI: Record<string, string> = { W: '⚪', U: '🔵', B: '⚫', R: '🔴', G: '🟢' };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="font-heading text-sm tracking-wide text-primary">
          {opponentName || 'Opponent'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {colors.size > 0 ? Array.from(colors).map(c => COLOR_EMOJI[c] || c).join('') : '?'}
          </span>
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-red-400">
            {opponentLife}
          </span>
        </div>
      </div>

      {/* Cards seen */}
      <div className="flex-1 overflow-y-auto">
        {allVisibleGrpIds.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No cards seen yet
          </div>
        ) : (
          <>
            <div className="bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cards Seen ({allVisibleGrpIds.length})
            </div>
            {allVisibleGrpIds.map((grpId) => {
              const card = resolvedCards[grpId];
              const name = card?.name ?? `Card #${grpId}`;
              const inPlay = battlefieldSet.has(grpId);
              const inGY = graveyardSet.has(grpId);

              return (
                <div
                  key={grpId}
                  className="flex items-center gap-1.5 border-b border-border/10 px-2 py-[3px] text-[11px]"
                >
                  <span className={cn(
                    'w-5 text-center text-[9px] font-semibold',
                    inPlay ? 'text-green-400' : inGY ? 'text-red-400' : 'text-muted-foreground/50'
                  )}>
                    {inPlay ? 'BF' : inGY ? 'GY' : '--'}
                  </span>
                  <span className="flex-1 truncate text-foreground">{name}</span>
                  {card?.typeLine && (
                    <span className="max-w-[80px] truncate text-[9px] text-muted-foreground">
                      {card.typeLine.split('—')[0].trim()}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
