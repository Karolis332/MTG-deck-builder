'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

interface AnalyticsData {
  win_rates: Record<string, {
    total_games: number; wins: number; losses: number; draws: number; win_rate: number;
  }>;
  deck_performance: { decks: Array<{
    deck_id: number; deck_name: string; format: string;
    total_games: number; wins: number; win_rate: number;
  }> };
  card_performance: {
    top: Array<{ card_name: string; format: string; games_played: number; win_rate: number; rating: number }>;
    bottom: Array<{ card_name: string; format: string; games_played: number; win_rate: number; rating: number }>;
  };
  mana_curve: Record<string, number>;
  color_distribution: Record<string, number>;
  type_distribution: Record<string, number>;
  games_over_time: { days: Array<{ date: string; games: number; wins: number; win_rate: number }> };
  last_updated: string | null;
}

const COLOR_MAP: Record<string, string> = {
  W: '#E8D5A3', U: '#1A7FC4', B: '#4A3A2A', R: '#D3202A', G: '#00733E', C: '#888888',
};
const COLOR_NAMES: Record<string, string> = {
  W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
};
const TYPE_COLORS: Record<string, string> = {
  Creature: '#22c55e', Instant: '#3b82f6', Sorcery: '#ef4444',
  Artifact: '#a855f7', Enchantment: '#eab308', Planeswalker: '#f97316',
  Land: '#6b7280', Other: '#64748b',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasMatches = Object.keys(data.win_rates).length > 0;
  const hasDecks = data.deck_performance.decks.length > 0;
  const hasManaCurve = Object.keys(data.mana_curve).length > 0;
  const hasColors = Object.values(data.color_distribution).some((v) => v > 0);
  const hasTypes = Object.values(data.type_distribution).some((v) => v > 0);
  const hasTimeline = data.games_over_time.days.length > 0;
  const hasCardPerf = data.card_performance.top.length > 0;

  const manaCurveData = Object.entries(data.mana_curve)
    .map(([cmc, count]) => ({ cmc: cmc === '7' ? '7+' : cmc, count }))
    .sort((a, b) => parseInt(a.cmc) - parseInt(b.cmc));

  const colorData = Object.entries(data.color_distribution)
    .filter(([, v]) => v > 0)
    .map(([color, value]) => ({ name: COLOR_NAMES[color] || color, value, color: COLOR_MAP[color] || '#888' }));

  const typeData = Object.entries(data.type_distribution)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({ name: type, value, color: TYPE_COLORS[type] || '#888' }));

  const isEmpty = !hasMatches && !hasManaCurve && !hasColors;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-wide text-grimoire">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Deck statistics, match history, and card performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data.last_updated && (
            <span className="text-xs text-muted-foreground">
              Updated {new Date(data.last_updated).toLocaleString()}
            </span>
          )}
          <Link
            href="/analytics/matches"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Match Linking
          </Link>
        </div>
      </div>

      {isEmpty && (
        <div className="grimoire-border bg-card/60 p-12 text-center">
          <div className="grimoire-corners">
            <div className="mb-3 text-4xl opacity-30">&#x1F4CA;</div>
            <h2 className="mb-1 font-heading text-lg font-semibold text-primary">No data yet</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Build some decks and log matches to see analytics here.
            </p>
            <Link
              href="/deck-builder"
              className="btn-grimoire inline-block"
            >
              Build a Deck
            </Link>
          </div>
        </div>
      )}

      {/* Win Rate Summary Cards */}
      {hasMatches && (
        <div className="mb-6">
          <h2 className="mb-3 font-heading text-lg font-semibold tracking-wide text-primary">Win Rates by Format</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data.win_rates).map(([fmt, stats]) => {
              const wrColor = stats.win_rate > 55
                ? 'text-green-400'
                : stats.win_rate >= 45
                  ? 'text-yellow-400'
                  : 'text-red-400';
              const wrBorder = stats.win_rate > 55
                ? 'border-green-500/30'
                : stats.win_rate >= 45
                  ? 'border-yellow-500/30'
                  : 'border-red-500/30';
              return (
                <div key={fmt} className={`grimoire-border bg-card/80 p-4 ${wrBorder}`}>
                  <div className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">{fmt}</div>
                  <div className={`text-2xl font-bold ${wrColor}`}>{stats.win_rate}%</div>
                  <div className="text-[10px] text-muted-foreground">
                    {stats.wins}W / {stats.losses}L / {stats.draws}D ({stats.total_games} games)
                  </div>
                  {/* Win rate visual bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-accent">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stats.win_rate > 55 ? 'bg-green-500' : stats.win_rate >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(stats.win_rate, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Games Over Time */}
      {hasTimeline && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Games Over Time (30 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.games_over_time.days}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="games" stroke="hsl(var(--primary))" name="Games" strokeWidth={2} />
              <Line type="monotone" dataKey="wins" stroke="#22c55e" name="Wins" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent match sparkline */}
      {hasTimeline && data.games_over_time.days.length >= 3 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Recent Results (last {Math.min(data.games_over_time.days.length, 20)} days)</h2>
          <div className="flex items-end gap-px" style={{ height: 28 }}>
            {data.games_over_time.days.slice(-20).map((day, i) => {
              const maxGames = Math.max(...data.games_over_time.days.slice(-20).map((d) => d.games), 1);
              const height = (day.games / maxGames) * 100;
              const wr = day.games > 0 ? (day.wins / day.games) * 100 : 0;
              const barColor = day.games === 0
                ? 'bg-accent'
                : wr > 55
                  ? 'bg-green-500'
                  : wr >= 45
                    ? 'bg-yellow-500'
                    : 'bg-red-500';
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${barColor}`}
                  style={{ height: `${Math.max(height, day.games > 0 ? 15 : 4)}%` }}
                  title={`${day.date}: ${day.wins}W/${day.games - day.wins}L (${day.games > 0 ? Math.round(wr) : 0}%)`}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
            <span>{data.games_over_time.days.slice(-20)[0]?.date.slice(5)}</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />&gt;55%</span>
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" />45-55%</span>
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />&lt;45%</span>
            </div>
            <span>{data.games_over_time.days[data.games_over_time.days.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Mana Curve */}
        {hasManaCurve && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Mana Curve (All Decks)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={manaCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="cmc" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Color Distribution */}
        {hasColors && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Color Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={colorData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {colorData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Type Distribution */}
        {hasTypes && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Card Type Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {typeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Deck Performance */}
        {hasDecks && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Deck Performance</h2>
            <div className="space-y-2">
              {data.deck_performance.decks.slice(0, 10).map((deck) => (
                <Link
                  key={deck.deck_id}
                  href={`/deck/${deck.deck_id}`}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{deck.deck_name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">
                      {deck.format} &middot; {deck.total_games} games &middot; {deck.wins}W
                    </div>
                  </div>
                  {/* Mini win-rate bar */}
                  <div className="hidden w-16 sm:block">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                      <div
                        className={`h-full rounded-full ${
                          deck.win_rate > 55 ? 'bg-green-500' : deck.win_rate >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(deck.win_rate, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${
                    deck.win_rate > 55 ? 'text-green-400' : deck.win_rate >= 45 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {deck.win_rate}%
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Performance Tables */}
      {hasCardPerf && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-green-400">Top Performing Cards</h2>
            <div className="space-y-1">
              {data.card_performance.top.slice(0, 10).map((card, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                  <span className="truncate">{card.card_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{card.games_played}g</span>
                    <span className="font-bold text-green-400">{card.win_rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-red-400">Underperforming Cards</h2>
            <div className="space-y-1">
              {data.card_performance.bottom.slice(0, 10).map((card, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                  <span className="truncate">{card.card_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{card.games_played}g</span>
                    <span className="font-bold text-red-400">{card.win_rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
