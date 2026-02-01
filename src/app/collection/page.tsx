'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DbCard } from '@/lib/types';
import { SearchBar } from '@/components/search-bar';
import { CardGrid } from '@/components/card-grid';
import { CollectionFilters } from '@/components/collection-filters';
import { cn } from '@/lib/utils';

interface CollectionCard extends DbCard {
  collection_id: number;
  quantity: number;
  foil: boolean;
  source: string;
}

export default function CollectionPage() {
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({ totalCards: 0, uniqueCards: 0, totalValue: 0 });

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
    });
    if (query) params.set('q', query);
    if (selectedRarities.length) params.set('rarities', selectedRarities.join(','));
    if (selectedTypes.length) params.set('types', selectedTypes.join(','));
    if (selectedColors.length) params.set('colors', selectedColors.join(','));

    try {
      const res = await fetch(`/api/collection?${params}`);
      const data = await res.json();
      setCards(data.cards || []);
      setTotal(data.total || 0);
      setStats(data.stats || { totalCards: 0, uniqueCards: 0, totalValue: 0 });
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [page, query, selectedRarities, selectedTypes, selectedColors]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleSearch = (q: string) => {
    setQuery(q);
    setPage(1);
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collection</h1>
          <p className="text-sm text-muted-foreground">
            {stats.totalCards} cards / {stats.uniqueCards} unique
            {stats.totalValue > 0 && ` / ~$${stats.totalValue.toFixed(2)}`}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            showFilters
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent text-muted-foreground hover:text-foreground'
          )}
        >
          <FilterIcon className="h-4 w-4" />
          Filters
          {(selectedColors.length + selectedTypes.length + selectedRarities.length) > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
              {selectedColors.length + selectedTypes.length + selectedRarities.length}
            </span>
          )}
        </button>
      </div>

      <div className="mb-4">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search your collection..."
        />
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 animate-slide-up">
          <CollectionFilters
            selectedColors={selectedColors}
            onColorsChange={setSelectedColors}
            selectedTypes={selectedTypes}
            onTypesChange={setSelectedTypes}
            selectedRarities={selectedRarities}
            onRaritiesChange={setSelectedRarities}
          />
        </div>
      )}

      {/* Results */}
      <CardGrid
        cards={cards}
        loading={loading}
        showQuantity={(card) => {
          const match = cards.find((c) => c.id === card.id);
          return match ? match.quantity : 0;
        }}
        emptyMessage={
          query || selectedColors.length || selectedTypes.length || selectedRarities.length
            ? 'No cards match your filters'
            : 'Your collection is empty. Import cards from MTG Arena to get started.'
        }
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
    </svg>
  );
}
