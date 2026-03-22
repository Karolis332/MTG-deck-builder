'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FORMAT_LABELS } from '@/lib/constants';
import {
  CATEGORY_LABELS,
  CATEGORY_BAR_COLORS,
  CATEGORY_COLORS,
  type CardCategory,
  type ClassifiedCard,
  type RatioHealth,
} from '@/lib/card-classifier';

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

interface DeckAnalysisData {
  deckId: number;
  deckName: string;
  format: string;
  commander?: string;
  totalCards: number;
  avgCMC: number;
  categories: Record<CardCategory, ClassifiedCard[]>;
  ratioHealth: RatioHealth[];
  overallScore: number;
  manaCurve: Record<string, number>;
  suggestions: string[];
  topSuggestions: Array<{ name: string; score: number; reason: string }>;
}

const ANALYSIS_FORMATS = ['brawl', 'standardbrawl', 'commander', '1v1'];

export default function DuelPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<DeckAnalysisData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<CardCategory | null>(null);

  // Build modal state
  const [showBuild, setShowBuild] = useState(false);
  const [buildName, setBuildName] = useState('');
  const [buildColors, setBuildColors] = useState<string[]>([]);
  const [buildStrategy, setBuildStrategy] = useState('');
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');

  useEffect(() => {
    fetch('/api/decks')
      .then((r) => r.json())
      .then((d) => {
        const allDecks = (d.decks || []).filter(
          (deck: DeckSummary) => ANALYSIS_FORMATS.includes(deck.format ?? '')
        );
        setDecks(allDecks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const analyzeDeck = useCallback(async (deckId: number) => {
    if (selectedDeck === deckId) {
      setSelectedDeck(null);
      setAnalysis(null);
      return;
    }
    setSelectedDeck(deckId);
    setAnalyzing(true);
    setAnalysis(null);
    setExpandedCategory(null);
    try {
      const res = await fetch(`/api/deck-analysis?deckId=${deckId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch {
      // silent
    } finally {
      setAnalyzing(false);
    }
  }, [selectedDeck]);

  const handleBuild = async () => {
    if (buildColors.length === 0) {
      setBuildError('Pick at least one color');
      return;
    }
    setBuilding(true);
    setBuildError('');
    try {
      const res = await fetch('/api/decks/auto-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: buildName.trim() || `Duel ${buildColors.join('')} ${buildStrategy || 'Deck'}`,
          format: '1v1',
          colors: buildColors,
          strategy: buildStrategy || undefined,
          useCollection: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Build failed');
      router.push(`/deck/${data.deckId}`);
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : 'Build failed');
      setBuilding(false);
    }
  };

  const toggleColor = (c: string) => {
    setBuildColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const maxCurveValue = analysis
    ? Math.max(...Object.values(analysis.manaCurve), 1)
    : 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-wide text-grimoire">
            Deck Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Synergy breakdown, ratio health, and ML-powered suggestions
          </p>
        </div>
        <button
          onClick={() => setShowBuild(true)}
          className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-heading font-medium text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_rgba(180,140,50,0.15)]"
        >
          <SparklesIcon className="h-4 w-4" />
          Generate Deck
        </button>
      </div>

      {/* Deck selector */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div className="grimoire-border bg-card/60 p-12 text-center">
          <SwordsIcon className="mx-auto mb-3 h-10 w-10 text-primary/30" />
          <h2 className="mb-1 font-heading text-lg font-semibold text-primary">No decks to analyze</h2>
          <p className="text-sm text-muted-foreground">
            Create a Brawl or Commander deck first
          </p>
        </div>
      ) : (
        <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {decks.map((deck) => (
            <button
              key={deck.id}
              onClick={() => analyzeDeck(deck.id)}
              className={cn(
                'group relative overflow-hidden rounded-xl border p-3 text-left transition-all',
                selectedDeck === deck.id
                  ? 'border-primary bg-primary/10 shadow-[0_0_16px_rgba(180,140,50,0.15)]'
                  : 'border-border/50 bg-card/60 hover:border-border hover:bg-card/80'
              )}
            >
              <div className="flex items-center gap-3">
                {deck.coverCard?.image_uri_art_crop ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={deck.coverCard.image_uri_art_crop}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                    <SwordsIcon className="h-5 w-5 text-primary/30" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-heading text-sm font-semibold tracking-wide">
                    {deck.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{deck.cardCount} cards</span>
                    <span className="text-primary/40">&bull;</span>
                    <span>{FORMAT_LABELS[deck.format ?? ''] ?? deck.format}</span>
                  </div>
                </div>
                {selectedDeck === deck.id && (
                  <ChevronIcon className="h-4 w-4 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Analysis panel */}
      {analyzing && (
        <div className="grimoire-border bg-card/80 p-8 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Analyzing deck composition...</p>
        </div>
      )}

      {analysis && !analyzing && (
        <div className="space-y-6 animate-slide-up">
          {/* Overview bar */}
          <div className="grimoire-border bg-card/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-wide text-primary">
                  {analysis.deckName}
                </h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {analysis.commander && (
                    <span className="text-primary/80">Commander: {analysis.commander}</span>
                  )}
                  <span>{analysis.totalCards} cards</span>
                  <span>Avg CMC: {analysis.avgCMC.toFixed(2)}</span>
                  <span>{FORMAT_LABELS[analysis.format] ?? analysis.format}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ScoreGauge score={analysis.overallScore} />
                <Link
                  href={`/deck/${analysis.deckId}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  Edit Deck
                </Link>
              </div>
            </div>
          </div>

          {/* Ratio health bars */}
          <div className="grimoire-border bg-card/80 p-4">
            <h3 className="mb-3 font-heading text-sm font-semibold tracking-wide text-primary/80">
              Category Ratios
            </h3>
            <div className="space-y-2">
              {analysis.ratioHealth.map((h) => (
                <button
                  key={h.category}
                  onClick={() =>
                    setExpandedCategory(
                      expandedCategory === (h.category as CardCategory) ? null : (h.category as CardCategory)
                    )
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-28 text-xs font-medium">
                      <span className={h.color}>{h.label}</span>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-5 overflow-hidden rounded-full bg-zinc-800/60">
                        {/* Target range indicator */}
                        <div
                          className="absolute inset-y-0 bg-white/5 border-l border-r border-white/10"
                          style={{
                            left: `${(h.target.min / Math.max(h.target.max * 1.5, h.current * 1.2, 1)) * 100}%`,
                            right: `${100 - (h.target.max / Math.max(h.target.max * 1.5, h.current * 1.2, 1)) * 100}%`,
                          }}
                        />
                        {/* Current value bar */}
                        <div
                          className={cn(
                            'absolute inset-y-0 left-0 rounded-full transition-all',
                            CATEGORY_BAR_COLORS[h.category as CardCategory],
                            h.status === 'low' ? 'opacity-60' : 'opacity-90'
                          )}
                          style={{
                            width: `${Math.min((h.current / Math.max(h.target.max * 1.5, h.current * 1.2, 1)) * 100, 100)}%`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                          <span className="text-[10px] font-bold text-white/90 drop-shadow">
                            {h.current}/{h.target.target}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <span
                        className={cn(
                          'inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                          h.status === 'ok'
                            ? 'bg-green-900/40 text-green-400'
                            : h.status === 'low'
                              ? 'bg-red-900/40 text-red-400'
                              : 'bg-yellow-900/40 text-yellow-400'
                        )}
                      >
                        {h.status === 'ok' ? 'Good' : h.status === 'low' ? 'Low' : 'High'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded card list */}
                  {expandedCategory === h.category && (
                    <div className="mt-2 ml-[7.75rem] mb-2 rounded-lg border border-border/30 bg-zinc-900/40 p-2">
                      <div className="flex flex-wrap gap-1">
                        {(analysis.categories[h.category as CardCategory] ?? []).map((card) => (
                          <span
                            key={card.name}
                            className={cn(
                              'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs',
                              CATEGORY_COLORS[card.primaryCategory]
                            )}
                            title={`CMC: ${card.cmc}${card.mlScore != null ? ` | ML: ${card.mlScore.toFixed(3)}` : ''}${card.synergyScore != null ? ` | Synergy: ${(card.synergyScore * 100).toFixed(0)}%` : ''}`}
                          >
                            {card.name}
                            {card.mlScore != null && (
                              <span className="text-[9px] text-primary/60">
                                {card.mlScore.toFixed(2)}
                              </span>
                            )}
                          </span>
                        ))}
                        {(analysis.categories[h.category as CardCategory] ?? []).length === 0 && (
                          <span className="text-xs text-muted-foreground italic">No cards in this category</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mana curve + Suggestions side by side */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Mana curve */}
            <div className="grimoire-border bg-card/80 p-4">
              <h3 className="mb-3 font-heading text-sm font-semibold tracking-wide text-primary/80">
                Mana Curve
              </h3>
              <div className="flex items-end gap-1" style={{ height: 120 }}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((cmc) => {
                  const count = analysis.manaCurve[String(cmc)] ?? 0;
                  const height = maxCurveValue > 0 ? (count / maxCurveValue) * 100 : 0;
                  return (
                    <div key={cmc} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {count || ''}
                      </span>
                      <div
                        className="w-full rounded-t bg-primary/70 transition-all"
                        style={{ height: `${height}%`, minHeight: count > 0 ? 4 : 0 }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {cmc === 7 ? '7+' : cmc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suggestions */}
            <div className="grimoire-border bg-card/80 p-4">
              <h3 className="mb-3 font-heading text-sm font-semibold tracking-wide text-primary/80">
                Optimization Notes
              </h3>
              {analysis.suggestions.length > 0 ? (
                <ul className="space-y-1.5">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <WarningIcon className="mt-0.5 h-3 w-3 shrink-0 text-yellow-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-green-400">All ratios within healthy range.</p>
              )}
            </div>
          </div>

          {/* ML Top Suggestions */}
          {analysis.topSuggestions.length > 0 && (
            <div className="grimoire-border bg-card/80 p-4">
              <h3 className="mb-3 font-heading text-sm font-semibold tracking-wide text-primary/80">
                ML-Suggested Additions
              </h3>
              <p className="mb-3 text-[10px] text-muted-foreground">
                Cards scored by the trained model that are not in this deck. Higher score = stronger predicted performance.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.topSuggestions.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-zinc-900/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{s.name}</div>
                      {s.reason && (
                        <div className="truncate text-[10px] text-muted-foreground">{s.reason}</div>
                      )}
                    </div>
                    <div className="ml-2 shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-xs font-bold text-primary">
                      {s.score.toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full card list by category */}
          <div className="grimoire-border bg-card/80 p-4">
            <h3 className="mb-3 font-heading text-sm font-semibold tracking-wide text-primary/80">
              Full Breakdown
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.entries(analysis.categories) as [CardCategory, ClassifiedCard[]][])
                .filter(([, cards]) => cards.length > 0)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([cat, cards]) => (
                  <div key={cat} className="rounded-lg border border-border/20 bg-zinc-900/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn('text-xs font-bold', CATEGORY_COLORS[cat].split(' ')[1])}>
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{cards.length} cards</span>
                    </div>
                    <div className="space-y-0.5">
                      {cards
                        .sort((a, b) => (b.mlScore ?? 0) - (a.mlScore ?? 0))
                        .map((card) => (
                          <div
                            key={card.name}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span className="truncate text-foreground/80">{card.name}</span>
                            <div className="ml-2 flex shrink-0 items-center gap-1">
                              {card.synergyScore != null && card.synergyScore > 0 && (
                                <span className="text-purple-400" title="Commander synergy">
                                  S:{(card.synergyScore * 100).toFixed(0)}
                                </span>
                              )}
                              {card.mlScore != null && (
                                <span className="text-primary/70" title="ML predicted score">
                                  {card.mlScore.toFixed(2)}
                                </span>
                              )}
                              <span className="text-muted-foreground">{card.cmc}cmc</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Generate Deck Modal */}
      {showBuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBuild(false)} />
          <div className="relative w-full max-w-md grimoire-border bg-card/95 p-6 shadow-2xl animate-slide-up backdrop-blur-sm">
            <h2 className="mb-4 font-heading text-lg font-semibold tracking-wide text-primary">
              Generate Deck
            </h2>
            <input
              type="text"
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
              placeholder="Deck name (optional)..."
              className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <div className="mb-3">
              <label className="mb-1 block text-xs text-muted-foreground">Colors</label>
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
                      buildColors.includes(code)
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
            <div className="mb-3">
              <label className="mb-1 block text-xs text-muted-foreground">Strategy (optional)</label>
              <div className="flex flex-wrap gap-2">
                {['aggro', 'midrange', 'control', 'combo', 'tempo', 'burn'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setBuildStrategy(buildStrategy === s ? '' : s)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                      buildStrategy === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground hover:bg-accent/80'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {buildError && (
              <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {buildError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowBuild(false); setBuildError(''); }}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleBuild}
                disabled={building || buildColors.length === 0}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {building ? 'Building...' : 'Generate Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Score gauge component ─────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  const bgColor =
    score >= 80 ? 'bg-green-900/30' : score >= 60 ? 'bg-yellow-900/30' : 'bg-red-900/30';
  return (
    <div className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5', bgColor)}>
      <span className={cn('text-lg font-bold font-heading', color)}>{score}</span>
      <span className="text-[10px] text-muted-foreground">/100</span>
    </div>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  );
}

function SwordsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
      <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
      <path d="M11 19l-6-6" />
      <path d="M8 16l-4 4" />
      <path d="M5 21l-2-2" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
