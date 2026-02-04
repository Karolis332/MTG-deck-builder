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
          body: JSON.stringify({ csv: chunkCSV }),
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
          <h1 className="text-2xl font-bold">Collection</h1>
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

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
