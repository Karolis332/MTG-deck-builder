'use client';

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
  onQuantityChange,
  onRemove,
  onSetCommander,
  isCommanderFormat,
  className,
}: DeckListProps) {
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
}: {
  title: string;
  count: number;
  cards: DeckEntry[];
  onQuantityChange?: (cardId: string, board: string, quantity: number) => void;
  onRemove?: (cardId: string, board: string) => void;
  onSetCommander?: (cardId: string) => void;
  isCommanderFormat?: boolean;
  hideHeader?: boolean;
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
}: {
  entry: DeckEntry;
  onQuantityChange?: (cardId: string, board: string, quantity: number) => void;
  onRemove?: (cardId: string, board: string) => void;
  onSetCommander?: (cardId: string) => void;
  isCommanderFormat?: boolean;
}) {
  const card = entry.card;
  const previewUrl = card.image_uri_small;
  const isCommander = entry.board === 'commander';
  const canBeCommander = isCommanderFormat && !isCommander && entry.board === 'main' &&
    (card.type_line.includes('Legendary') && card.type_line.includes('Creature') ||
     card.type_line.includes('Planeswalker') && card.oracle_text?.includes('can be your commander'));

  return (
    <div className={cn(
      'group flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-accent/50',
      isCommander && 'bg-primary/10 border border-primary/30'
    )}>
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
