'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { PostMatchStats } from '@/lib/post-match-stats';
import { getElectronAPI } from '@/lib/electron-bridge';

// ── Stat Card Component ──────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'good' | 'warn' | 'bad';
}

function StatCard({ label, value, subtext, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    good: 'text-emerald-400',
    warn: 'text-yellow-400',
    bad: 'text-red-400',
  };

  return (
    <div className="grimoire-border rounded-lg p-3 bg-card/50">
      <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={cn('font-heading text-xl tracking-wide', variantStyles[variant])}>
        {value}
      </p>
      {subtext && (
        <p className="text-[0.6rem] text-muted-foreground mt-0.5">{subtext}</p>
      )}
    </div>
  );
}

// ── Mana Curve Bar Chart ─────────────────────────────────────────────────────

interface ManaCurveBarProps {
  cardsPlayed: string[];
  hitRate: number;
}

function ManaCurveDisplay({ hitRate }: ManaCurveBarProps) {
  const pct = Math.round(hitRate * 100);
  const barColor = pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="grimoire-border rounded-lg p-3 bg-card/50">
      <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mb-2">
        Mana Curve Hit Rate
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-heading text-sm w-10 text-right">{pct}%</span>
      </div>
      <p className="text-[0.6rem] text-muted-foreground mt-1">
        Turns with an on-curve spell played
      </p>
    </div>
  );
}

// ── Card List Section ────────────────────────────────────────────────────────

interface CardListProps {
  title: string;
  cards: string[];
  maxVisible?: number;
  emptyText?: string;
}

function CardList({ title, cards, maxVisible = 10, emptyText = 'None' }: CardListProps) {
  const [expanded, setExpanded] = useState(false);
  const displayCards = expanded ? cards : cards.slice(0, maxVisible);
  const hasMore = cards.length > maxVisible;

  return (
    <div className="grimoire-border rounded-lg p-3 bg-card/50">
      <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mb-2">
        {title}
        <span className="ml-1 text-primary/60">({cards.length})</span>
      </p>
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {displayCards.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="text-xs px-2 py-0.5 rounded bg-muted/50 text-foreground/80"
              >
                {name}
              </span>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="text-[0.65rem] text-primary/70 hover:text-primary mt-1.5 transition-colors"
            >
              {expanded ? 'Show less' : `+${cards.length - maxVisible} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface PostMatchSummaryProps {
  /** Pass stats directly (for testing or non-Electron use) */
  stats?: PostMatchStats | null;
  /** Called when user dismisses the summary */
  onDismiss?: () => void;
}

export function PostMatchSummary({ stats: propStats, onDismiss }: PostMatchSummaryProps) {
  const [stats, setStats] = useState<PostMatchStats | null>(propStats ?? null);
  const [visible, setVisible] = useState(!!propStats);

  // Listen for IPC post-match-stats events
  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.onPostMatchStats) return;

    const cleanup = api.onPostMatchStats((incoming: PostMatchStats) => {
      setStats(incoming);
      setVisible(true);
    });

    return cleanup;
  }, []);

  // Sync prop changes
  useEffect(() => {
    if (propStats) {
      setStats(propStats);
      setVisible(true);
    }
  }, [propStats]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!visible || !stats) return null;

  const isWin = stats.result === 'win';
  const resultLabel = isWin ? 'Victory' : 'Defeat';
  const resultColor = isWin ? 'text-emerald-400' : 'text-red-400';
  const resultBorder = isWin ? 'border-emerald-700/40' : 'border-red-700/40';

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className={cn('grimoire-border grimoire-page rounded-lg overflow-hidden', resultBorder)}>
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg tracking-wide text-primary">
              Post-Match Report
            </h2>
            <span className={cn('font-heading text-sm tracking-wide', resultColor)}>
              {resultLabel}
            </span>
            {stats.totalTurns > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                {stats.totalTurns} turns
              </span>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="text-xs px-3 py-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="p-4 space-y-3">
          {/* Key Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard
              label="Life Final"
              value={stats.playerLifeFinal}
              subtext={`Opp: ${stats.opponentLifeFinal}`}
              variant={isWin ? 'good' : 'bad'}
            />
            <StatCard
              label="Cards Drawn"
              value={stats.cardsDrawn.length}
            />
            <StatCard
              label="Cards Played"
              value={stats.cardsPlayed.length}
            />
            <StatCard
              label="Mulligans"
              value={stats.mulliganCount}
              variant={stats.mulliganCount > 0 ? 'warn' : 'default'}
            />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatCard
              label="Removal Used"
              value={stats.removalUsed}
              variant={stats.removalUsed > 0 ? 'good' : 'default'}
            />
            <StatCard
              label="Land Drops Missed"
              value={stats.landDropsMissed}
              variant={stats.landDropsMissed === 0 ? 'good' : stats.landDropsMissed <= 1 ? 'warn' : 'bad'}
            />
            <StatCard
              label="Avg Mana/Turn"
              value={stats.avgTurnManaSpent}
              subtext="CMC of spells / turns"
            />
          </div>

          {/* Mana Curve */}
          <ManaCurveDisplay
            cardsPlayed={stats.cardsPlayed}
            hitRate={stats.manaCurveHitRate}
          />

          {/* MVP Card */}
          {stats.mvpCard && (
            <div className="grimoire-border rounded-lg p-3 bg-card/50">
              <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mb-1">
                MVP Card
              </p>
              <p className="font-heading text-base tracking-wide text-primary">
                {stats.mvpCard}
              </p>
              <p className="text-[0.6rem] text-muted-foreground mt-0.5">
                Most played non-land card this game
              </p>
            </div>
          )}

          {/* Card Lists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CardList
              title="Cards Drawn"
              cards={stats.cardsDrawn}
              maxVisible={8}
            />
            <CardList
              title="Cards Played"
              cards={stats.cardsPlayed}
              maxVisible={8}
            />
          </div>

          <CardList
            title="Cards Not Seen"
            cards={stats.cardsNotSeen}
            maxVisible={12}
            emptyText="All deck cards were drawn"
          />
        </div>
      </div>
    </div>
  );
}
