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

  // Detailed type counts for the breakdown bar
  const detailedTypeCounts: Record<string, number> = {};

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

    // Detailed type classification
    const detailedType = card.type_line.includes('Creature') ? 'Creatures'
      : card.type_line.includes('Instant') ? 'Instants'
      : card.type_line.includes('Sorcery') ? 'Sorceries'
      : card.type_line.includes('Enchantment') ? 'Enchantments'
      : card.type_line.includes('Artifact') ? 'Artifacts'
      : card.type_line.includes('Planeswalker') ? 'Planeswalkers'
      : card.type_line.includes('Land') ? 'Lands'
      : 'Other';
    detailedTypeCounts[detailedType] = (detailedTypeCounts[detailedType] || 0) + entry.quantity;

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

      {/* Type distribution — compact bar */}
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Type Breakdown</div>
        {(() => {
          const typeColors: Record<string, string> = {
            Creatures: 'bg-green-500',
            Instants: 'bg-blue-500',
            Sorceries: 'bg-red-500',
            Enchantments: 'bg-yellow-500',
            Artifacts: 'bg-purple-500',
            Planeswalkers: 'bg-orange-500',
            Lands: 'bg-zinc-500',
            Other: 'bg-zinc-400',
          };
          const orderedTypes = ['Creatures', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Planeswalkers', 'Lands', 'Other'];
          const activeTypes = orderedTypes.filter((t) => (detailedTypeCounts[t] || 0) > 0);
          return (
            <>
              {/* Stacked bar */}
              {mainTotal > 0 && (
                <div className="flex h-3 overflow-hidden rounded-full">
                  {activeTypes.map((type) => {
                    const count = detailedTypeCounts[type] || 0;
                    const pct = (count / mainTotal) * 100;
                    return (
                      <div
                        key={type}
                        className={cn('transition-all', typeColors[type])}
                        style={{ width: `${pct}%` }}
                        title={`${type}: ${count}`}
                      />
                    );
                  })}
                </div>
              )}
              {/* Labels */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {activeTypes.map((type) => (
                  <div key={type} className="flex items-center gap-1 text-[10px]">
                    <span className={cn('inline-block h-2 w-2 rounded-full', typeColors[type])} />
                    <span className="text-muted-foreground">{type}</span>
                    <span className="font-medium">{detailedTypeCounts[type]}</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {/* Avg CMC */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Avg CMC</span>
        <span className="font-medium">{avgCmc}</span>
      </div>

      {/* Mana curve */}
      <ManaCurve cards={cards} />

      {/* Price estimate + top cards */}
      {estimatedPrice > 0 && (() => {
        const priced = mainCards
          .filter((e) => e.card.price_usd)
          .map((e) => ({ name: e.card.name, total: parseFloat(e.card.price_usd!) * e.quantity }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Est. Price</span>
              <span className="font-medium">${estimatedPrice.toFixed(2)}</span>
            </div>
            {priced.length > 0 && (
              <div className="space-y-0.5 pl-1">
                {priced.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                    <span className="truncate mr-2">{p.name}</span>
                    <span className="tabular-nums shrink-0">${p.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
