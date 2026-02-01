'use client';

import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';

interface ManaCurveProps {
  cards: Array<{ quantity: number; card: DbCard; board: string }>;
  className?: string;
}

export function ManaCurve({ cards, className }: ManaCurveProps) {
  const mainCards = cards.filter((c) => c.board === 'main' || c.board === 'commander');
  const curve: Record<number, number> = {};
  let maxCount = 0;

  for (const entry of mainCards) {
    if (entry.card.type_line.includes('Land')) continue;
    const bucket = Math.min(Math.floor(entry.card.cmc), 7);
    curve[bucket] = (curve[bucket] || 0) + entry.quantity;
    maxCount = Math.max(maxCount, curve[bucket]);
  }

  const buckets = [0, 1, 2, 3, 4, 5, 6, 7];

  if (maxCount === 0) {
    return (
      <div className={cn('text-center text-xs text-muted-foreground py-4', className)}>
        Add non-land cards to see the mana curve
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="text-xs font-medium text-muted-foreground">Mana Curve</div>
      <div className="flex items-end gap-1" style={{ height: 80 }}>
        {buckets.map((cmc) => {
          const count = curve[cmc] || 0;
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={cmc} className="flex flex-1 flex-col items-center gap-0.5">
              {count > 0 && (
                <span className="text-[9px] font-medium text-muted-foreground">
                  {count}
                </span>
              )}
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t bg-primary/70 transition-all duration-300 hover:bg-primary"
                  style={{ height: `${Math.max(height, count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {cmc === 7 ? '7+' : cmc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
