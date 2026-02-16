'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DeckSummary {
  id: number;
  name: string;
  format: string | null;
  cardCount: number;
  updated_at: string;
  coverCard?: { image_uri_art_crop: string | null; image_uri_normal: string | null };
}

export default function HomePage() {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [stats, setStats] = useState({ totalCards: 0, uniqueCards: 0, totalValue: 0 });
  const [cardCount, setCardCount] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  useEffect(() => {
    fetch('/api/decks')
      .then((r) => r.json())
      .then((d) => setDecks(d.decks || []))
      .catch(() => {});

    fetch('/api/collection')
      .then((r) => r.json())
      .then((d) => setStats(d.stats || { totalCards: 0, uniqueCards: 0, totalValue: 0 }))
      .catch(() => {});

    fetch('/api/cards/search?q=&limit=1')
      .then((r) => r.json())
      .then((d) => setCardCount(d.total || 0))
      .catch(() => {});
  }, []);

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setSeedMessage('Downloading card database from Scryfall... This may take a minute.');
    try {
      const res = await fetch('/api/cards/seed', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setSeedMessage(`Error: ${data.error}`);
      } else {
        setSeedMessage(data.message || `Loaded ${data.count} cards`);
        setCardCount(data.count);
      }
    } catch (err) {
      setSeedMessage(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero section */}
      <div className="mb-10 text-center">
        <h1 className="mb-3 font-heading text-4xl font-bold tracking-wide text-grimoire">
          The Black Grimoire
        </h1>
        <div className="grimoire-divider mx-auto max-w-xs" />
        <p className="mt-3 text-muted-foreground italic">
          Build, analyze, and master your Magic: The Gathering decks
        </p>
      </div>

      {/* Database status */}
      {cardCount === 0 && (
        <div className="grimoire-border mb-8 bg-card/80 p-6 text-center">
          <div className="grimoire-corners">
            <h2 className="mb-1 font-heading text-lg font-semibold text-primary">Welcome, Planeswalker</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Download the complete MTG card database from Scryfall to unlock the grimoire&apos;s full power.
            </p>
            <button
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="btn-grimoire disabled:opacity-50"
            >
              {seeding ? 'Inscribing...' : 'Download Card Database'}
            </button>
            {seedMessage && (
              <p className="mt-3 text-xs text-muted-foreground">{seedMessage}</p>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/deck-builder"
          className="card-hover group grimoire-border flex items-center gap-3 bg-card/80 p-4 transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition-transform group-hover:scale-110">
            <PlusIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-heading text-sm font-semibold tracking-wide">New Deck</div>
            <div className="text-xs text-muted-foreground">Begin construction</div>
          </div>
        </Link>

        <Link
          href="/collection"
          className="card-hover group grimoire-border flex items-center gap-3 bg-card/80 p-4 transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 transition-transform group-hover:scale-110">
            <GridIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-heading text-sm font-semibold tracking-wide">Collection</div>
            <div className="text-xs text-muted-foreground">
              {stats.uniqueCards > 0 ? `${stats.uniqueCards} unique cards` : 'Import your cards'}
            </div>
          </div>
        </Link>

        <div className="grimoire-border flex items-center gap-3 bg-card/80 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/15 text-green-400">
            <DatabaseIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-heading text-sm font-semibold tracking-wide">Card Database</div>
            <div className="text-xs text-muted-foreground">
              {cardCount > 0
                ? `${cardCount.toLocaleString()} cards inscribed`
                : 'Not initialized'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {(stats.totalCards > 0 || decks.length > 0) && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Collection" value={stats.totalCards.toLocaleString()} sub="total cards" />
          <StatCard label="Unique Cards" value={stats.uniqueCards.toLocaleString()} sub="in collection" />
          <StatCard label="Est. Value" value={`$${stats.totalValue.toFixed(2)}`} sub="USD" />
          <StatCard label="Decks" value={String(decks.length)} sub="constructed" />
        </div>
      )}

      {/* Recent decks */}
      {decks.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold tracking-wide text-primary">Recent Tomes</h2>
            <Link
              href="/deck-builder"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="grimoire-divider mb-4" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.slice(0, 6).map((deck) => (
              <Link
                key={deck.id}
                href={`/deck/${deck.id}`}
                className="card-hover group relative overflow-hidden grimoire-border bg-card/80 transition-all"
              >
                {/* Cover art */}
                <div className="relative h-32 overflow-hidden bg-accent">
                  {deck.coverCard?.image_uri_art_crop ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={deck.coverCard.image_uri_art_crop}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl opacity-20">
                      &#x1F0CF;
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                </div>

                {/* Deck info */}
                <div className="p-3">
                  <div className="font-heading text-sm font-semibold tracking-wide">{deck.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{deck.cardCount} cards</span>
                    {deck.format && (
                      <>
                        <span className="text-primary/40">&#x25C6;</span>
                        <span className="capitalize">{deck.format}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {decks.length === 0 && cardCount > 0 && (
        <div className="grimoire-border bg-card/60 p-12 text-center">
          <div className="grimoire-corners">
            <div className="mb-3 text-4xl opacity-30">&#x1F0CF;</div>
            <h2 className="mb-1 font-heading text-lg font-semibold text-primary">No decks yet</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first deck or import one from MTG Arena
            </p>
            <Link
              href="/deck-builder"
              className="btn-grimoire inline-block"
            >
              Begin Your First Tome
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="grimoire-border bg-card/80 p-4">
      <div className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl font-bold text-primary">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
