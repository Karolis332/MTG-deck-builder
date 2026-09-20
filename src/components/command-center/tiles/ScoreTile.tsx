'use client';

import { cn } from '@/lib/utils';
import { TileFrame } from './TileFrame';
import { ScoreRing } from './ScoreRing';
import { useTickOnChange } from './useTickOnChange';
import type { AnalysisResponse } from './types';

/** Deck Score v1.2 is calibrated for these commander-family formats only
 * (docs/DECK_SCORE_SPEC.md §4: Standard held-out median 41.5 — not shown). */
const DECK_SCORE_FORMATS = new Set(['commander', 'brawl', 'competitivebrawl', 'standardbrawl']);

export function ScoreTile({ analysis }: { analysis?: AnalysisResponse | null }) {
  const deckScore = analysis?.deckScore;
  const useDeckScore = Boolean(deckScore && DECK_SCORE_FORMATS.has(analysis?.format ?? ''));
  const headlineScore = useDeckScore ? deckScore!.score : analysis?.overallScore;
  const ticking = useTickOnChange(headlineScore);

  if (!analysis) {
    return (
      <TileFrame title="Score" headline={<span className="hud-number text-sm text-muted-foreground">—</span>}>
        <p className="text-sm text-muted-foreground">No analysis yet.</p>
      </TileFrame>
    );
  }

  return (
    <TileFrame
      title="Score"
      headline={
        <span className="flex items-center gap-1.5">
          <span className={cn('hud-number text-sm', ticking && 'hud-tick')}>{headlineScore}</span>
          {useDeckScore && (
            <span className="text-[10px] font-normal text-muted-foreground" title="Deck Score v1.2, calibration in progress">
              v1.2 beta{deckScore!.provisional ? ' · provisional' : ''}
            </span>
          )}
        </span>
      }
    >
      <div className="flex items-center justify-around gap-2">
        <ScoreRing score={headlineScore ?? 0} />
        <div className="grid grid-cols-1 gap-1 text-sm">
          {useDeckScore ? (
            deckScore!.components
              // weight 0 (meta with no context, structure) carries the component's
              // score, but contributes nothing to the headline — skip it here so
              // the tile shows six rows, not eight, and stays inside its cell.
              .filter((c) => c.weight > 0)
              .map((c) => (
                <div key={c.key} title={c.reason}>
                  {c.key}: <span className="hud-number font-semibold">{c.score}</span>
                </div>
              ))
          ) : (
            <>
              <div title="Mana curve fit relative to archetype expectations">
                Curve: <span className="hud-number font-semibold">{analysis.curveScore?.score ?? '—'}</span>
              </div>
              <div title="Interaction Synergy Score — commander-anchored resource-graph synergy density">
                Synergy (ISS): <span className="hud-number font-semibold">{analysis.iss ?? '—'}</span>
              </div>
            </>
          )}
        </div>
      </div>
      {!useDeckScore && analysis.format === 'standard' && (
        <p className="mt-1 text-xs text-muted-foreground">Deck Score calibrating for Standard.</p>
      )}
    </TileFrame>
  );
}
