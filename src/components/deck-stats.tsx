'use client';

import { cn } from '@/lib/utils';
import { ColorIdentityPips } from './mana-cost';
import { ManaCurve } from './mana-curve';
import type { DbCard } from '@/lib/types';
import { FORMAT_LABELS } from '@/lib/constants';

interface DeckStatsProps {
  cards: Array<{ quantity: number; card: DbCard; board: string }>;
  format?: string | null;
  className?: string;
}

export function DeckStats({ cards, format, className }: DeckStatsProps) {
  const mainCards = cards.filter(
    (c) => c.board === 'main' || c.board === 'commander'
  );
  const sideCards = cards.filter((c) => c.board === 'sideboard');
  const mainTotal = mainCards.reduce((s, c) => s + c.quantity, 0);
  const sideTotal = sideCards.reduce((s, c) => s + c.quantity, 0);

  // Color distribution
  const colorCounts: Record<string, number> = {};
  let nonLandCount = 0;
  let totalCmc = 0;
  const typeCounts: Record<string, number> = {};
  let estimatedPrice = 0;

  for (const entry of mainCards) {
    const card = entry.card;
    const isLand = card.type_line.includes('Land');

    if (!isLand) {
      nonLandCount += entry.quantity;
      totalCmc += card.cmc * entry.quantity;
    }

    const colors: string[] = card.colors ? JSON.parse(card.colors) : [];
    for (const color of colors) {
      colorCounts[color] = (colorCounts[color] || 0) + entry.quantity;
    }
    if (colors.length === 0) {
      colorCounts['C'] = (colorCounts['C'] || 0) + entry.quantity;
    }

    const mainType = card.type_line.includes('Creature')
      ? 'Creatures'
      : card.type_line.includes('Land')
        ? 'Lands'
        : 'Spells';
    typeCounts[mainType] = (typeCounts[mainType] || 0) + entry.quantity;

    if (card.price_usd) {
      estimatedPrice += parseFloat(card.price_usd) * entry.quantity;
    }
  }

  const avgCmc = nonLandCount > 0 ? (totalCmc / nonLandCount).toFixed(2) : '0';
  const allColors = Object.keys(colorCounts).filter((c) => c !== 'C');

  return (
    <div className={cn('space-y-3', className)}>
      {/* Card count and format */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {mainTotal} cards
          {sideTotal > 0 && (
            <span className="text-muted-foreground"> / {sideTotal} sideboard</span>
          )}
        </div>
        {format && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
            {FORMAT_LABELS[format] || format}
          </span>
        )}
      </div>

      {/* Color identity */}
      {allColors.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Colors</span>
          <ColorIdentityPips colors={allColors} size="sm" />
        </div>
      )}

      {/* Type distribution */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Type Distribution</div>
        <div className="flex gap-3">
          {['Creatures', 'Spells', 'Lands'].map((type) => (
            <div key={type} className="text-xs">
              <span className="text-muted-foreground">{type}: </span>
              <span className="font-medium">{typeCounts[type] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Avg CMC */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Avg CMC</span>
        <span className="font-medium">{avgCmc}</span>
      </div>

      {/* Mana curve */}
      <ManaCurve cards={cards} />

      {/* Price estimate */}
      {estimatedPrice > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Est. Price</span>
          <span className="font-medium">${estimatedPrice.toFixed(2)}</span>
        </div>
      )}

      {/* Color bar */}
      {mainTotal > 0 && allColors.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Color Breakdown</div>
          <div className="flex h-2 overflow-hidden rounded-full">
            {['W', 'U', 'B', 'R', 'G', 'C'].map((color) => {
              const count = colorCounts[color] || 0;
              if (count === 0) return null;
              const pct = (count / mainTotal) * 100;
              const colorMap: Record<string, string> = {
                W: 'bg-amber-100',
                U: 'bg-blue-500',
                B: 'bg-zinc-700',
                R: 'bg-red-500',
                G: 'bg-green-600',
                C: 'bg-zinc-400',
              };
              return (
                <div
                  key={color}
                  className={cn('transition-all', colorMap[color])}
                  style={{ width: `${pct}%` }}
                  title={`${color}: ${count} cards`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
