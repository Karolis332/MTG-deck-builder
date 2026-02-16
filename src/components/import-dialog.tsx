'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { parseArenaExportWithMeta } from '@/lib/arena-parser';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: { imported: number; failed: string[]; total: number }) => void;
  /** When set, shows "This Deck" tab that imports directly into the deck */
  deckId?: number;
  deckName?: string;
}

interface DiffEntry {
  cardName: string;
  cardId: string | null;
  action: 'added' | 'removed' | 'changed';
  oldQuantity: number;
  newQuantity: number;
  board: string;
}

export function ImportDialog({ open, onClose, onSuccess, deckId, deckName }: ImportDialogProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [deckSubMode, setDeckSubMode] = useState<'merge' | 'update'>('merge');
  const [importType, setImportType] = useState<'collection' | 'deck' | 'this-deck'>(
    deckId ? 'this-deck' : 'collection'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: string[]; total: number } | null>(null);
  const [newDeckId, setNewDeckId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [deckNameInput, setDeckNameInput] = useState('');
  const [collectionSource, setCollectionSource] = useState<'paper' | 'arena'>('paper');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update mode state
  const [diffPreview, setDiffPreview] = useState<DiffEntry[] | null>(null);
  const [diffFailed, setDiffFailed] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  // Auto-detect deck name from pasted text when importing as new deck
  useEffect(() => {
    if (importType !== 'deck' || !text.trim()) {
      setDeckNameInput('');
      return;
    }
    const { deckName } = parseArenaExportWithMeta(text);
    setDeckNameInput(deckName || '');
  }, [text, importType]);

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
    setDiffPreview(null);

    try {
      if (importType === 'this-deck' && deckId && deckSubMode === 'update') {
        // Update mode: preview diff first
        const res = await fetch(`/api/decks/${deckId}/import-update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, confirm: false }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Preview failed');
        setDiffPreview(data.diff || []);
        setDiffFailed(data.failed || []);
      } else if (importType === 'collection') {
        // Import to collection
        const res = await fetch('/api/collection/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode, source: collectionSource }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Import failed');
        setResult(data);
        onSuccess?.(data);
      } else if (importType === 'this-deck' && deckId) {
        // Merge mode: import directly into the current deck
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
        const { cards: parsedCards, deckName: detectedName } = parseArenaExportWithMeta(text);
        const cardCount = parsedCards.reduce((sum, c) => sum + c.quantity, 0);
        const hasCommander = parsedCards.some(c => c.board === 'commander');
        const uniqueCards = parsedCards.length;
        const isSingleton = uniqueCards > 0 && cardCount / uniqueCards < 1.5;
        const detectedFormat = hasCommander || (isSingleton && cardCount >= 58 && cardCount <= 101)
          ? (cardCount <= 61 ? 'brawl' : 'commander')
          : cardCount <= 80 ? 'standard' : 'standard';

        const finalName = deckNameInput.trim() || detectedName || 'Imported Deck';

        const deckRes = await fetch('/api/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: finalName, format: detectedFormat }),
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

  const handleConfirmUpdate = async () => {
    if (!deckId) return;
    setConfirming(true);
    setError('');
    try {
      const res = await fetch(`/api/decks/${deckId}/import-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      const diff = (data.diff || []) as DiffEntry[];
      const totalChanges = diff.length;
      setResult({
        imported: totalChanges,
        failed: data.failed || [],
        total: totalChanges,
      });
      setDiffPreview(null);
      onSuccess?.({
        imported: totalChanges,
        failed: data.failed || [],
        total: totalChanges,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    if (newDeckId && result) {
      router.push(`/deck/${newDeckId}`);
    }
    setText('');
    setResult(null);
    setNewDeckId(null);
    setError('');
    setDeckNameInput('');
    setDiffPreview(null);
    setDiffFailed([]);
    setDeckSubMode('merge');
    onClose();
  };

  const adds = diffPreview?.filter(d => d.action === 'added') || [];
  const removes = diffPreview?.filter(d => d.action === 'removed') || [];
  const changes = diffPreview?.filter(d => d.action === 'changed') || [];

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
          <h2 className="font-heading text-lg font-semibold tracking-wide text-primary">Import Cards</h2>
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
              onClick={() => { setImportType('this-deck'); setDiffPreview(null); }}
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
            onClick={() => { setImportType('collection'); setDiffPreview(null); }}
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
            onClick={() => { setImportType('deck'); setDiffPreview(null); }}
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

        {/* Sub-mode toggle for this-deck */}
        {importType === 'this-deck' && deckId && !diffPreview && !result && (
          <div className="mb-3 flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="radio"
                name="deckSubMode"
                value="merge"
                checked={deckSubMode === 'merge'}
                onChange={() => setDeckSubMode('merge')}
                className="accent-primary"
              />
              Merge (add cards)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="radio"
                name="deckSubMode"
                value="update"
                checked={deckSubMode === 'update'}
                onChange={() => setDeckSubMode('update')}
                className="accent-primary"
              />
              Update (replace deck)
            </label>
          </div>
        )}

        {/* Diff preview for update mode */}
        {diffPreview && !result ? (
          <div className="mb-3">
            <div className="mb-2 text-xs font-medium">
              Preview — {adds.length + removes.length + changes.length} changes
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border border-border bg-background p-2 space-y-0.5">
              {adds.map((d, i) => (
                <div key={`a-${i}`} className="flex items-center gap-1.5 text-[11px]">
                  <span className="shrink-0 rounded bg-green-500/15 px-1 py-0.5 font-bold text-green-400">
                    +{d.newQuantity}
                  </span>
                  <span className="truncate">{d.cardName}</span>
                </div>
              ))}
              {removes.map((d, i) => (
                <div key={`r-${i}`} className="flex items-center gap-1.5 text-[11px]">
                  <span className="shrink-0 rounded bg-red-500/15 px-1 py-0.5 font-bold text-red-400">
                    -{d.oldQuantity}
                  </span>
                  <span className="truncate">{d.cardName}</span>
                </div>
              ))}
              {changes.map((d, i) => (
                <div key={`c-${i}`} className="flex items-center gap-1.5 text-[11px]">
                  <span className="shrink-0 rounded bg-amber-500/15 px-1 py-0.5 font-bold text-amber-400">
                    {d.oldQuantity}&rarr;{d.newQuantity}
                  </span>
                  <span className="truncate">{d.cardName}</span>
                </div>
              ))}
              {diffPreview.length === 0 && (
                <div className="py-2 text-center text-xs text-muted-foreground">
                  No changes detected — deck is identical.
                </div>
              )}
            </div>
            {diffFailed.length > 0 && (
              <div className="mt-1 text-[10px] text-yellow-400">
                Not found: {diffFailed.join(', ')}
              </div>
            )}
            <div className="mt-2 text-[10px] text-muted-foreground">
              A checkpoint of the current deck will be saved before applying changes.
              Commander/companion cards are preserved.
            </div>
          </div>
        ) : !result ? (
          <>
            {/* Deck name input for new deck imports */}
            {importType === 'deck' && (
              <input
                type="text"
                value={deckNameInput}
                onChange={(e) => setDeckNameInput(e.target.value)}
                placeholder="Deck name (auto-detected from paste)"
                className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                disabled={loading}
              />
            )}

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
                  <div className="flex rounded-md bg-accent/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setCollectionSource('paper')}
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                        collectionSource === 'paper'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Paper
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionSource('arena')}
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                        collectionSource === 'arena'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Arena
                    </button>
                  </div>
                  <span className="h-3 w-px bg-border" />
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
          </>
        ) : null}

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mb-3 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400">
            {deckSubMode === 'update' && importType === 'this-deck'
              ? `Deck updated with ${result.imported} changes.`
              : `Imported ${result.imported} of ${result.total} cards.`}
            {result.failed.length > 0 && (
              <span className="block mt-1 text-yellow-400">
                Failed: {result.failed.join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {diffPreview && !result ? (
            <>
              <button
                onClick={() => setDiffPreview(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                Back
              </button>
              {diffPreview.length > 0 && (
                <button
                  onClick={handleConfirmUpdate}
                  disabled={confirming}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {confirming ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> Applying...
                    </span>
                  ) : (
                    'Confirm Update'
                  )}
                </button>
              )}
            </>
          ) : (
            <>
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
                      <Spinner /> {deckSubMode === 'update' && importType === 'this-deck' ? 'Previewing...' : 'Importing...'}
                    </span>
                  ) : (
                    deckSubMode === 'update' && importType === 'this-deck' ? 'Preview Changes' : 'Import'
                  )}
                </button>
              )}
            </>
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
