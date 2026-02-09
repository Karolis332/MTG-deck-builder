'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VersionEntry {
  id: number;
  versionNumber: number;
  name: string;
  source: string;
  changeType: string | null;
  createdAt: string;
  changes: Array<{ action: string; card: string; quantity: number }>;
  stats: {
    total: number;
    wins: number;
    losses: number;
    winRate: number | null;
  };
}

interface VersionHistoryPanelProps {
  deckId: number;
  open: boolean;
  onClose: () => void;
  onRestore: () => void;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  manual_edit: { label: 'Manual', color: 'bg-blue-500/20 text-blue-400' },
  manual: { label: 'Manual', color: 'bg-blue-500/20 text-blue-400' },
  ai_suggest: { label: 'AI', color: 'bg-purple-500/20 text-purple-400' },
  import: { label: 'Import', color: 'bg-emerald-500/20 text-emerald-400' },
  rollback: { label: 'Rollback', color: 'bg-amber-500/20 text-amber-400' },
  snapshot: { label: 'Snapshot', color: 'bg-slate-500/20 text-slate-400' },
};

export function VersionHistoryPanel({ deckId, open, onClose, onRestore }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/deck-versions?deck_id=${deckId}`)
      .then(r => r.json())
      .then(data => setVersions(data.versions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, deckId]);

  const handleRestore = async (versionId: number) => {
    setRestoring(versionId);
    try {
      const res = await fetch('/api/deck-versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_id: deckId, version_id: versionId }),
      });
      const data = await res.json();
      if (data.ok) {
        onRestore();
        // Reload versions
        const vRes = await fetch(`/api/deck-versions?deck_id=${deckId}`);
        const vData = await vRes.json();
        setVersions(vData.versions || []);
      }
    } catch {
      // Fail silently
    } finally {
      setRestoring(null);
    }
  };

  if (!open) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Version History</h2>
            <span className="text-[10px] text-muted-foreground">
              {versions.length} versions
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            &times;
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-5 w-5 text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              No versions yet. Versions are created automatically when you edit the deck.
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

              {versions.map((v, idx) => {
                const sourceInfo = SOURCE_LABELS[v.source] || SOURCE_LABELS.manual;
                const isExpanded = expandedId === v.id;
                const isLatest = idx === 0;
                const adds = v.changes.filter(c => c.action === 'added');
                const removes = v.changes.filter(c => c.action === 'removed');

                return (
                  <div
                    key={v.id}
                    className={cn(
                      'relative pl-10 pr-4 py-3 border-b border-border/50 transition-colors',
                      isExpanded && 'bg-accent/30'
                    )}
                  >
                    {/* Timeline dot */}
                    <div className={cn(
                      'absolute left-[18px] top-4 h-3 w-3 rounded-full border-2 border-card',
                      isLatest ? 'bg-primary' : 'bg-muted-foreground/30'
                    )} />

                    {/* Version header */}
                    <div
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : v.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          {v.name}
                        </span>
                        <span className={cn(
                          'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                          sourceInfo.color
                        )}>
                          {sourceInfo.label}
                        </span>
                        {isLatest && (
                          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{formatDate(v.createdAt)}</span>
                        {v.stats.total > 0 && (
                          <span className={cn(
                            'font-medium',
                            (v.stats.winRate || 0) >= 55 ? 'text-green-400' :
                            (v.stats.winRate || 0) <= 40 ? 'text-red-400' : 'text-muted-foreground'
                          )}>
                            {v.stats.wins}W-{v.stats.losses}L ({v.stats.winRate}%)
                          </span>
                        )}
                        {v.changes.length > 0 && (
                          <span>
                            {adds.length > 0 && <span className="text-green-400">+{adds.reduce((s, c) => s + c.quantity, 0)}</span>}
                            {adds.length > 0 && removes.length > 0 && ' '}
                            {removes.length > 0 && <span className="text-red-400">-{removes.reduce((s, c) => s + c.quantity, 0)}</span>}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {/* Changes */}
                        {v.changes.length > 0 && (
                          <div className="space-y-0.5">
                            {v.changes.slice(0, 20).map((c, ci) => (
                              <div key={ci} className="flex items-center gap-1.5 text-[10px]">
                                <span className={cn(
                                  'shrink-0 rounded px-1 py-0.5 font-bold',
                                  c.action === 'added'
                                    ? 'bg-green-500/15 text-green-400'
                                    : 'bg-red-500/15 text-red-400'
                                )}>
                                  {c.action === 'added' ? '+' : '-'}{c.quantity}
                                </span>
                                <span className="truncate text-foreground/80">{c.card}</span>
                              </div>
                            ))}
                            {v.changes.length > 20 && (
                              <div className="text-[10px] text-muted-foreground">
                                ...and {v.changes.length - 20} more
                              </div>
                            )}
                          </div>
                        )}

                        {/* Restore button */}
                        {!isLatest && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(v.id);
                            }}
                            disabled={restoring !== null}
                            className="rounded-md border border-border px-2.5 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                          >
                            {restoring === v.id ? 'Restoring...' : 'Restore this version'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
