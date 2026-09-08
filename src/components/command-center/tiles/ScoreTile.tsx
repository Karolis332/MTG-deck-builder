'use client';

import { cn } from '@/lib/utils';
import { TileFrame } from './TileFrame';
import { ScoreRing } from './ScoreRing';
import { useTickOnChange } from './useTickOnChange';
import type { AnalysisResponse } from './types';

export function ScoreTile({ analysis }: { analysis?: AnalysisResponse | null }) {
  const ticking = useTickOnChange(analysis?.overallScore);
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
      headline={<span className={cn('hud-number text-sm', ticking && 'hud-tick')}>{analysis.overallScore}</span>}
    >
      <div className="flex items-center justify-around gap-2">
        <ScoreRing score={analysis.overallScore} />
        <div className="grid grid-cols-1 gap-1 text-sm">
          <div title="Mana curve fit relative to archetype expectations">
            Curve: <span className="hud-number font-semibold">{analysis.curveScore?.score ?? '—'}</span>
          </div>
          <div title="Interaction Synergy Score — commander-anchored resource-graph synergy density">
            Synergy (ISS): <span className="hud-number font-semibold">{analysis.iss ?? '—'}</span>
          </div>
        </div>
      </div>
    </TileFrame>
  );
}
