'use client';

import { cn } from '@/lib/utils';
import { MANA_COLORS, MANA_COLOR_NAMES, CARD_TYPES, RARITIES, RARITY_COLORS } from '@/lib/constants';

interface CollectionFiltersProps {
  selectedColors: string[];
  onColorsChange: (colors: string[]) => void;
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  selectedRarities: string[];
  onRaritiesChange: (rarities: string[]) => void;
  className?: string;
}

const COLOR_STYLES: Record<string, string> = {
  W: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100',
  U: 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700',
  B: 'bg-zinc-800 text-zinc-100 border-zinc-600 hover:bg-zinc-700',
  R: 'bg-red-600 text-white border-red-500 hover:bg-red-700',
  G: 'bg-green-700 text-white border-green-600 hover:bg-green-800',
};

export function CollectionFilters({
  selectedColors,
  onColorsChange,
  selectedTypes,
  onTypesChange,
  selectedRarities,
  onRaritiesChange,
  className,
}: CollectionFiltersProps) {
  const toggleColor = (color: string) => {
    onColorsChange(
      selectedColors.includes(color)
        ? selectedColors.filter((c) => c !== color)
        : [...selectedColors, color]
    );
  };

  const toggleType = (type: string) => {
    onTypesChange(
      selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type)
        : [...selectedTypes, type]
    );
  };

  const toggleRarity = (rarity: string) => {
    onRaritiesChange(
      selectedRarities.includes(rarity)
        ? selectedRarities.filter((r) => r !== rarity)
        : [...selectedRarities, rarity]
    );
  };

  const hasAnyFilter =
    selectedColors.length > 0 || selectedTypes.length > 0 || selectedRarities.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Color filter */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Colors
        </label>
        <div className="flex flex-wrap gap-1.5">
          {MANA_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => toggleColor(color)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                selectedColors.includes(color)
                  ? cn(COLOR_STYLES[color], 'ring-2 ring-primary/50 scale-110')
                  : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/50'
              )}
              title={MANA_COLOR_NAMES[color]}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Card Type
        </label>
        <div className="flex flex-wrap gap-1">
          {CARD_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                'rounded-lg px-2 py-1 text-[11px] font-medium transition-colors',
                selectedTypes.includes(type)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Rarity filter */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Rarity
        </label>
        <div className="flex flex-wrap gap-1">
          {RARITIES.map((rarity) => (
            <button
              key={rarity}
              onClick={() => toggleRarity(rarity)}
              className={cn(
                'rounded-lg px-2 py-1 text-[11px] font-medium capitalize transition-colors',
                selectedRarities.includes(rarity)
                  ? cn('bg-accent', RARITY_COLORS[rarity])
                  : 'bg-accent/50 text-muted-foreground hover:text-foreground'
              )}
            >
              {rarity}
            </button>
          ))}
        </div>
      </div>

      {/* Clear all */}
      {hasAnyFilter && (
        <button
          onClick={() => {
            onColorsChange([]);
            onTypesChange([]);
            onRaritiesChange([]);
          }}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
