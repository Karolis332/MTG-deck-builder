'use client';

import { ManaCurve } from '@/components/mana-curve';
import { TileFrame } from './TileFrame';
import type { LiveRailDeck, AnalysisResponse } from './types';

// ponytail: no archetype overlay yet — /api/deck-analysis doesn't return an
// archetype string on the response (only iss/curveScore/winPlan derive from
// one internally). Add the overlay once the route exposes `archetype`.
export function CurveTile({ deck, analysis }: { deck: LiveRailDeck; analysis?: AnalysisResponse | null }) {
  const curveNote = analysis?.curveScore?.notes ?? [];

  return (
    <TileFrame
      title="Curve"
      headline={<span className="hud-number text-sm">{analysis?.curveScore?.score ?? '—'}</span>}
    >
      <ManaCurve cards={deck.cards.map((c) => ({ quantity: c.quantity, board: c.board, card: c }))} />
      {curveNote.length > 0 && (
        <ul className="mt-2 list-disc pl-4 text-[11px] text-muted-foreground">
          {curveNote.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">Archetype target overlay: n/a (not in analysis response).</p>
    </TileFrame>
  );
}
