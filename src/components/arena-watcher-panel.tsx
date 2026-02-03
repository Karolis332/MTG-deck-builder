'use client';

import { useState, useEffect } from 'react';
import { isElectron, getElectronAPI } from '@/lib/electron-bridge';
import { cn } from '@/lib/utils';

interface Toast {
  id: number;
  message: string;
  type: 'win' | 'loss' | 'draw' | 'collection' | 'error';
}

let toastId = 0;

export function ArenaWatcherPanel() {
  const [running, setRunning] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!isElectron()) return;
    const api = getElectronAPI()!;

    // Check initial status
    api.getWatcherStatus().then((s) => {
      setRunning(s.running);
      setMatchCount(s.matchCount);
    });

    // Subscribe to events
    const removeMatch = api.onWatcherMatch((match) => {
      const m = match as { result?: string; matchId?: string };
      setMatchCount((c) => c + 1);
      const type = m.result === 'win' ? 'win' : m.result === 'loss' ? 'loss' : 'draw';
      addToast(`Match ${type.toUpperCase()}`, type);
    });

    const removeCollection = api.onWatcherCollection(() => {
      addToast('Collection synced from Arena', 'collection');
    });

    const removeError = api.onWatcherError((err) => {
      addToast(`Watcher error: ${err}`, 'error');
    });

    // Poll status periodically
    const interval = setInterval(() => {
      api.getWatcherStatus().then((s) => {
        setRunning(s.running);
        setMatchCount(s.matchCount);
      });
    }, 5000);

    return () => {
      removeMatch();
      removeCollection();
      removeError();
      clearInterval(interval);
    };
  }, []);

  function addToast(message: string, type: Toast['type']) {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  if (!isElectron() || !running) return null;

  return (
    <>
      {/* Status indicator — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm">
        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-muted-foreground">Arena Watcher</span>
        <span className="font-mono font-medium">{matchCount}</span>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-14 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'animate-in slide-in-from-right fade-in rounded-lg border px-3 py-2 text-xs shadow-lg',
              toast.type === 'win' && 'border-green-500/30 bg-green-500/10 text-green-400',
              toast.type === 'loss' && 'border-red-500/30 bg-red-500/10 text-red-400',
              toast.type === 'draw' && 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
              toast.type === 'collection' && 'border-blue-500/30 bg-blue-500/10 text-blue-400',
              toast.type === 'error' && 'border-red-500/30 bg-red-500/10 text-red-300'
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
