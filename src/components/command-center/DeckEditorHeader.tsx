'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DeckData } from '@/hooks/use-deck-editor';
import { FORMAT_LABELS, FORMATS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeftIcon,
  SparklesIcon,
  ImportIcon,
  ExportIcon,
  PlayIcon,
  HistoryIcon,
  CollectionBuildIcon,
  UndoIcon,
  RedoIcon,
} from './icons';

type PowerLevel = 'casual' | 'optimized' | 'cedh';
const POWER_LEVELS: PowerLevel[] = ['casual', 'optimized', 'cedh'];

interface DeckEditorHeaderProps {
  deck: DeckData;
  mainCount: number;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasExplanation: boolean;
  showExplanation: boolean;
  onToggleExplanation: () => void;
  editingName: boolean;
  deckName: string;
  onDeckNameChange: (v: string) => void;
  onStartEditingName: () => void;
  onCommitName: () => void;
  onFormatChange: (format: string) => void;
  onBack: () => void;
  onShowVersionHistory: () => void;
  collectionOnly: boolean;
  onToggleCollectionOnly: () => void;
  onShowPlaytest: () => void;
  onBuildFromCollection: () => void;
  onShowImport: () => void;
  onShowExport: () => void;
  targetBracket: number;
  onSetTargetBracket: (n: number) => void;
  onNavigateToDeck: (deckId: number) => void;
}

// Deck editor top bar: name/format, undo/redo, and the action buttons — unchanged
// behaviour, lifted verbatim out of the old page.tsx.
export function DeckEditorHeader({
  deck,
  mainCount,
  saving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasExplanation,
  showExplanation,
  onToggleExplanation,
  editingName,
  deckName,
  onDeckNameChange,
  onStartEditingName,
  onCommitName,
  onFormatChange,
  onBack,
  onShowVersionHistory,
  collectionOnly,
  onToggleCollectionOnly,
  onShowPlaytest,
  onBuildFromCollection,
  onShowImport,
  onShowExport,
  targetBracket,
  onSetTargetBracket,
  onNavigateToDeck,
}: DeckEditorHeaderProps) {
  const [powerLevel, setPowerLevel] = useState<PowerLevel>('optimized');
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [rebuilding, setRebuilding] = useState(false);

  const powerLevelKey = `bg.powerLevel.${deck.id}`;
  useEffect(() => {
    const stored = window.localStorage.getItem(powerLevelKey);
    if (stored && POWER_LEVELS.includes(stored as PowerLevel)) setPowerLevel(stored as PowerLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id]);

  useEffect(() => {
    window.localStorage.setItem(powerLevelKey, powerLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powerLevel]);

  useEffect(() => {
    fetch(`/api/ai-suggest/ml-check?deck_id=${deck.id}`)
      .then((r) => r.json())
      .then((d) => setGamesPlayed(d.gamesPlayed ?? 0))
      .catch(() => {});
  }, [deck.id]);

  const optimizeMode = gamesPlayed >= 10;

  const runRebuildOrOptimize = async () => {
    setRebuilding(true);
    try {
      if (optimizeMode) {
        const res = await fetch('/api/cf-optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deckId: deck.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Optimize failed');
        toast({
          title: `Model suggests ${data.cuts?.length ?? 0} cut(s), ${data.adds?.length ?? 0} add(s) — see chat for details. Undo via Version History, not Ctrl+Z.`,
          tone: 'ok',
          ttl: 7000,
        });
      } else {
        const commander = deck.cards.find((c) => c.board === 'commander');
        const res = await fetch('/api/decks/auto-build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${deck.name} (Rebuilt)`,
            format: deck.format,
            useCollection: collectionOnly,
            commanderName: commander?.name,
            powerLevel,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Rebuild failed');
        toast({
          title: 'Rebuilt as a new deck. Your original is untouched.',
          tone: 'ok',
          action: { label: 'Open', onClick: () => onNavigateToDeck(data.deckId) },
        });
      }
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Rebuild failed', tone: 'error' });
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <div className="shrink-0 overflow-x-auto border-b border-border bg-card/50 px-4 py-2">
      <div className="mx-auto flex max-w-7xl min-w-max items-center justify-between gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="h-4 w-4" />
          </button>

          {editingName ? (
            <input
              type="text"
              value={deckName}
              onChange={(e) => onDeckNameChange(e.target.value)}
              onBlur={onCommitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              autoFocus
              className="max-w-[220px] border-b border-primary bg-transparent text-lg font-bold outline-none"
            />
          ) : (
            <h1
              onClick={onStartEditingName}
              className="max-w-[220px] shrink-0 cursor-pointer truncate text-lg font-bold hover:text-primary"
              title={deck.name}
            >
              {deck.name}
            </h1>
          )}

          <select
            value={deck.format || 'standard'}
            onChange={(e) => onFormatChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>

          <span className="hud-number whitespace-nowrap text-xs text-muted-foreground">
            {mainCount} cards
            {saving && ' (saving...)'}
          </span>

          <div className="flex items-center gap-0.5">
            <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30">
              <UndoIcon className="h-3.5 w-3.5" />
            </button>
            <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30">
              <RedoIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {hasExplanation && (
            <button
              onClick={onToggleExplanation}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                showExplanation ? 'bg-primary/20 text-primary' : 'bg-accent text-accent-foreground hover:bg-accent/80'
              )}
              title="Toggle AI build explanation"
            >
              <SparklesIcon className="h-3 w-3" />
              AI
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-0.5" title="Target bracket">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onSetTargetBracket(n)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px]',
                  n === targetBracket ? 'bg-primary/30 text-primary' : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <select
            value={powerLevel}
            onChange={(e) => setPowerLevel(e.target.value as PowerLevel)}
            title="Power level (used by Rebuild/Optimize with model)"
            className="rounded-lg border border-border bg-background px-1.5 py-1 text-xs outline-none"
          >
            {POWER_LEVELS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <button
            onClick={runRebuildOrOptimize}
            disabled={rebuilding}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80 disabled:opacity-50"
            title={optimizeMode ? 'Uses your Arena match history via the recommendation model' : 'Not enough match history yet — builds a fresh deck instead'}
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            {rebuilding ? 'Working…' : optimizeMode ? `Optimize with model (${gamesPlayed} games)` : 'Rebuild with model'}
          </button>

          <button
            onClick={onShowVersionHistory}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
            title="Version history"
          >
            <HistoryIcon className="h-3.5 w-3.5" />
            History
          </button>

          <label className="flex cursor-pointer items-center gap-1.5" title="When on, search and AI only show cards you own">
            <span className="text-[10px] text-muted-foreground">{collectionOnly ? 'My cards' : 'All cards'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={collectionOnly}
              onClick={onToggleCollectionOnly}
              className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', collectionOnly ? 'bg-primary' : 'bg-muted')}
            >
              <span className={cn('pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', collectionOnly ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
            </button>
          </label>

          <button
            onClick={onShowPlaytest}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
          >
            <PlayIcon className="h-3.5 w-3.5" />
            Playtest
          </button>
          <button
            onClick={onBuildFromCollection}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
            title="Build a new deck using only cards from your collection"
          >
            <CollectionBuildIcon className="h-3.5 w-3.5" />
            From Collection
          </button>
          <button
            onClick={onShowImport}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ImportIcon className="h-3.5 w-3.5" />
            Import
          </button>
          <button
            onClick={onShowExport}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ExportIcon className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
