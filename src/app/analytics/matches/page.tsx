'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MatchDetailModal } from '@/components/match-detail-modal';

interface ArenaMatch {
  id: number;
  match_id: string;
  player_name: string | null;
  opponent_name: string | null;
  result: string;
  format: string | null;
  turns: number;
  deck_id: number | null;
  deck_match_confidence: number | null;
  deck_cards: string | null;
  parsed_at: string;
}

interface Deck {
  id: number;
  name: string;
  format: string | null;
}

export default function MatchLinkingPage() {
  const [matches, setMatches] = useState<ArenaMatch[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unlinked' | 'linked'>('all');
  const [autoLinkResult, setAutoLinkResult] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [matchRes, deckRes] = await Promise.all([
        fetch('/api/arena-matches'),
        fetch('/api/decks'),
      ]);
      const matchData = await matchRes.json();
      const deckData = await deckRes.json();

      if (matchData.error) setError(matchData.error);
      else setMatches(matchData.matches || []);

      setDecks(deckData.decks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAutoLink = async () => {
    setAutoLinkResult(null);
    try {
      const res = await fetch('/api/arena-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-link' }),
      });
      const data = await res.json();
      setAutoLinkResult(`Linked ${data.linked} of ${data.total} unlinked matches`);
      fetchData();
    } catch {
      setAutoLinkResult('Auto-link failed');
    }
  };

  const handleManualLink = async (matchId: string, deckId: number) => {
    try {
      await fetch('/api/arena-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', matchId, deckId }),
      });
      fetchData();
    } catch {
      // silent
    }
  };

  const handleUnlink = async (matchId: string) => {
    try {
      await fetch('/api/arena-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink', matchId }),
      });
      fetchData();
    } catch {
      // silent
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (filter === 'unlinked') return !m.deck_id;
    if (filter === 'linked') return !!m.deck_id;
    return true;
  });

  const getDeckName = (deckId: number | null) => {
    if (!deckId) return null;
    return decks.find((d) => d.id === deckId)?.name || `Deck ${deckId}`;
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link href="/analytics" className="mb-2 inline-block text-xs text-muted-foreground hover:text-foreground">
          &larr; Back to Analytics
        </Link>
        <h1 className="text-2xl font-bold">Arena Match Linking</h1>
        <p className="text-sm text-muted-foreground">
          Link Arena matches to your saved decks for per-deck analytics
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleAutoLink}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Auto-Link All
        </button>

        <div className="flex rounded-lg border border-border">
          {(['all', 'unlinked', 'linked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground">
          {filteredMatches.length} matches
        </span>

        {autoLinkResult && (
          <span className="text-xs text-green-400">{autoLinkResult}</span>
        )}
      </div>

      {/* Matches List */}
      <div className="space-y-2">
        {filteredMatches.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No matches found
          </div>
        )}

        {filteredMatches.map((match) => (
          <div
            key={match.id}
            className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-accent/20"
            onClick={() => setSelectedMatchId(match.match_id)}
          >
            {/* Result badge */}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                match.result === 'win'
                  ? 'bg-green-500/10 text-green-400'
                  : match.result === 'loss'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}
            >
              {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D'}
            </div>

            {/* Match info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  vs {match.opponent_name || 'Unknown'}
                </span>
                {match.format && (
                  <span className="rounded bg-accent/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {match.format}
                  </span>
                )}
                {match.turns > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {match.turns} turns
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(match.parsed_at).toLocaleString()}
              </div>
            </div>

            {/* Deck link */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {match.deck_id ? (
                <>
                  <div className="text-right">
                    <div className="text-xs font-medium text-green-400">
                      {getDeckName(match.deck_id)}
                    </div>
                    {match.deck_match_confidence != null && match.deck_match_confidence < 1 && (
                      <div className="text-[10px] text-muted-foreground">
                        {Math.round(match.deck_match_confidence * 100)}% match
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnlink(match.match_id)}
                    className="rounded-lg p-1.5 text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Unlink"
                  >
                    &times;
                  </button>
                </>
              ) : (
                <select
                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleManualLink(match.match_id, parseInt(e.target.value, 10));
                    }
                  }}
                >
                  <option value="" disabled>
                    Link to deck...
                  </option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.format || 'any'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Match Detail Modal */}
      {selectedMatchId && (
        <MatchDetailModal
          matchId={selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className || ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
