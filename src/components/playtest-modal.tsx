'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { DbCard } from '@/lib/types';

interface DeckEntry {
  card_id: string;
  quantity: number;
  board: string;
  card: DbCard;
}

interface PlaytestModalProps {
  open: boolean;
  onClose: () => void;
  cards: DeckEntry[];
  deckName: string;
}

function buildPool(cards: DeckEntry[]): DbCard[] {
  const pool: DbCard[] = [];
  for (const entry of cards) {
    if (entry.board !== 'main' && entry.board !== 'commander') continue;
    for (let i = 0; i < entry.quantity; i++) {
      pool.push(entry.card);
    }
  }
  return pool;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PlaytestModal({ open, onClose, cards, deckName }: PlaytestModalProps) {
  const pool = useMemo(() => buildPool(cards), [cards]);

  const [hand, setHand] = useState<DbCard[]>([]);
  const [library, setLibrary] = useState<DbCard[]>([]);
  const [mulliganCount, setMulliganCount] = useState(0);
  const [started, setStarted] = useState(false);

  const drawNewHand = useCallback(
    (mulligans: number = 0) => {
      const shuffled = shuffle(pool);
      const handSize = Math.max(7 - mulligans, 1);
      setHand(shuffled.slice(0, handSize));
      setLibrary(shuffled.slice(handSize));
      setMulliganCount(mulligans);
      setStarted(true);
    },
    [pool]
  );

  const handleMulligan = useCallback(() => {
    drawNewHand(mulliganCount + 1);
  }, [drawNewHand, mulliganCount]);

  const handleDrawCard = useCallback(() => {
    if (library.length === 0) return;
    setHand((prev) => [...prev, library[0]]);
    setLibrary((prev) => prev.slice(1));
  }, [library]);

  const handleReset = useCallback(() => {
    setHand([]);
    setLibrary([]);
    setMulliganCount(0);
    setStarted(false);
  }, []);

  if (!open) return null;

  const landCount = hand.filter((c) => c.type_line.includes('Land')).length;
  const nonLandCount = hand.length - landCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold">Playtest: {deckName}</h2>
            <p className="text-xs text-muted-foreground">
              {pool.length} cards in deck
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {!started ? (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 text-4xl opacity-40">&#x1F0CF;</div>
              <p className="mb-4 text-sm text-muted-foreground">
                Draw an opening hand of 7 cards from your shuffled deck
              </p>
              <button
                onClick={() => drawNewHand(0)}
                disabled={pool.length < 7}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Draw Opening Hand
              </button>
              {pool.length < 7 && (
                <p className="mt-2 text-xs text-red-400">
                  Need at least 7 cards in maindeck to playtest
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div className="mb-4 flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">
                  Hand: <span className="font-medium text-foreground">{hand.length}</span>
                </span>
                <span className="text-muted-foreground">
                  Lands: <span className="font-medium text-green-500">{landCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Non-lands: <span className="font-medium text-blue-500">{nonLandCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Library: <span className="font-medium text-foreground">{library.length}</span>
                </span>
                {mulliganCount > 0 && (
                  <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-yellow-500">
                    Mulligan x{mulliganCount}
                  </span>
                )}
              </div>

              {/* Hand display */}
              <div className="mb-4 flex flex-wrap justify-center gap-2">
                {hand.map((card, i) => (
                  <div
                    key={`${card.id}-${i}`}
                    className="group relative transition-transform hover:-translate-y-1"
                  >
                    {card.image_uri_normal ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image_uri_normal}
                        alt={card.name}
                        className="h-[180px] w-auto rounded-lg shadow-lg"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-[180px] w-[130px] items-center justify-center rounded-lg border border-border bg-accent p-2 text-center text-[10px]">
                        {card.name}
                      </div>
                    )}
                    {/* Card name tooltip */}
                    <div className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {card.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleMulligan}
                  disabled={mulliganCount >= 6}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                >
                  Mulligan to {Math.max(7 - mulliganCount - 1, 1)}
                </button>
                <button
                  onClick={handleDrawCard}
                  disabled={library.length === 0}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                >
                  Draw Card
                </button>
                <button
                  onClick={() => drawNewHand(0)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
                >
                  New Hand
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
