'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DeckInfo {
  id: number;
  name: string;
  format: string | null;
  card_count?: number;
}

interface DeckPickerOverlayProps {
  isOpen: boolean;
  matchId: string;
  format: string | null;
  onSelect: (deck: DeckInfo) => void;
  onDismiss: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  standard: 'STD',
  pioneer: 'PIO',
  modern: 'MOD',
  legacy: 'LEG',
  vintage: 'VIN',
  commander: 'EDH',
  standardbrawl: 'SBRL',
  brawl: 'BRL',
  pauper: 'PAU',
  historic: 'HIS',
  alchemy: 'ALC',
  explorer: 'EXP',
};

function inferFormatFilter(arenaFormat: string | null): string[] {
  if (!arenaFormat) return [];
  const f = arenaFormat.toLowerCase();
  if (f.includes('brawl') || f.includes('commander')) return ['commander', 'brawl', 'standardbrawl'];
  if (f.includes('standard')) return ['standard', 'standardbrawl'];
  if (f.includes('historic')) return ['historic', 'brawl'];
  if (f.includes('alchemy')) return ['alchemy'];
  if (f.includes('explorer')) return ['explorer'];
  return [];
}

const COUNTDOWN_SECONDS = 30;

export function DeckPickerOverlay({ isOpen, matchId, format, onSelect, onDismiss }: DeckPickerOverlayProps) {
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [preferredDeckId, setPreferredDeckId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch decks and preference on open
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    Promise.all([
      fetch('/api/decks').then(r => r.json()),
      fetch('/api/game-deck-preference').then(r => r.json()),
    ]).then(([decksData, prefData]) => {
      const allDecks: DeckInfo[] = decksData.decks || [];
      setDecks(allDecks);
      setPreferredDeckId(prefData.deckId);
      setLoading(false);

      // Pre-select preferred deck
      if (prefData.deckId) {
        const idx = allDecks.findIndex((d: DeckInfo) => d.id === prefData.deckId);
        if (idx >= 0) setFocusedIndex(idx);
      }
    }).catch(() => setLoading(false));

    // Focus search on open
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(COUNTDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, onDismiss]);

  // Filter decks
  const formatFilter = inferFormatFilter(format);
  const filtered = decks.filter(d => {
    if (search) {
      const s = search.toLowerCase();
      if (!d.name.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Sort: matching format first, then preferred deck first
  const sorted = [...filtered].sort((a, b) => {
    // Preferred deck always first
    if (a.id === preferredDeckId) return -1;
    if (b.id === preferredDeckId) return 1;

    // Format match next
    const aMatch = formatFilter.length === 0 || (a.format && formatFilter.includes(a.format));
    const bMatch = formatFilter.length === 0 || (b.format && formatFilter.includes(b.format));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;

    return 0;
  });

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, sorted.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && sorted[focusedIndex]) {
      e.preventDefault();
      onSelect(sorted[focusedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onDismiss();
    }
  }, [sorted, focusedIndex, onSelect, onDismiss]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <div className="grimoire-border grimoire-page w-[420px] max-h-[70vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border">
          <h2 className="font-heading text-lg tracking-wide text-primary text-center">
            Select Active Deck
          </h2>
          {format && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              Detected format: {format}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search decks..."
            value={search}
            onChange={e => { setSearch(e.target.value); setFocusedIndex(0); }}
            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Deck list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground text-sm">Loading decks...</span>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground text-sm">No decks found</span>
            </div>
          ) : (
            sorted.map((deck, i) => {
              const isFormatMatch = formatFilter.length === 0 || (deck.format && formatFilter.includes(deck.format));
              const isPreferred = deck.id === preferredDeckId;
              const isFocused = i === focusedIndex;

              return (
                <button
                  key={deck.id}
                  onClick={() => onSelect(deck)}
                  onMouseEnter={() => setFocusedIndex(i)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-md mb-1 flex items-center gap-3 transition-colors',
                    isFocused
                      ? 'bg-primary/15 border border-primary/30'
                      : 'hover:bg-card/80 border border-transparent',
                    !isFormatMatch && 'opacity-50'
                  )}
                >
                  {/* Format badge */}
                  <span className={cn(
                    'text-[0.6rem] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider',
                    isFormatMatch
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {FORMAT_LABELS[deck.format || ''] || deck.format || '?'}
                  </span>

                  {/* Deck name */}
                  <span className="font-heading text-sm truncate flex-1">
                    {deck.name}
                  </span>

                  {/* Preferred indicator */}
                  {isPreferred && (
                    <span className="text-[0.6rem] text-primary/60 shrink-0">LAST USED</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer with countdown + skip */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Auto-dismiss in {timeLeft}s
          </span>
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Countdown bar */}
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-primary/40 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / COUNTDOWN_SECONDS) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
