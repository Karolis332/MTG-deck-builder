'use client';

import { BracketTile } from './tiles/BracketTile';
import { ScoreTile } from './tiles/ScoreTile';
import { RolesTile } from './tiles/RolesTile';
import { BenchmarkTile } from './tiles/BenchmarkTile';
import { CoverageTile } from './tiles/CoverageTile';
import { SynergyTile } from './tiles/SynergyTile';
import { CurveTile } from './tiles/CurveTile';
import type { LiveRailProps } from './tiles/types';

export function LiveRail({ deck, analysis, onOpenCard, onAskConsultant, onSetTargetBracket, isCommanderFormat }: LiveRailProps) {
  // Brackets and commander synergy are Commander-only concepts; a Standard deck
  // must not see a bracket target or a "Commander Synergy" role row (operator 2026-09-08).
  const railAnalysis = isCommanderFormat || !analysis
    ? analysis
    : { ...analysis, ratioHealth: analysis.ratioHealth.filter((h) => h.category !== 'synergy') };

  return (
    <div className="card-grid hud-grid-bg flex flex-col gap-3 overflow-y-auto p-2">
      {isCommanderFormat && (
        <BracketTile
          deck={deck}
          onOpenCard={onOpenCard}
          onAskConsultant={onAskConsultant}
          onSetTargetBracket={onSetTargetBracket}
        />
      )}
      <ScoreTile analysis={railAnalysis} />
      <RolesTile analysis={railAnalysis} onAskConsultant={onAskConsultant} />
      <BenchmarkTile deck={deck} onOpenCard={onOpenCard} onAskConsultant={onAskConsultant} />
      <CoverageTile deck={deck} onOpenCard={onOpenCard} />
      {isCommanderFormat && <SynergyTile analysis={railAnalysis} onAskConsultant={onAskConsultant} />}
      <CurveTile deck={deck} analysis={railAnalysis} />
    </div>
  );
}
