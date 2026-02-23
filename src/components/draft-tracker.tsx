'use client';

import { useState, useEffect, useMemo } from 'react';
import { getElectronAPI } from '@/lib/electron-bridge';
import { MANA_COLORS } from '@/lib/constants';

export interface DraftCard {
  grpId: number;
  name?: string;
  manaCost?: string;
  cmc?: number;
  typeLine?: string;
  imageUriSmall?: string | null;
}

export interface DraftState {
  packCards: DraftCard[];
  pickedCards: DraftCard[];
  packNumber: number;
  pickNumber: number;
  isActive: boolean;
}

export function DraftTracker() {
  const [draftState, setDraftState] = useState<DraftState>({
    packCards: [],
    pickedCards: [],
    packNumber: 1,
    pickNumber: 1,
    isActive: false,
  });

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;

    const cleanups: Array<() => void> = [];

    cleanups.push(
      api.onGepDraftPack((data: any) => {
        setDraftState(prev => ({
          ...prev,
          isActive: true,
          packCards: Array.isArray(data?.cards)
            ? data.cards.map((c: any) => ({
                grpId: c.grpId ?? c.id ?? 0,
                name: c.name ?? `Card #${c.grpId ?? c.id}`,
                manaCost: c.mana_cost,
                cmc: c.cmc,
                typeLine: c.type_line,
                imageUriSmall: c.image_uri_small,
              }))
            : [],
          packNumber: data?.pack_number ?? prev.packNumber,
          pickNumber: data?.pick_number ?? prev.pickNumber,
        }));
      })
    );

    cleanups.push(
      api.onGepDraftPick((data: any) => {
        if (data?.key === 'draft_picked' && data?.value) {
          const card: DraftCard = {
            grpId: data.value.grpId ?? data.value.id ?? 0,
            name: data.value.name ?? `Card #${data.value.grpId}`,
            manaCost: data.value.mana_cost,
            cmc: data.value.cmc,
            typeLine: data.value.type_line,
            imageUriSmall: data.value.image_uri_small,
          };
          setDraftState(prev => ({
            ...prev,
            pickedCards: [...prev.pickedCards, card],
          }));
        }
      })
    );

    return () => cleanups.forEach(fn => fn());
  }, []);

  const colorCommitment = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of draftState.pickedCards) {
      if (!card.manaCost) continue;
      for (const color of MANA_COLORS) {
        const matches = (card.manaCost.match(new RegExp(`\\{${color}\\}`, 'g')) || []).length;
        if (matches > 0) {
          counts[color] = (counts[color] ?? 0) + matches;
        }
      }
    }
    return counts;
  }, [draftState.pickedCards]);

  const curveData = useMemo(() => {
    const curve: Record<number, number> = {};
    for (const card of draftState.pickedCards) {
      const cmc = Math.min(card.cmc ?? 0, 7);
      curve[cmc] = (curve[cmc] ?? 0) + 1;
    }
    return curve;
  }, [draftState.pickedCards]);

  if (!draftState.isActive && draftState.pickedCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-4xl filter drop-shadow-[0_0_8px_rgba(180,140,60,0.4)]">&#128214;</div>
        <h2 className="font-heading text-xl tracking-wide text-primary">Draft Tracker</h2>
        <p className="text-sm text-muted-foreground">
          Start a draft in Arena — cards will appear here automatically
        </p>
        <p className="text-xs text-muted-foreground/60">
          Requires Overwolf with GEP enabled
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg text-primary">Draft Tracker</h2>
          <p className="text-xs text-muted-foreground">
            Pack {draftState.packNumber} &middot; Pick {draftState.pickNumber} &middot;
            {draftState.pickedCards.length} picked
          </p>
        </div>

        {/* Color commitment pills */}
        <div className="flex gap-1.5">
          {Object.entries(colorCommitment)
            .sort(([, a], [, b]) => b - a)
            .map(([symbol, count]) => (
              <span key={symbol} className="text-xs px-1.5 py-0.5 rounded bg-card border border-border font-mono">
                {symbol}: {count}
              </span>
            ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Current Pack */}
        <div className="flex-1 border-r border-border overflow-y-auto p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Current Pack ({draftState.packCards.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {draftState.packCards.map((card, i) => (
              <div key={`${card.grpId}-${i}`} className="rounded border border-border p-2 bg-card hover:border-primary/40 transition-colors">
                {card.imageUriSmall ? (
                  <img
                    src={card.imageUriSmall}
                    alt={card.name ?? ''}
                    className="w-full rounded mb-1"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[5/7] bg-muted rounded mb-1 flex items-center justify-center text-xs text-muted-foreground">
                    {card.name ?? `#${card.grpId}`}
                  </div>
                )}
                <p className="text-[10px] truncate text-center">{card.name ?? `#${card.grpId}`}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Picked Cards + Curve */}
        <div className="w-72 overflow-y-auto p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Picked ({draftState.pickedCards.length})
          </h3>

          {/* Mini mana curve */}
          <div className="flex items-end gap-0.5 h-10 mb-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(cmc => {
              const count = curveData[cmc] ?? 0;
              const maxCount = Math.max(...Object.values(curveData), 1);
              return (
                <div key={cmc} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary/40 rounded-t"
                    style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
                  />
                  <span className="text-[8px] text-muted-foreground mt-0.5">
                    {cmc === 7 ? '7+' : cmc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Picked card list */}
          <div className="space-y-0.5">
            {draftState.pickedCards.map((card, i) => (
              <div key={`${card.grpId}-${i}`} className="flex items-center gap-2 px-2 py-1 rounded bg-card/50 text-xs">
                <span className="text-muted-foreground font-mono text-[10px] w-4">{card.cmc ?? '?'}</span>
                <span className="truncate flex-1">{card.name ?? `#${card.grpId}`}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
