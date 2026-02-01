'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { groupBy } from '@/lib/utils';
import type { DbCard } from '@/lib/types';
import { ManaCost } from './mana-cost';
import { RARITY_COLORS } from '@/lib/constants';

interface DeckEntry {
  card_id: string;
  quantity: number;
  board: string;
  card: DbCard;
}

interface DeckListProps {
  cards: DeckEntry[];
  deckId?: number;
  onQuantityChange?: (cardId: string, board: string, quantity: number) => void;
  onRemove?: (cardId: string, board: string) => void;
  onSetCommander?: (cardId: string) => void;
  isCommanderFormat?: boolean;
  className?: string;
}

function getCardMainType(typeLine: string): string {
  if (typeLine.includes('Creature')) return 'Creatures';
  if (typeLine.includes('Planeswalker')) return 'Planeswalkers';
  if (typeLine.includes('Instant')) return 'Instants';
  if (typeLine.includes('Sorcery')) return 'Sorceries';
  if (typeLine.includes('Enchantment')) return 'Enchantments';
  if (typeLine.includes('Artifact')) return 'Artifacts';
  if (typeLine.includes('Land')) return 'Lands';
  if (typeLine.includes('Battle')) return 'Battles';
  return 'Other';
}

const TYPE_ORDER = [
  'Creatures',
  'Planeswalkers',
  'Instants',
  'Sorceries',
  'Enchantments',
  'Artifacts',
  'Lands',
  'Battles',
  'Other',
];

export function DeckList({
  cards,
  deckId,
  onQuantityChange,
  onRemove,
  onSetCommander,
  isCommanderFormat,
  className,
}: DeckListProps) {
  const [favourites, setFavourites] = useState<Set<string>>(new Set());

  // Load favourites when deckId changes
  useEffect(() => {
    if (!deckId) return;
    fetch(`/api/favourites?deck_id=${deckId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.favourites) setFavourites(new Set(data.favourites));
      })
      .catch(() => {});
  }, [deckId]);

  const toggleFavourite = useCallback(
    async (cardId: string) => {
      if (!deckId) return;
      // Optimistic update
      setFavourites((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) next.delete(cardId);
        else next.add(cardId);
        return next;
      });
      try {
        await fetch('/api/favourites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ card_id: cardId, deck_id: deckId }),
        });
      } catch {
        // Revert on error
        setFavourites((prev) => {
          const next = new Set(prev);
          if (next.has(cardId)) next.delete(cardId);
          else next.add(cardId);
          return next;
        });
      }
    },
    [deckId]
  );

  const mainCards = cards.filter((c) => c.board === 'main');
  const sideCards = cards.filter((c) => c.board === 'sideboard');
  const cmdCards = cards.filter((c) => c.board === 'commander');

  const mainGrouped = groupBy(mainCards, (c) => getCardMainType(c.card.type_line));
  const mainTotal = mainCards.reduce((sum, c) => sum + c.quantity, 0);
  const sideTotal = sideCards.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Commander */}
      {cmdCards.length > 0 && (
        <DeckSection
          title="Commander"
          count={cmdCards.length}
          cards={cmdCards}
          onQuantityChange={onQuantityChange}
          onRemove={onRemove}
          favourites={favourites}
          onToggleFavourite={deckId ? toggleFavourite : undefined}
        />
      )}

      {/* Maindeck by type */}
      <div className="text-xs font-medium text-muted-foreground">
        Maindeck ({mainTotal})
      </div>
      {TYPE_ORDER.map((type) => {
        const group = mainGrouped[type];
        if (!group?.length) return null;
        const count = group.reduce((s, c) => s + c.quantity, 0);
        return (
          <DeckSection
            key={type}
            title={type}
            count={count}
            cards={group}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
            onSetCommander={onSetCommander}
            isCommanderFormat={isCommanderFormat}
            favourites={favourites}
            onToggleFavourite={deckId ? toggleFavourite : undefined}
          />
        );
      })}

      {/* Sideboard */}
      {sideCards.length > 0 && (
        <>
          <div className="border-t border-border pt-2 text-xs font-medium text-muted-foreground">
            Sideboard ({sideTotal})
          </div>
          <DeckSection
            title=""
            count={sideTotal}
            cards={sideCards}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
            hideHeader
            favourites={favourites}
            onToggleFavourite={deckId ? toggleFavourite : undefined}
          />
        </>
      )}

      {cards.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-2 text-3xl opacity-30">📋</div>
          <p className="text-xs text-muted-foreground">
            No cards yet. Search and add cards to start building.
          </p>
        </div>
      )}
    </div>
  );
}

function DeckSection({
  title,
  count,
  cards,
  onQuantityChange,
  onRemove,
  onSetCommander,
  isCommanderFormat,
  hideHeader,
  favourites,
  onToggleFavourite,
}: {
  title: string;
  count: number;
  cards: DeckEntry[];
  onQuantityChange?: (cardId: string, board: string, quantity: number) => void;
  onRemove?: (cardId: string, board: string) => void;
  onSetCommander?: (cardId: string) => void;
  isCommanderFormat?: boolean;
  hideHeader?: boolean;
  favourites?: Set<string>;
  onToggleFavourite?: (cardId: string) => void;
}) {
  const sorted = [...cards].sort((a, b) => a.card.cmc - b.card.cmc || a.card.name.localeCompare(b.card.name));

  return (
    <div>
      {!hideHeader && (
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">{title}</span>
          <span className="text-muted-foreground">({count})</span>
        </div>
      )}
      <div className="space-y-px">
        {sorted.map((entry) => (
          <DeckCardRow
            key={`${entry.card_id}-${entry.board}`}
            entry={entry}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
            onSetCommander={onSetCommander}
            isCommanderFormat={isCommanderFormat}
            isFavourite={favourites?.has(entry.card_id)}
            onToggleFavourite={onToggleFavourite}
          />
        ))}
      </div>
    </div>
  );
}

function DeckCardRow({
  entry,
  onQuantityChange,
  onRemove,
  onSetCommander,
  isCommanderFormat,
  isFavourite,
  onToggleFavourite,
}: {
  entry: DeckEntry;
  onQuantityChange?: (cardId: string, board: string, quantity: number) => void;
  onRemove?: (cardId: string, board: string) => void;
  onSetCommander?: (cardId: string) => void;
  isCommanderFormat?: boolean;
  isFavourite?: boolean;
  onToggleFavourite?: (cardId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const card = entry.card;
  const previewUrl = card.image_uri_small;
  const largeUrl = card.image_uri_normal || card.image_uri_large;
  const isCommander = entry.board === 'commander';
  const canBeCommander = isCommanderFormat && !isCommander && entry.board === 'main' &&
    (card.type_line.includes('Legendary') && card.type_line.includes('Creature') ||
     card.type_line.includes('Planeswalker') && card.oracle_text?.includes('can be your commander'));

  return (
    <div
      className={cn(
        'group relative flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-accent/50',
        isCommander && 'bg-primary/10 border border-primary/30'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Large card hover preview */}
      {hovered && largeUrl && (
        <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden lg:block">
          <div className="rounded-xl shadow-2xl shadow-black/50 overflow-hidden" style={{ width: 250 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={largeUrl}
              alt={card.name}
              className="h-auto w-full"
            />
          </div>
        </div>
      )}

      {/* Commander crown */}
      {isCommander && (
        <span className="text-xs text-primary" title="Commander">
          &#x1F451;
        </span>
      )}

      {/* Quantity controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() =>
            onQuantityChange?.(entry.card_id, entry.board, entry.quantity - 1)
          }
          className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
        >
          −
        </button>
        <span className="w-4 text-center text-xs font-medium text-foreground">
          {entry.quantity}
        </span>
        <button
          onClick={() =>
            onQuantityChange?.(entry.card_id, entry.board, entry.quantity + 1)
          }
          className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
        >
          +
        </button>
      </div>

      {/* Card preview thumbnail */}
      {previewUrl && (
        <div className="relative h-6 w-4 shrink-0 overflow-hidden rounded-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Card name */}
      <span
        className={cn(
          'flex-1 truncate text-xs',
          RARITY_COLORS[card.rarity] || 'text-foreground'
        )}
        title={card.name}
      >
        {card.name}
      </span>

      {/* Mana cost */}
      <ManaCost cost={card.mana_cost} size="xs" />

      {/* Favourite button */}
      {onToggleFavourite && (
        <button
          onClick={() => onToggleFavourite(entry.card_id)}
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded text-[10px] transition-all',
            isFavourite
              ? 'text-yellow-500 opacity-100'
              : 'text-muted-foreground opacity-0 hover:text-yellow-500 group-hover:opacity-100'
          )}
          title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
        >
          {isFavourite ? '\u2605' : '\u2606'}
        </button>
      )}

      {/* Set as Commander button */}
      {canBeCommander && onSetCommander && (
        <button
          onClick={() => onSetCommander(entry.card_id)}
          className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
          title="Set as Commander"
        >
          &#x1F451;
        </button>
      )}

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={() => onRemove(entry.card_id, entry.board)}
          className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}
