'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────

interface RatioHealth {
  category: string;
  label: string;
  current: number;
  target: { min: number; max: number; target: number };
  status: 'low' | 'ok' | 'high';
  color: string;
}

interface AnalysisData {
  overallScore: number;
  avgCMC: number;
  ratioHealth: RatioHealth[];
  suggestions: string[];
}

interface CoverageCard {
  cardName: string;
  inclusionRate: number;
  synergyScore: number;
  owned: boolean;
  ownedQty: number;
  role: string;
}

interface UpgradePair {
  add: { cardName: string; inclusionRate: number; synergyScore: number; role: string };
  cut: { cardName: string; role: string; reason: string } | null;
  impactEstimate: number;
}

interface CoverageData {
  overallPct: number;
  keyCardPct: number;
  totalRecommended: number;
  totalOwned: number;
  keyCardTotal: number;
  keyCardOwned: number;
  missing: CoverageCard[];
  upgrades: UpgradePair[];
}

interface DeckAnalysisPanelProps {
  deckId: number;
  format: string | null;
  isCommanderFormat: boolean;
  className?: string;
}

// ── Bracket power label ──────────────────────────────────────────────────

function getBracketLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'cEDH', color: 'text-red-400' };
  if (score >= 75) return { label: 'High Power', color: 'text-orange-400' };
  if (score >= 55) return { label: 'Tuned', color: 'text-yellow-400' };
  if (score >= 35) return { label: 'Focused', color: 'text-blue-400' };
  return { label: 'Casual', color: 'text-green-400' };
}

// ── Score ring (SVG) ─────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const bracket = getBracketLabel(score);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor =
    score >= 75 ? '#f97316' : score >= 55 ? '#eab308' : score >= 35 ? '#3b82f6' : '#22c55e';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={88} height={88} className="-rotate-90">
        <circle cx={44} cy={44} r={radius} fill="none" stroke="currentColor" strokeWidth={5} className="text-border" />
        <circle
          cx={44} cy={44} r={radius} fill="none"
          stroke={strokeColor} strokeWidth={5}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: 88, height: 88 }}>
        <span className="text-xl font-bold tabular-nums">{score}</span>
        <span className={cn('text-[10px] font-semibold', bracket.color)}>{bracket.label}</span>
      </div>
    </div>
  );
}

// ── Ratio bar ────────────────────────────────────────────────────────────

function RatioBar({ health }: { health: RatioHealth }) {
  const pct = Math.min((health.current / health.target.max) * 100, 100);
  const targetPct = (health.target.target / health.target.max) * 100;
  const statusColor =
    health.status === 'ok' ? 'bg-green-500' :
    health.status === 'low' ? 'bg-amber-500' : 'bg-red-500';
  const statusIcon =
    health.status === 'ok' ? '✓' :
    health.status === 'low' ? '↓' : '↑';

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{health.label}</span>
        <span className="font-medium tabular-nums">
          {health.current}
          <span className="text-muted-foreground/60">/{health.target.target}</span>
          <span className={cn('ml-1 text-[9px]',
            health.status === 'ok' ? 'text-green-400' :
            health.status === 'low' ? 'text-amber-400' : 'text-red-400'
          )}>{statusIcon}</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-border">
        {/* Target marker */}
        <div
          className="absolute top-0 h-1.5 w-px bg-muted-foreground/40"
          style={{ left: `${targetPct}%` }}
        />
        {/* Fill */}
        <div
          className={cn('h-1.5 rounded-full transition-all duration-500', statusColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Coverage bar ─────────────────────────────────────────────────────────

function CoverageBar({ label, owned, total, pct }: { label: string; owned: number; total: number; pct: number }) {
  const pctDisplay = Math.round(pct * 100);
  const barColor = pctDisplay >= 70 ? 'bg-green-500' : pctDisplay >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {owned}/{total} <span className="text-muted-foreground/60">({pctDisplay}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border">
        <div
          className={cn('h-1.5 rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(pctDisplay, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export function DeckAnalysisPanel({ deckId, format, isCommanderFormat, className }: DeckAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisRes, coverageRes] = await Promise.all([
        fetch(`/api/deck-analysis?deckId=${deckId}`),
        isCommanderFormat
          ? fetch(`/api/deck-analysis/coverage?deck_id=${deckId}`)
          : Promise.resolve(null),
      ]);

      if (analysisRes.ok) {
        const data = await analysisRes.json();
        setAnalysis({
          overallScore: data.overallScore ?? 0,
          avgCMC: data.avgCMC ?? 0,
          ratioHealth: data.ratioHealth ?? [],
          suggestions: data.suggestions ?? [],
        });
      }

      if (coverageRes && coverageRes.ok) {
        const data = await coverageRes.json();
        setCoverage(data.coverage ?? null);
      }
    } catch {
      // silent — panel is supplementary
    } finally {
      setLoading(false);
    }
  }, [deckId, isCommanderFormat]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (loading && !analysis) {
    return (
      <div className={cn('rounded-xl border border-border bg-card p-3', className)}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Analyzing deck...
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const bracket = getBracketLabel(analysis.overallScore);
  const nonLandHealth = analysis.ratioHealth.filter((h) => h.category !== 'land');
  const issues = nonLandHealth.filter((h) => h.status !== 'ok');

  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-accent/30"
      >
        <div className="flex items-center gap-3">
          {/* Mini score */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border">
            <span className="text-sm font-bold tabular-nums">{analysis.overallScore}</span>
          </div>
          <div>
            <div className="text-sm font-semibold">Deck Analysis</div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className={bracket.color}>{bracket.label}</span>
              {issues.length > 0 && (
                <span className="text-amber-400">{issues.length} issue{issues.length > 1 ? 's' : ''}</span>
              )}
              {coverage && (
                <span className="text-muted-foreground">
                  {Math.round(coverage.overallPct * 100)}% owned
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={cn('text-xs text-muted-foreground transition-transform', expanded && 'rotate-180')}>
          &#9660;
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-4 border-t border-border p-3 animate-slide-up">
          {/* Score ring + avg CMC */}
          <div className="flex items-center justify-center gap-6">
            <div className="relative">
              <ScoreRing score={analysis.overallScore} />
            </div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Avg CMC </span>
                <span className="font-medium">{analysis.avgCMC.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Power </span>
                <span className={cn('font-semibold', bracket.color)}>{bracket.label}</span>
              </div>
              {coverage && (
                <div>
                  <span className="text-muted-foreground">Coverage </span>
                  <span className="font-medium">{Math.round(coverage.overallPct * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Role ratio bars */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Role Balance</div>
            {nonLandHealth.map((h) => (
              <RatioBar key={h.category} health={h} />
            ))}
          </div>

          {/* Collection coverage — commander only */}
          {coverage && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Collection Coverage</div>
              <CoverageBar
                label="Overall"
                owned={coverage.totalOwned}
                total={coverage.totalRecommended}
                pct={coverage.overallPct}
              />
              <CoverageBar
                label="Key Cards (40%+)"
                owned={coverage.keyCardOwned}
                total={coverage.keyCardTotal}
                pct={coverage.keyCardPct}
              />

              {/* Missing key cards */}
              {coverage.missing.length > 0 && (
                <div className="mt-1">
                  <div className="text-[10px] text-muted-foreground mb-1">
                    Top missing cards ({coverage.missing.length})
                  </div>
                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                    {coverage.missing.slice(0, 8).map((card) => (
                      <div key={card.cardName} className="flex items-center justify-between text-[10px]">
                        <span className="truncate mr-2 text-foreground/80">{card.cardName}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground/60">
                          {Math.round(card.inclusionRate * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upgrade suggestions */}
          {coverage && coverage.upgrades.length > 0 && (
            <div className="space-y-1.5">
              <button
                onClick={() => setShowUpgrades((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Upgrade Suggestions ({coverage.upgrades.length})</span>
                <span className={cn('transition-transform', showUpgrades && 'rotate-180')}>&#9660;</span>
              </button>

              {showUpgrades && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {coverage.upgrades.slice(0, 10).map((u, i) => (
                    <div key={i} className="rounded-lg border border-border/50 p-2 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-green-500/20 px-1 py-0.5 text-green-400 font-medium">ADD</span>
                        <span className="font-medium truncate">{u.add.cardName}</span>
                        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground/60">
                          {Math.round(u.add.inclusionRate * 100)}%
                        </span>
                      </div>
                      {u.cut && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="rounded bg-red-500/20 px-1 py-0.5 text-red-400 font-medium">CUT</span>
                          <span className="truncate text-muted-foreground">{u.cut.cardName}</span>
                          <span className="ml-auto shrink-0 text-muted-foreground/50 italic">{u.cut.reason}</span>
                        </div>
                      )}
                      {u.impactEstimate > 0 && (
                        <div className="mt-0.5 text-muted-foreground/50">
                          Impact: +{u.impactEstimate}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suggestions from analysis */}
          {analysis.suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Suggestions</div>
              {analysis.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-foreground/70">
                  <span className="shrink-0 text-amber-400">!</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="w-full rounded-md bg-accent px-2 py-1 text-[10px] font-medium text-accent-foreground transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Re-analyze'}
          </button>
        </div>
      )}
    </div>
  );
}
