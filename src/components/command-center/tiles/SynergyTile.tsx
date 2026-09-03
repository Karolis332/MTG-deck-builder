'use client';

import { TileFrame } from './TileFrame';
import type { AnalysisResponse } from './types';

export function SynergyTile({
  analysis,
  onAskConsultant,
}: {
  analysis?: AnalysisResponse | null;
  onAskConsultant: (prompt: string) => void;
}) {
  const pairs = analysis?.topSynergyPairs?.slice(0, 5) ?? [];
  const winPlan = analysis?.winPlan;

  return (
    <TileFrame title="Synergy" headline={<span className="hud-number text-sm">{pairs.length}</span>}>
      {!analysis ? (
        <p className="text-xs text-muted-foreground">No analysis yet.</p>
      ) : (
        <div className="space-y-3 text-xs">
          {pairs.length > 0 && (
            <div className="space-y-1">
              {pairs.map((p) => (
                <div key={`${p.a}|${p.b}`}>
                  <div className="font-medium">
                    {p.a} + {p.b} <span className="text-muted-foreground">({p.weight})</span>
                  </div>
                  {p.reasons.length > 0 && (
                    <div className="text-[10px] text-muted-foreground">{p.reasons.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {winPlan && (
            <div>
              <div className="font-medium">{winPlan.route}</div>
              {winPlan.secondaryRoute && (
                <div className="text-[10px] text-muted-foreground">also: {winPlan.secondaryRoute}</div>
              )}
              <p className="text-[11px] text-muted-foreground">{winPlan.description}</p>
              {(['enablers', 'payoffs', 'protection', 'tutors'] as const).map(
                (group) =>
                  winPlan.keyCards[group].length > 0 && (
                    <div key={group} className="mt-0.5">
                      <span className="capitalize text-muted-foreground">{group}:</span>{' '}
                      {winPlan.keyCards[group].join(', ')}
                    </div>
                  )
              )}
              {winPlan.missingPieces.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {winPlan.missingPieces.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="rounded bg-muted/50 px-1.5 py-0.5 hover:text-primary hover:underline"
                      onClick={() => onAskConsultant(`Add ${name}`)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {analysis.mulliganCriteria && analysis.mulliganCriteria.length > 0 && (
            <ul className="list-disc pl-4 text-[11px] text-muted-foreground">
              {analysis.mulliganCriteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </TileFrame>
  );
}
