'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface LocalHistoryEvent {
  kind: 'applied' | 'dismissed';
  cardName: string;
  source?: string;
  at: number;
}

interface VersionEntry {
  id: number;
  versionNumber: number;
  name: string;
  source: string;
  createdAt: string;
}

interface HistoryItem {
  key: string;
  at: number;
  label: string;
  detail: string;
  restore?: () => void;
}

/** Pure helper — merges local apply/dismiss events with fetched version snapshots,
 * sorted newest-first, capped at 20. Exported for testing. */
export function mergeHistory(
  events: LocalHistoryEvent[],
  versions: VersionEntry[],
  onRestore: (versionId: number) => void
): HistoryItem[] {
  const eventItems: HistoryItem[] = events.map((e) => ({
    key: `event-${e.at}-${e.cardName}`,
    at: e.at,
    label: e.kind === 'applied' ? `Applied ${e.cardName}` : `Dismissed ${e.cardName}`,
    detail: e.source ?? '',
  }));
  const versionItems: HistoryItem[] = versions.map((v) => ({
    key: `version-${v.id}`,
    at: new Date(v.createdAt).getTime(),
    label: `Snapshot v${v.versionNumber}: ${v.name}`,
    detail: v.source,
    restore: () => onRestore(v.id),
  }));
  return [...eventItems, ...versionItems].sort((a, b) => b.at - a.at).slice(0, 20);
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

interface HistorySectionProps {
  deckId: number;
  events: LocalHistoryEvent[];
  onRestored?: () => void;
}

export function HistorySection({ deckId, events, onRestored }: HistorySectionProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  useEffect(() => {
    if (collapsed) return;
    fetch(`/api/deck-versions?deck_id=${deckId}`)
      .then((r) => r.json())
      .then((data) => setVersions(data.versions || []))
      .catch(() => {});
  }, [collapsed, deckId]);

  const handleRestore = async (versionId: number) => {
    setRestoringId(versionId);
    try {
      const res = await fetch('/api/deck-versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_id: deckId, version_id: versionId }),
      });
      const data = await res.json();
      if (data.ok) onRestored?.();
    } finally {
      setRestoringId(null);
    }
  };

  const items = mergeHistory(events, versions, handleRestore);

  return (
    <section className="hud-panel">
      <button onClick={() => setCollapsed((c) => !c)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide">History</span>
        <span className="ml-auto text-muted-foreground">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className="space-y-1 px-3 pb-3">
          {items.length === 0 && <div className="text-xs text-muted-foreground">Nothing yet.</div>}
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs">
              <span className="flex-1 truncate">{item.label}</span>
              <span className="shrink-0 text-[9px] text-muted-foreground">{item.detail}</span>
              <span className="shrink-0 text-[9px] text-muted-foreground">{relativeTime(item.at)}</span>
              {item.restore && (
                <button
                  onClick={item.restore}
                  disabled={restoringId !== null}
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium',
                    'bg-accent hover:bg-accent/70 disabled:opacity-50'
                  )}
                >
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
