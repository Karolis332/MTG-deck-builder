'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: { imported: number; failed: string[]; total: number }) => void;
  /** When set, shows "This Deck" tab that imports directly into the deck */
  deckId?: number;
  deckName?: string;
}

export function ImportDialog({ open, onClose, onSuccess, deckId, deckName }: ImportDialogProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [importType, setImportType] = useState<'collection' | 'deck' | 'this-deck'>(
    deckId ? 'this-deck' : 'collection'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: string[]; total: number } | null>(null);
  const [newDeckId, setNewDeckId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!text.trim()) {
      setError('Please paste or upload your card list');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (importType === 'collection') {
        // Import to collection
        const res = await fetch('/api/collection/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Import failed');
        setResult(data);
        onSuccess?.(data);
      } else if (importType === 'this-deck' && deckId) {
        // Import directly into the current deck
        const res = await fetch('/api/collection/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode: 'merge', deck_id: deckId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Import failed');
        setResult(data);
        onSuccess?.(data);
      } else {
        // Import as a new deck: detect format from card count, create deck, import cards
        const lines = text.trim().split('\n').filter((l) => l.trim());
        const cardCount = lines.reduce((sum, line) => {
          const match = line.match(/^(\d+)\s/);
          return sum + (match ? parseInt(match[1], 10) : 1);
        }, 0);
        // Detect if Commander section exists
        const hasCommander = text.includes('Commander') || text.includes('COMMANDER');
        // Brawl/Commander = ~60-100 cards with mostly 1-ofs, Standard = ~60 cards with 4-ofs
        const uniqueCards = lines.length;
        const isSingleton = uniqueCards > 0 && cardCount / uniqueCards < 1.5;
        const detectedFormat = hasCommander || (isSingleton && cardCount >= 58 && cardCount <= 101)
          ? (cardCount <= 61 ? 'brawl' : 'commander')
          : cardCount <= 80 ? 'standard' : 'standard';

        const deckRes = await fetch('/api/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Imported Deck', format: detectedFormat }),
        });
        const deckData = await deckRes.json();
        if (!deckRes.ok) throw new Error(deckData.error || 'Failed to create deck');

        const createdDeckId = deckData.deck?.id;
        setNewDeckId(createdDeckId);
        const importRes = await fetch('/api/collection/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode: 'merge', deck_id: createdDeckId }),
        });
        const importData = await importRes.json();
        if (!importRes.ok) throw new Error(importData.error || 'Import failed');
        setResult(importData);
        onSuccess?.(importData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Navigate to new deck if one was created
    if (newDeckId && result) {
      router.push(`/deck/${newDeckId}`);
    }
    setText('');
    setResult(null);
    setNewDeckId(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import Cards</h2>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            &times;
          </button>
        </div>

        {/* Import type toggle */}
        <div className="mb-3 flex rounded-lg bg-accent/50 p-0.5">
          {deckId && (
            <button
              onClick={() => setImportType('this-deck')}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                importType === 'this-deck'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {deckName ? `${deckName.slice(0, 16)}` : 'This Deck'}
            </button>
          )}
          <button
            onClick={() => setImportType('collection')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              importType === 'collection'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Collection
          </button>
          <button
            onClick={() => setImportType('deck')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              importType === 'deck'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            New Deck
          </button>
        </div>

        {/* Text area */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Paste your MTG Arena export or tab-separated collection here...\n\nArena format:\n4 Lightning Bolt (2X2) 117\n2 Counterspell (MH2) 267\n\nTab-separated (MTGA Assistant):\n6947\tEnlightened Tutor\tMIR\tWhite\tUncommon\t4\t0`}
          className="mb-3 h-48 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-mono placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          disabled={loading}
        />

        {/* File upload */}
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Upload .txt file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.dec"
            onChange={handleFileUpload}
            className="hidden"
          />

          {importType === 'collection' && (
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="radio"
                  name="mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  className="accent-primary"
                />
                Merge
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="radio"
                  name="mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="accent-primary"
                />
                Replace
              </label>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mb-3 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400">
            Imported {result.imported} of {result.total} cards.
            {result.failed.length > 0 && (
              <span className="block mt-1 text-yellow-400">
                Failed: {result.failed.join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            {result ? (newDeckId ? 'Go to Deck' : 'Done') : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={loading || !text.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Importing...
                </span>
              ) : (
                'Import'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
