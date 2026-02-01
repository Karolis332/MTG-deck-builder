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
}

interface MatchStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  avg_turns: number | null;
}

interface MatchLogPanelProps {
  deckId: number;
  format: string | null;
  className?: string;
}

export function MatchLogPanel({ deckId, format, className }: MatchLogPanelProps) {
  const [logs, setLogs] = useState<MatchLog[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [rawLog, setRawLog] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Load saved player name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mtg_player_name');
    if (saved) setPlayerName(saved);
  }, []);

  // Fetch logs for this deck
  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/match-logs?deck_id=${deckId}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setStats(data.stats || null);
    } catch {}
  };

  useEffect(() => {
    fetchLogs();
  }, [deckId]);

  const handleUpload = async () => {
    if (!rawLog.trim() || !playerName.trim()) return;

    // Save player name
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
      }
    } catch {} finally {
      setUploading(false);
    }
  };

  const deleteLog = async (id: number) => {
    try {
      await fetch(`/api/match-logs?id=${id}`, { method: 'DELETE' });
      fetchLogs();
    } catch {}
  };

  const winRate = stats && stats.total > 0
    ? Math.round((stats.wins / stats.total) * 100)
    : null;

  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      {/* Header with stats */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ChartIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Match History</span>
          {stats && stats.total > 0 && (
            <span className="text-xs text-muted-foreground">
              {stats.total} games
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
        <div className="border-t border-border px-3 pb-3">
          {/* Upload button */}
          <div className="py-2">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <UploadIcon className="h-3.5 w-3.5" />
              Log Game
            </button>
          </div>

          {/* Upload form */}
          {showUpload && (
            <div className="mb-3 rounded-lg border border-border bg-background p-3">
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
                  placeholder={`Paste your game log here...\n\nExample:\nGame 1 start\n  player1 rolled a 15\n  player2 rolled a 3\n  player1 plays first.\nTurn 1: player1\n  ...`}
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
                  {uploading ? 'Parsing...' : 'Upload & Parse'}
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

          {/* Match list */}
          {logs.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No games logged yet. Play some games and upload the logs!
            </p>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => {
                let oppColors: string[] = [];
                try {
                  oppColors = JSON.parse(log.opponent_deck_colors || '[]');
                } catch {}

                let oppCards: string[] = [];
                try {
                  oppCards = JSON.parse(log.opponent_cards_seen || '[]');
                } catch {}

                return (
                  <div
                    key={log.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs',
                      log.result === 'win'
                        ? 'border-green-500/20 bg-green-500/5'
                        : log.result === 'loss'
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-yellow-500/20 bg-yellow-500/5'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                          log.result === 'win'
                            ? 'bg-green-500/20 text-green-500'
                            : log.result === 'loss'
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-yellow-500/20 text-yellow-500'
                        )}
                      >
                        {log.result}
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-medium">{log.opponent_name || 'Unknown'}</span>
                      {oppColors.length > 0 && (
                        <span className="text-muted-foreground">
                          ({oppColors.join('')})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {log.turns && <span>T{log.turns}</span>}
                      {log.play_draw && (
                        <span className={cn(
                          'text-[10px]',
                          log.play_draw === 'play' ? 'text-blue-400' : 'text-orange-400'
                        )}>
                          {log.play_draw === 'play' ? 'OTP' : 'OTD'}
                        </span>
                      )}
                      {oppCards.length > 0 && (
                        <span className="max-w-[120px] truncate text-[10px]" title={oppCards.join(', ')}>
                          {oppCards.length} cards seen
                        </span>
                      )}
                      <button
                        onClick={() => deleteLog(log.id)}
                        className="text-muted-foreground/50 hover:text-red-500"
                        title="Delete"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
