'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FORMAT_LABELS, FORMATS } from '@/lib/constants';

interface DeckSummary {
  id: number;
  name: string;
  format: string | null;
  description: string | null;
  cardCount: number;
  updated_at: string;
  created_at: string;
  coverCard?: { image_uri_art_crop: string | null; image_uri_normal: string | null };
}

export default function DeckBuilderPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFormat, setNewFormat] = useState('standard');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/decks')
      .then((r) => r.json())
      .then((d) => setDecks(d.decks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), format: newFormat }),
      });
      const data = await res.json();
      if (data.deck) {
        router.push(`/deck/${data.deck.id}`);
      }
    } catch {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this deck?')) return;
    await fetch(`/api/decks/${id}`, { method: 'DELETE' });
    setDecks((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Decks</h1>
          <p className="text-sm text-muted-foreground">{decks.length} decks</p>
        </div>
        <button
          onClick={() => setShowNewDeck(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusIcon className="h-4 w-4" />
          New Deck
        </button>
      </div>

      {/* New deck form */}
      {showNewDeck && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-card p-4 animate-slide-up">
          <div className="mb-3 text-sm font-medium">Create New Deck</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Deck name..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABELS[f]}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowNewDeck(false);
                  setNewName('');
                }}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deck grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="mb-3 text-4xl opacity-30">&#x1F0CF;</div>
          <h2 className="mb-1 text-lg font-semibold">No decks yet</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first deck to start building
          </p>
          <button
            onClick={() => setShowNewDeck(true)}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Create Your First Deck
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck, i) => (
            <Link
              key={deck.id}
              href={`/deck/${deck.id}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg animate-card-enter"
              style={{ animationDelay: `${i * 50}ms` }}
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
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(deck.id, e)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 text-white/70 opacity-0 transition-all hover:bg-red-600 hover:text-white group-hover:opacity-100"
                  title="Delete deck"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="text-sm font-semibold">{deck.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{deck.cardCount} cards</span>
                  {deck.format && (
                    <>
                      <span>&#x2022;</span>
                      <span className="capitalize">{FORMAT_LABELS[deck.format] || deck.format}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}
