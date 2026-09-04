'use client';

import { BracketTile } from './tiles/BracketTile';
import { ScoreTile } from './tiles/ScoreTile';
import { RolesTile } from './tiles/RolesTile';
import { BenchmarkTile } from './tiles/BenchmarkTile';
import { CoverageTile } from './tiles/CoverageTile';
import { SynergyTile } from './tiles/SynergyTile';
import { CurveTile } from './tiles/CurveTile';
import type { LiveRailProps } from './tiles/types';

export function LiveRail({ deck, analysis, onOpenCard, onAskConsultant, onSetTargetBracket }: LiveRailProps) {
  return (
    <div className="card-grid hud-grid-bg flex flex-col gap-3 overflow-y-auto p-2">
      <BracketTile
        deck={deck}
        onOpenCard={onOpenCard}
        onAskConsultant={onAskConsultant}
        onSetTargetBracket={onSetTargetBracket}
      />
      <ScoreTile analysis={analysis} />
      <RolesTile analysis={analysis} onAskConsultant={onAskConsultant} />
      <BenchmarkTile deck={deck} onOpenCard={onOpenCard} onAskConsultant={onAskConsultant} />
      <CoverageTile deck={deck} onOpenCard={onOpenCard} />
      <SynergyTile analysis={analysis} onAskConsultant={onAskConsultant} />
      <CurveTile deck={deck} analysis={analysis} />
    </div>
  );
}
