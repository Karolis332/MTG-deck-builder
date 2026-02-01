'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: { imported: number; failed: string[]; total: number }) => void;
}

export function ImportDialog({ open, onClose, onSuccess }: ImportDialogProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [importType, setImportType] = useState<'collection' | 'deck'>('collection');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: string[]; total: number } | null>(null);
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
        const res = await fetch('/api/collection/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Import failed');
        setResult(data);
        onSuccess?.(data);
      } else {
        // Import as a new deck
        const deckRes = await fetch('/api/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Imported Deck', format: 'standard' }),
        });
        const deckData = await deckRes.json();
        if (!deckRes.ok) throw new Error(deckData.error || 'Failed to create deck');

        // Parse and add cards
        const importRes = await fetch('/api/collection/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode: 'merge' }),
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
    setText('');
    setResult(null);
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
          {(['collection', 'deck'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setImportType(type)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                importType === type
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {type === 'collection' ? 'Collection' : 'New Deck'}
            </button>
          ))}
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
            {result ? 'Done' : 'Cancel'}
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
