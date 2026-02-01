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

  // AI build state
  const [showAiBuild, setShowAiBuild] = useState(false);
  const [aiName, setAiName] = useState('');
  const [aiFormat, setAiFormat] = useState('standard');
  const [aiColors, setAiColors] = useState<string[]>([]);
  const [aiStrategy, setAiStrategy] = useState('');
  const [aiUseCollection, setAiUseCollection] = useState(true);
  const [aiBuilding, setAiBuilding] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiCommander, setAiCommander] = useState('');
  const [commanderSearch, setCommanderSearch] = useState('');
  const [commanderResults, setCommanderResults] = useState<Array<{ id: string; name: string; image_uri_small: string | null; color_identity: string | null; type_line: string }>>([]);
  const [commanderSearching, setCommanderSearching] = useState(false);

  const isAiCommanderFormat = ['commander', 'brawl', 'standardbrawl'].includes(aiFormat);

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

  const searchCommanders = async (query: string) => {
    setCommanderSearch(query);
    if (query.length < 2) { setCommanderResults([]); return; }
    setCommanderSearching(true);
    try {
      const res = await fetch(`/api/cards/search?q=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      const filtered = (data.cards || []).filter((c: { type_line: string }) =>
        c.type_line.includes('Legendary') && (c.type_line.includes('Creature') || c.type_line.includes('Planeswalker'))
      );
      setCommanderResults(filtered.slice(0, 6));
    } catch {} finally {
      setCommanderSearching(false);
    }
  };

  const selectCommander = (card: typeof commanderResults[0]) => {
    setAiCommander(card.name);
    setCommanderSearch('');
    setCommanderResults([]);
    // Auto-set colors from commander's color identity
    if (card.color_identity) {
      try {
        const ci: string[] = JSON.parse(card.color_identity);
        setAiColors(ci);
      } catch {}
    }
  };

  const handleAiBuild = async () => {
    if (isAiCommanderFormat && !aiCommander) {
      setAiError('Select a commander first');
      return;
    }
    if (!isAiCommanderFormat && aiColors.length === 0) {
      setAiError('Pick at least one color');
      return;
    }
    setAiBuilding(true);
    setAiError('');
    try {
      const res = await fetch('/api/decks/auto-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: aiName.trim() || (aiCommander ? `${aiCommander} Deck` : `AI ${aiColors.join('')} ${aiStrategy || 'Deck'}`),
          format: aiFormat,
          colors: aiColors,
          strategy: aiStrategy || undefined,
          useCollection: aiUseCollection,
          commanderName: isAiCommanderFormat ? aiCommander : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Build failed');
      router.push(`/deck/${data.deckId}`);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Build failed');
      setAiBuilding(false);
    }
  };

  const toggleColor = (c: string) => {
    setAiColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiBuild(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/80"
          >
            <SparklesIcon className="h-4 w-4" />
            AI Build
          </button>
          <button
            onClick={() => setShowNewDeck(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlusIcon className="h-4 w-4" />
            New Deck
          </button>
        </div>
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

      {/* AI Build Modal */}
      {showAiBuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiBuild(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-slide-up">
            <h2 className="mb-4 text-lg font-semibold">AI Deck Builder</h2>

            {/* Deck name */}
            <input
              type="text"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              placeholder="Deck name (optional)..."
              className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />

            {/* Format */}
            <div className="mb-3">
              <label className="mb-1 block text-xs text-muted-foreground">Format</label>
              <select
                value={aiFormat}
                onChange={(e) => setAiFormat(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                ))}
              </select>
            </div>

            {/* Commander search (for commander formats) */}
            {isAiCommanderFormat && (
              <div className="mb-3">
                <label className="mb-1 block text-xs text-muted-foreground">Commander</label>
                {aiCommander ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <span className="text-sm font-medium">{aiCommander}</span>
                    <button
                      onClick={() => { setAiCommander(''); setAiColors([]); }}
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={commanderSearch}
                      onChange={(e) => searchCommanders(e.target.value)}
                      placeholder="Search for a legendary creature..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                    />
                    {commanderResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card shadow-xl">
                        {commanderResults.map((card) => (
                          <button
                            key={card.id}
                            onClick={() => selectCommander(card)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            {card.image_uri_small && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={card.image_uri_small} alt="" className="h-8 w-6 rounded-sm object-cover" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{card.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{card.type_line}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {commanderSearching && (
                      <div className="absolute right-3 top-2.5 text-xs text-muted-foreground">Searching...</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Colors */}
            <div className="mb-3">
              <label className="mb-1 block text-xs text-muted-foreground">
                {isAiCommanderFormat ? 'Colors (auto-set from commander)' : 'Colors'}
              </label>
              <div className="flex gap-2">
                {[
                  { code: 'W', label: 'White', bg: 'bg-amber-50 text-amber-900 border-amber-300' },
                  { code: 'U', label: 'Blue', bg: 'bg-blue-600 text-white border-blue-400' },
                  { code: 'B', label: 'Black', bg: 'bg-zinc-800 text-zinc-100 border-zinc-600' },
                  { code: 'R', label: 'Red', bg: 'bg-red-600 text-white border-red-400' },
                  { code: 'G', label: 'Green', bg: 'bg-green-700 text-white border-green-500' },
                ].map(({ code, label, bg }) => (
                  <button
                    key={code}
                    onClick={() => toggleColor(code)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all',
                      aiColors.includes(code)
                        ? `${bg} scale-110 shadow-md`
                        : 'border-border bg-accent/30 text-muted-foreground hover:border-border/80'
                    )}
                    title={label}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy */}
            <div className="mb-3">
              <label className="mb-1 block text-xs text-muted-foreground">Strategy (optional)</label>
              <div className="flex flex-wrap gap-2">
                {['aggro', 'midrange', 'control', 'combo'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setAiStrategy(aiStrategy === s ? '' : s)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                      aiStrategy === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground hover:bg-accent/80'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Use collection toggle */}
            <label className="mb-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={aiUseCollection}
                onChange={(e) => setAiUseCollection(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-muted-foreground">Prefer cards from my collection</span>
            </label>

            {aiError && (
              <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {aiError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAiBuild(false); setAiError(''); }}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAiBuild}
                disabled={aiBuilding || aiColors.length === 0}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {aiBuilding ? 'Building...' : 'Build Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
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
