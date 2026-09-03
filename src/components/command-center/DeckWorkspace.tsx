'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';
import type { DeckData } from '@/hooks/use-deck-editor';
import { SearchBar } from '@/components/search-bar';
import { CardGrid } from '@/components/card-grid';
import { DeckList } from '@/components/deck-list';

interface DeckWorkspaceProps {
  deck: DeckData;
  deckId: number;
  mainCount: number;
  isCommanderFormat: boolean;
  // search
  searchResults: DbCard[];
  searchTotal: number;
  searchLoading: boolean;
  searchQuery: string;
  onSearch: (query: string) => void;
  onLoadMore: () => void;
  // filters
  filterManaValues: number[];
  filterColors: string[];
  filterTypes: string[];
  setFilterManaValues: (fn: (prev: number[]) => number[]) => void;
  setFilterColors: (fn: (prev: string[]) => string[]) => void;
  setFilterTypes: (fn: (prev: string[]) => string[]) => void;
  onClearFilters: () => void;
  // card actions
  onCardClick: (card: DbCard) => void;
  onAddCard: (card: DbCard) => void;
  onCardZoom: (card: DbCard, position: { x: number; y: number }) => void;
  // deck list actions
  onQuantityChange: (cardId: string, board: string, quantity: number) => void;
  onRemove: (cardId: string, board: string) => void;
  onSetCommander: (cardId: string) => void;
  onSetCoverCard: (cardId: string) => void;
}

const MANA_VALUES = [0, 1, 2, 3, 4, 5, 6, 7];
const COLOR_STYLES: Record<string, string> = {
  W: 'bg-amber-50 text-amber-900 border-amber-300',
  U: 'bg-blue-600 text-white border-blue-500',
  B: 'bg-zinc-800 text-zinc-100 border-zinc-600',
  R: 'bg-red-600 text-white border-red-500',
  G: 'bg-green-700 text-white border-green-600',
};
const TYPE_OPTIONS = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'];

export function DeckWorkspace({
  deck,
  deckId,
  mainCount,
  isCommanderFormat,
  searchResults,
  searchTotal,
  searchLoading,
  searchQuery,
  onSearch,
  onLoadMore,
  filterManaValues,
  filterColors,
  filterTypes,
  setFilterManaValues,
  setFilterColors,
  setFilterTypes,
  onClearFilters,
  onCardClick,
  onAddCard,
  onCardZoom,
  onQuantityChange,
  onRemove,
  onSetCommander,
  onSetCoverCard,
}: DeckWorkspaceProps) {
  // Slim search bar by default once the deck has cards — expands on focus/click.
  const [searchExpanded, setSearchExpanded] = useState(mainCount === 0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === '/') {
        e.preventDefault();
        setSearchExpanded(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const hasActiveFilters = filterManaValues.length > 0 || filterColors.length > 0 || filterTypes.length > 0;
  const collapsedSlim = mainCount > 0 && !searchExpanded;

  const deckListCards = deck.cards.map((c) => ({ card_id: c.card_id, quantity: c.quantity, board: c.board, card: c }));

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-3 pb-0">
        {collapsedSlim ? (
          <button
            onClick={() => setSearchExpanded(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground hover:border-primary/40"
          >
            <SearchIcon className="h-3.5 w-3.5" />
            Search cards to add... <span className="ml-auto text-[10px] opacity-60">press /</span>
          </button>
        ) : (
          <SearchBar
            onSearch={onSearch}
            placeholder="Search cards to add..."
            autoFocus
          />
        )}
      </div>

      {!collapsedSlim && (
        <>
          <div className="shrink-0 px-3 py-2 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {MANA_VALUES.map((mv) => (
                <button
                  key={mv}
                  onClick={() => setFilterManaValues((prev) => (prev.includes(mv) ? prev.filter((v) => v !== mv) : [...prev, mv]))}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded text-[10px] font-medium border transition-colors',
                    filterManaValues.includes(mv) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                  )}
                  title={`CMC ${mv === 7 ? '7+' : mv}`}
                >
                  {mv === 7 ? '7+' : mv}
                </button>
              ))}

              <span className="mx-1 h-4 w-px bg-border" />

              {(['W', 'U', 'B', 'R', 'G'] as const).map((color) => {
                const active = filterColors.includes(color);
                return (
                  <button
                    key={color}
                    onClick={() => setFilterColors((prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]))}
                    className={cn('flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold border transition-all', active ? COLOR_STYLES[color] : 'bg-card text-muted-foreground border-border hover:border-foreground/30')}
                    title={color}
                  >
                    {color}
                  </button>
                );
              })}

              <span className="mx-1 h-4 w-px bg-border" />

              {TYPE_OPTIONS.map((type) => {
                const active = filterTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => setFilterTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))}
                    className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium border transition-colors', active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-foreground/30')}
                  >
                    {type.slice(0, 4)}
                  </button>
                );
              })}

              {hasActiveFilters && (
                <>
                  <span className="mx-1 h-4 w-px bg-border" />
                  <button onClick={onClearFilters} className="text-[10px] text-muted-foreground hover:text-foreground">
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="max-h-[45%] overflow-auto p-3 pt-0">
            <CardGrid
              cards={searchResults}
              loading={searchLoading}
              size="small"
              onCardClick={onCardClick}
              onAddCard={onAddCard}
              onCardZoom={onCardZoom}
              showQuantity={(card) => {
                const entry = deck.cards.find((c) => (c.card_id || c.id) === card.id);
                return entry ? entry.quantity : 0;
              }}
              emptyMessage={
                searchQuery
                  ? hasActiveFilters
                    ? 'No cards match your filters. Try adjusting or clearing them.'
                    : 'No cards found. Try a different search.'
                  : 'Search for cards to add to your deck'
              }
            />

            {searchResults.length > 0 && searchResults.length < searchTotal && (
              <div className="mt-4 text-center">
                <button onClick={onLoadMore} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent">
                  Load more ({searchTotal - searchResults.length} remaining)
                </button>
              </div>
            )}
          </div>

          <div className="hud-divider mx-3" />
        </>
      )}

      <div className="flex-1 overflow-auto p-3">
        <DeckList
          cards={deckListCards}
          deckId={deckId}
          onQuantityChange={onQuantityChange}
          onRemove={onRemove}
          onSetCommander={onSetCommander}
          onSetCoverCard={onSetCoverCard}
          onCardZoom={onCardZoom}
          isCommanderFormat={isCommanderFormat}
        />
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
