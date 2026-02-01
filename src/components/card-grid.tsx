'use client';

import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';
import { CardImage } from './card-image';
import { ManaCost } from './mana-cost';
import { RARITY_COLORS } from '@/lib/constants';

interface CardGridProps {
  cards: DbCard[];
  onCardClick?: (card: DbCard) => void;
  onAddCard?: (card: DbCard) => void;
  showQuantity?: (card: DbCard) => number;
  emptyMessage?: string;
  loading?: boolean;
  size?: 'small' | 'normal';
  className?: string;
}

export function CardGrid({
  cards,
  onCardClick,
  onAddCard,
  showQuantity,
  emptyMessage = 'No cards found',
  loading = false,
  size = 'normal',
  className,
}: CardGridProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'grid gap-3',
          size === 'small'
            ? 'grid-cols-[repeat(auto-fill,minmax(146px,1fr))]'
            : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
          className
        )}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="skeleton rounded-xl"
            style={{
              width: size === 'small' ? 146 : 244,
              height: size === 'small' ? 204 : 340,
            }}
          />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 text-4xl opacity-40">🃏</div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'card-grid grid gap-3',
        size === 'small'
          ? 'grid-cols-[repeat(auto-fill,minmax(146px,1fr))]'
          : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
        className
      )}
    >
      {cards.map((card) => {
        const qty = showQuantity ? showQuantity(card) : 0;
        return (
          <div key={card.id} className="group relative">
            <CardImage
              card={card}
              size={size}
              onClick={() => onCardClick?.(card)}
            />

            {/* Quantity badge */}
            {qty > 0 && (
              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-md">
                {qty}
              </div>
            )}

            {/* Hover overlay with details + add button */}
            {onAddCard && (
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">
                        {card.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <ManaCost cost={card.mana_cost} size="xs" />
                        <span
                          className={cn(
                            'text-[10px] capitalize',
                            RARITY_COLORS[card.rarity] || 'text-zinc-400'
                          )}
                        >
                          {card.rarity}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddCard(card);
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold transition-transform hover:scale-110"
                      title="Add to deck"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
