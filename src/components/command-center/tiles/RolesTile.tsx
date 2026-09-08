'use client';

import { cn } from '@/lib/utils';
import { TileFrame } from './TileFrame';
import { useTickOnChange } from './useTickOnChange';
import type { AnalysisResponse } from './types';

function RoleBar({
  health,
  onClick,
}: {
  health: AnalysisResponse['ratioHealth'][number];
  onClick: () => void;
}) {
  const barColor = health.status === 'ok' ? 'bg-green-500' : health.status === 'low' ? 'bg-red-500' : 'bg-yellow-500';
  const widthPct = Math.min(100, (health.current / Math.max(1, health.target.max)) * 100);

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <div className="flex items-center justify-between text-[13px]">
        <span>{health.label}</span>
        <span className={cn('font-medium', health.color)}>
          {health.current} / {health.target.min}-{health.target.max}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 w-full rounded-full bg-muted/40">
        <div className={cn('h-1.5 rounded-full', barColor)} style={{ width: `${widthPct}%` }} />
      </div>
    </button>
  );
}

export function RolesTile({
  analysis,
  onAskConsultant,
}: {
  analysis?: AnalysisResponse | null;
  onAskConsultant: (prompt: string) => void;
}) {
  const total = analysis?.ratioHealth.length ?? 0;
  const inRange = analysis?.ratioHealth.filter((h) => h.status === 'ok').length ?? 0;
  const allOk = total > 0 && inRange === total;
  const ticking = useTickOnChange(inRange);

  return (
    <TileFrame
      title="Roles"
      headline={
        <span className={cn('hud-number text-sm', allOk && 'text-green-400', ticking && 'hud-tick')}>
          {total > 0 ? `${inRange} of ${total} roles in range` : '—'}
        </span>
      }
    >
      {!analysis || analysis.ratioHealth.length === 0 ? (
        <p className="text-sm text-muted-foreground">No analysis yet.</p>
      ) : (
        <div className="space-y-1.5">
          {analysis.ratioHealth.map((h) => (
            <RoleBar
              key={h.category}
              health={h}
              onClick={() => onAskConsultant(`Find ${h.label.toLowerCase()} cards for this deck`)}
            />
          ))}
        </div>
      )}
    </TileFrame>
  );
}
