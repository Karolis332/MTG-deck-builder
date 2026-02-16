'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MatchLog {
  id: number;
  deck_id: number | null;
  result: 'win' | 'loss' | 'draw';
  play_draw: 'play' | 'draw' | null;
  opponent_name: string | null;
  opponent_deck_colors: string | null;
  turns: number | null;
  my_life_end: number | null;
  opponent_life_end: number | null;
  my_cards_seen: string | null;
  opponent_cards_seen: string | null;
  notes: string | null;
  game_format: string | null;
  created_at: string;
  source?: 'manual' | 'arena';
}

interface MatchStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  avg_turns: number | null;
}

interface AnalysisInsight {
  type: string;
  cardName?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  suggestion?: string;
}

interface CardPerf {
  name: string;
  winRate: number;
  appearances: number;
  verdict: 'strong' | 'neutral' | 'weak';
}

interface MatchupData {
  colors: string;
  wins: number;
  losses: number;
  winRate: number;
}

interface SwapSuggestion {
  cut: string;
  reason: string;
  addCandidates: string[];
}

interface TurnStat {
  name: string;
  byTurn: Record<number, { wins: number; total: number; winRate: number }>;
  overallWinRate: number;
}

interface Analysis {
  insights: AnalysisInsight[];
  cardPerformance: CardPerf[];
  matchupBreakdown: MatchupData[];
  overallStats: {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    avgTurns: number;
    playWinRate: number;
    drawWinRate: number;
  };
  swapSuggestions: SwapSuggestion[];
  turnStats: TurnStat[];
}

interface MatchLogPanelProps {
  deckId: number;
  format: string | null;
  className?: string;
}

export function MatchLogPanel({ deckId, format, className }: MatchLogPanelProps) {
  const [logs, setLogs] = useState<MatchLog[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [rawLog, setRawLog] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'games' | 'insights' | 'cards'>('games');

  useEffect(() => {
    const saved = localStorage.getItem('mtg_player_name');
    if (saved) setPlayerName(saved);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/match-logs?deck_id=${deckId}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setStats(data.stats || null);
    } catch {}
  };

  const fetchAnalysis = async () => {
    try {
      const res = await fetch(`/api/match-logs/analyze?deck_id=${deckId}`);
      const data = await res.json();
      if (data.insights) setAnalysis(data);
    } catch {}
  };

  useEffect(() => {
    fetchLogs();
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const handleUpload = async () => {
    if (!rawLog.trim() || !playerName.trim()) return;
    localStorage.setItem('mtg_player_name', playerName.trim());

    setUploading(true);
    try {
      const res = await fetch('/api/match-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_id: deckId,
          raw_log: rawLog,
          player_name: playerName.trim(),
          game_format: format,
        }),
      });
      const data = await res.json();
      if (data.log) {
        setRawLog('');
        setShowUpload(false);
        fetchLogs();
        // Use the analysis returned from the upload
        if (data.analysis) {
          setAnalysis(data.analysis);
          // Auto-switch to insights tab so the user sees the feedback
          setActiveTab('insights');
        }
      }
    } catch {} finally {
      setUploading(false);
    }
  };

  const deleteLog = async (id: number) => {
    try {
      await fetch(`/api/match-logs?id=${id}`, { method: 'DELETE' });
      fetchLogs();
      fetchAnalysis();
    } catch {}
  };

  const winRate = stats && stats.total > 0
    ? Math.round((stats.wins / stats.total) * 100)
    : null;

  const hasInsights = analysis && analysis.insights.length > 0;

  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ChartIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Match Tracker</span>
          {stats && stats.total > 0 && (
            <span className="text-xs text-muted-foreground">
              {stats.total} games
            </span>
          )}
          {hasInsights && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[9px] font-bold text-amber-500">
              {analysis!.insights.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {stats && stats.total > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-green-500">{stats.wins}W</span>
              <span className="font-medium text-red-500">{stats.losses}L</span>
              {stats.draws > 0 && (
                <span className="font-medium text-yellow-500">{stats.draws}D</span>
              )}
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-bold',
                  winRate !== null && winRate >= 50
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-red-500/10 text-red-500'
                )}
              >
                {winRate}%
              </span>
            </div>
          )}
          <ChevronIcon className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Upload button row */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex gap-1">
              {(['games', 'insights', 'cards'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'games' ? 'Games' : tab === 'insights' ? 'AI Insights' : 'Card Stats'}
                  {tab === 'insights' && hasInsights && (
                    <span className="ml-1 text-amber-500">*</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <UploadIcon className="h-3 w-3" />
              Log Game
            </button>
          </div>

          {/* Upload form */}
          {showUpload && (
            <div className="border-b border-border bg-background p-3">
              <div className="mb-2">
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Your Arena Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. QuLeR"
                  className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="mb-2">
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Paste Game Log
                </label>
                <textarea
                  value={rawLog}
                  onChange={(e) => setRawLog(e.target.value)}
                  placeholder={`Paste your game log here...\n\nGame 1 start\n  player1 rolled a 15\n  player2 rolled a 3\n  ...`}
                  rows={8}
                  className="w-full resize-y rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !rawLog.trim() || !playerName.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {uploading ? 'Analyzing...' : 'Upload & Analyze'}
                </button>
                <button
                  onClick={() => { setShowUpload(false); setRawLog(''); }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="px-3 pb-3 pt-2">
            {/* ── Games Tab ─────────────────────────────────────────── */}
            {activeTab === 'games' && (
              <>
                {/* Overall stats bar */}
                {analysis && analysis.overallStats.totalGames >= 2 && (
                  <div className="mb-2 grid grid-cols-4 gap-1.5 text-center">
                    <StatBox label="On Play" value={`${analysis.overallStats.playWinRate}%`} color={analysis.overallStats.playWinRate >= 50 ? 'green' : 'red'} />
                    <StatBox label="On Draw" value={`${analysis.overallStats.drawWinRate}%`} color={analysis.overallStats.drawWinRate >= 50 ? 'green' : 'red'} />
                    <StatBox label="Avg Turns" value={`${analysis.overallStats.avgTurns}`} color="neutral" />
                    <StatBox label="Win Rate" value={`${analysis.overallStats.winRate}%`} color={analysis.overallStats.winRate >= 50 ? 'green' : 'red'} />
                  </div>
                )}

                {logs.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No games logged yet. Play some games and upload the logs!
                  </p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log) => {
                      let oppColors: string[] = [];
                      try { oppColors = JSON.parse(log.opponent_deck_colors || '[]'); } catch {}
                      let oppCards: string[] = [];
                      try { oppCards = JSON.parse(log.opponent_cards_seen || '[]'); } catch {}

                      return (
                        <div
                          key={log.id}
                          className={cn(
                            'flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs',
                            log.result === 'win' ? 'border-green-500/20 bg-green-500/5' :
                            log.result === 'loss' ? 'border-red-500/20 bg-red-500/5' :
                            'border-yellow-500/20 bg-yellow-500/5'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                              log.result === 'win' ? 'bg-green-500/20 text-green-500' :
                              log.result === 'loss' ? 'bg-red-500/20 text-red-500' :
                              'bg-yellow-500/20 text-yellow-500'
                            )}>
                              {log.result}
                            </span>
                            {log.source === 'arena' && (
                              <span className="rounded bg-purple-500/15 px-1 py-0.5 text-[9px] font-medium text-purple-400">
                                Arena
                              </span>
                            )}
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{log.opponent_name || 'Unknown'}</span>
                            {oppColors.length > 0 && (
                              <span className="text-muted-foreground">({oppColors.join('')})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {log.turns && <span>T{log.turns}</span>}
                            {log.play_draw && (
                              <span className={cn('text-[10px]', log.play_draw === 'play' ? 'text-blue-400' : 'text-orange-400')}>
                                {log.play_draw === 'play' ? 'OTP' : 'OTD'}
                              </span>
                            )}
                            {oppCards.length > 0 && (
                              <span className="max-w-[100px] truncate text-[10px]" title={oppCards.join(', ')}>
                                {oppCards.length} cards
                              </span>
                            )}
                            {log.source !== 'arena' && (
                              <button onClick={() => deleteLog(log.id)} className="text-muted-foreground/50 hover:text-red-500" title="Delete">
                                <XIcon className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Matchup breakdown */}
                {analysis && analysis.matchupBreakdown.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Matchups
                    </div>
                    <div className="space-y-1">
                      {analysis.matchupBreakdown.map((mu) => (
                        <div key={mu.colors} className="flex items-center justify-between rounded-md bg-background px-2 py-1 text-xs">
                          <span className="font-medium">{mu.colors}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-green-500">{mu.wins}W</span>
                            <span className="text-red-500">{mu.losses}L</span>
                            <span className={cn(
                              'rounded px-1 py-0.5 text-[10px] font-bold',
                              mu.winRate >= 50 ? 'text-green-500' : 'text-red-500'
                            )}>
                              {mu.winRate}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Insights Tab ──────────────────────────────────────── */}
            {activeTab === 'insights' && (
              <>
                {!analysis || analysis.insights.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {logs.length < 2
                      ? 'Log at least 2 games to get AI insights.'
                      : 'No significant patterns detected yet. Keep logging games!'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {analysis.insights.map((insight, i) => (
                      <div
                        key={i}
                        className={cn(
                          'rounded-lg border p-2.5 text-xs',
                          insight.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                          insight.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                          'border-blue-500/30 bg-blue-500/5'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className={cn(
                            'mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full',
                            insight.severity === 'critical' ? 'bg-red-500' :
                            insight.severity === 'warning' ? 'bg-amber-500' :
                            'bg-blue-500'
                          )} />
                          <div>
                            <p className="font-medium">{insight.message}</p>
                            {insight.suggestion && (
                              <p className="mt-1 text-muted-foreground">{insight.suggestion}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Swap suggestions */}
                    {analysis.swapSuggestions.length > 0 && (
                      <div className="mt-3">
                        <div className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Suggested Swaps
                        </div>
                        <div className="space-y-1.5">
                          {analysis.swapSuggestions.map((swap, i) => (
                            <div key={i} className="rounded-lg border border-border bg-background p-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="rounded bg-red-500/10 px-1 py-0.5 text-[10px] font-bold text-red-500">CUT</span>
                                <span className="font-medium">{swap.cut}</span>
                                <span className="text-muted-foreground">— {swap.reason}</span>
                              </div>
                              {swap.addCandidates.length > 0 && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="rounded bg-green-500/10 px-1 py-0.5 text-[10px] font-bold text-green-500">ADD</span>
                                  <span className="text-muted-foreground">{swap.addCandidates.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Card Stats Tab ────────────────────────────────────── */}
            {activeTab === 'cards' && (
              <>
                {!analysis || analysis.cardPerformance.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Log more games to see card performance data.
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    <div className="mb-1 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
                      <span>Card</span>
                      <div className="flex gap-4">
                        <span>Games</span>
                        <span className="w-10 text-right">WR%</span>
                      </div>
                    </div>
                    {analysis.cardPerformance.map((cp) => (
                      <div
                        key={cp.name}
                        className={cn(
                          'flex items-center justify-between rounded-md px-2 py-1.5 text-xs',
                          cp.verdict === 'strong' ? 'bg-green-500/5' :
                          cp.verdict === 'weak' ? 'bg-red-500/5' :
                          'bg-background'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {cp.verdict === 'strong' && <span className="text-[10px] text-green-500">▲</span>}
                          {cp.verdict === 'weak' && <span className="text-[10px] text-red-500">▼</span>}
                          {cp.verdict === 'neutral' && <span className="text-[10px] text-muted-foreground">—</span>}
                          <span className={cn(
                            'font-medium',
                            cp.verdict === 'strong' ? 'text-green-400' :
                            cp.verdict === 'weak' ? 'text-red-400' : ''
                          )}>
                            {cp.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>{cp.appearances}</span>
                          <span className={cn(
                            'w-10 text-right font-bold',
                            cp.winRate >= 60 ? 'text-green-500' :
                            cp.winRate <= 40 ? 'text-red-500' : ''
                          )}>
                            {cp.winRate}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Turn-by-turn win rates */}
                {analysis && analysis.turnStats && analysis.turnStats.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Win Rate by Turn Played
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] text-muted-foreground">
                            <th className="pb-1 pr-2 text-left font-medium">Card</th>
                            <th className="pb-1 px-1 text-center font-medium" title="Turn 1">T1</th>
                            <th className="pb-1 px-1 text-center font-medium" title="Turn 2">T2</th>
                            <th className="pb-1 px-1 text-center font-medium" title="Turn 3">T3</th>
                            <th className="pb-1 px-1 text-center font-medium" title="Turn 4">T4</th>
                            <th className="pb-1 pl-1 text-right font-medium">All</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.turnStats.slice(0, 20).map((ts) => (
                            <tr key={ts.name} className="border-t border-border/30">
                              <td className="py-1 pr-2 font-medium truncate max-w-[120px]" title={ts.name}>
                                {ts.name}
                              </td>
                              {[1, 2, 3, 4].map((turn) => {
                                const data = ts.byTurn[turn];
                                return (
                                  <td key={turn} className="py-1 px-1 text-center">
                                    {data ? (
                                      <span
                                        className={cn(
                                          'rounded px-1 py-0.5 text-[10px] font-bold',
                                          data.winRate >= 60 ? 'text-green-500' :
                                          data.winRate <= 40 ? 'text-red-500' :
                                          'text-muted-foreground'
                                        )}
                                        title={`${data.wins}W / ${data.total} games`}
                                      >
                                        {data.winRate}%
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground/30">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-1 pl-1 text-right">
                                <span className={cn(
                                  'text-[10px] font-bold',
                                  ts.overallWinRate >= 60 ? 'text-green-500' :
                                  ts.overallWinRate <= 40 ? 'text-red-500' : ''
                                )}>
                                  {ts.overallWinRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: 'green' | 'red' | 'neutral' }) {
  return (
    <div className="rounded-md bg-background px-1.5 py-1">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className={cn(
        'text-sm font-bold',
        color === 'green' ? 'text-green-500' :
        color === 'red' ? 'text-red-500' : 'text-foreground'
      )}>
        {value}
      </div>
    </div>
  );
}

// Icons
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16,16 12,12 8,16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,9 12,15 18,9" />
    </svg>
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
