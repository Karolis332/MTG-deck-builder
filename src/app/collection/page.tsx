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
  const [activeSource, setActiveSource] = useState<'paper' | 'arena'>('paper');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

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
    params.set('source', activeSource);

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
  }, [page, query, selectedRarities, selectedTypes, selectedColors, activeSource]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleSearch = (q: string) => {
    setQuery(q);
    setPage(1);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setImportProgress(null);

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        setImportResult('❌ CSV file is empty or invalid');
        return;
      }

      const header = lines[0];
      const dataLines = lines.slice(1);

      // Split into chunks of 500 cards
      const CHUNK_SIZE = 500;
      const chunks: string[][] = [];
      for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
        chunks.push(dataLines.slice(i, i + CHUNK_SIZE));
      }

      let totalImported = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      const allErrors: string[] = [];

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        setImportProgress({ current: i + 1, total: chunks.length });

        const chunkCSV = [header, ...chunks[i]].join('\n');

        const res = await fetch('/api/collection/import-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: chunkCSV, source: activeSource }),
        });

        const data = await res.json();

        if (data.success) {
          totalImported += data.imported || 0;
          totalUpdated += data.updated || 0;
          totalSkipped += data.skipped || 0;
          if (data.errors) allErrors.push(...data.errors);
        } else {
          throw new Error(data.error || 'Import failed');
        }
      }

      setImportResult(
        `✅ Import complete!\n\n` +
        `• Imported: ${totalImported} new cards\n` +
        `• Updated: ${totalUpdated} existing cards\n` +
        `• Skipped: ${totalSkipped} cards\n` +
        (allErrors.length > 0 ? `\n⚠️ Errors: ${allErrors.slice(0, 5).join(', ')}${allErrors.length > 5 ? ` (+${allErrors.length - 5} more)` : ''}` : '')
      );
      fetchCollection(); // Refresh collection
    } catch (error) {
      setImportResult(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      setImportProgress(null);
      event.target.value = ''; // Reset file input
    }
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-wide text-grimoire">Collection</h1>
          <p className="text-sm text-muted-foreground">
            {stats.totalCards} cards / {stats.uniqueCards} unique
            {stats.totalValue > 0 && ` / ~$${stats.totalValue.toFixed(2)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="csv-upload"
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              importing
                ? 'cursor-wait bg-accent text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <UploadIcon className="h-4 w-4" />
            {importing && importProgress
              ? `Importing... (${importProgress.current}/${importProgress.total})`
              : importing
              ? 'Importing...'
              : 'Import CSV'}
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv,.txt"
            onChange={handleCSVUpload}
            disabled={importing}
            className="hidden"
          />
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-accent text-muted-foreground transition-colors hover:text-foreground"
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
          </button>
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
      </div>

      {/* Paper / Arena tabs */}
      <div className="mb-4 flex rounded-lg bg-accent/50 p-0.5" style={{ maxWidth: 240 }}>
        <button
          onClick={() => { setActiveSource('paper'); setPage(1); }}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            activeSource === 'paper'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Paper
        </button>
        <button
          onClick={() => { setActiveSource('arena'); setPage(1); }}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            activeSource === 'arena'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Arena
        </button>
      </div>

      {/* Import progress bar */}
      {importProgress && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4 animate-slide-up">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Importing collection...</span>
            <span className="text-muted-foreground">
              Batch {importProgress.current} of {importProgress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Import result toast */}
      {importResult && (
        <div className="mb-4 rounded-lg border border-border bg-card p-3 text-sm whitespace-pre-line animate-slide-up">
          {importResult}
        </div>
      )}

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
            onColorsChange={(c) => { setSelectedColors(c); setPage(1); }}
            selectedTypes={selectedTypes}
            onTypesChange={(t) => { setSelectedTypes(t); setPage(1); }}
            selectedRarities={selectedRarities}
            onRaritiesChange={(r) => { setSelectedRarities(r); setPage(1); }}
          />
        </div>
      )}

      {/* Results */}
      {viewMode === 'grid' ? (
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
      ) : (
        <CollectionListView cards={cards} loading={loading} />
      )}

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

function CollectionListView({ cards, loading }: { cards: CollectionCard[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No cards to display</p>
      </div>
    );
  }

  const SET_ICON_URL = 'https://svgs.scryfall.io/sets';
  const RARITY_COLORS: Record<string, string> = {
    common: 'text-zinc-400',
    uncommon: 'text-zinc-300',
    rare: 'text-yellow-500',
    mythic: 'text-orange-500',
  };

  return (
    <div className="space-y-px">
      {/* Header row */}
      <div className="flex items-center gap-3 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="w-10" />
        <span className="flex-1">Name</span>
        <span className="w-14 text-center">Set</span>
        <span className="w-24">Type</span>
        <span className="w-10 text-center">CMC</span>
        <span className="w-10 text-center">Qty</span>
      </div>
      {cards.map((card) => {
        const artUrl = card.image_uri_art_crop
          || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=art_crop`;
        const shortType = card.type_line.split('—')[0].trim().replace(/Legendary\s+/, '');
        return (
          <div
            key={card.collection_id}
            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50"
          >
            {/* Art thumbnail */}
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Name */}
            <span className={cn(
              'flex-1 truncate text-sm font-medium',
              RARITY_COLORS[card.rarity] || 'text-foreground'
            )}>
              {card.name}
            </span>

            {/* Set icon + code */}
            <span className="flex w-14 items-center justify-center gap-1" title={card.set_name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${SET_ICON_URL}/${card.set_code.toLowerCase()}.svg`}
                alt={card.set_code}
                className="h-4 w-4 opacity-60"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-[10px] uppercase text-muted-foreground">{card.set_code}</span>
            </span>

            {/* Type */}
            <span className="w-24 truncate text-xs text-muted-foreground">{shortType}</span>

            {/* CMC */}
            <span className="w-10 text-center text-xs text-muted-foreground">{card.cmc}</span>

            {/* Quantity */}
            <span className="w-10 text-center text-xs font-medium">
              {card.quantity > 1 ? `x${card.quantity}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
