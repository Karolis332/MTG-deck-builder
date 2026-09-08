'use client';

import { cn } from '@/lib/utils';

function getBracketLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'cEDH', color: 'text-red-400' };
  if (score >= 75) return { label: 'High Power', color: 'text-orange-400' };
  if (score >= 55) return { label: 'Tuned', color: 'text-yellow-400' };
  if (score >= 35) return { label: 'Focused', color: 'text-blue-400' };
  return { label: 'Casual', color: 'text-green-400' };
}

/** Copied from src/components/deck-analysis-panel.tsx (not exported there). */
export function ScoreRing({ score }: { score: number }) {
  const bracket = getBracketLabel(score);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor =
    score >= 75 ? '#f97316' : score >= 55 ? '#eab308' : score >= 35 ? '#3b82f6' : '#22c55e';

  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg width={88} height={88} className="-rotate-90">
        <circle cx={44} cy={44} r={radius} fill="none" stroke="currentColor" strokeWidth={5} className="text-border" />
        <circle
          cx={44} cy={44} r={radius} fill="none"
          stroke={strokeColor} strokeWidth={5}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="hud-number text-xl font-bold">{score}</span>
        <span className={cn('text-xs font-semibold', bracket.color)}>{bracket.label}</span>
      </div>
    </div>
  );
}
