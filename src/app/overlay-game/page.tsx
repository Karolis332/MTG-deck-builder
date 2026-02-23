'use client';

import { useState, useEffect, useCallback } from 'react';
import { isElectron, getElectronAPI } from '@/lib/electron-bridge';
import type { GameLogEntry } from '@/lib/electron-bridge';
import type { GameStateSnapshot } from '@/lib/game-state-engine';

/**
 * Compact overlay page designed for transparent in-game rendering.
 * 300px wide, semi-transparent panels, no Navbar.
 * Used by the Overwolf overlay window.
 */
export default function OverlayGamePage() {
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [matchInfo, setMatchInfo] = useState<{
    matchId: string;
    format: string | null;
    playerName: string | null;
    opponentName: string | null;
  } | null>(null);
  const [logEntries, setLogEntries] = useState<GameLogEntry[]>([]);
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'deck' | 'log' | 'opponent'>('deck');

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;

    const cleanups: Array<() => void> = [];

    cleanups.push(
      api.onGameStateUpdate((state) => {
        setGameState(state as GameStateSnapshot);
      })
    );

    cleanups.push(
      api.onMatchStarted((data) => {
        setMatchInfo(data);
        setIsMatchActive(true);
        setLogEntries([]);
      })
    );

    cleanups.push(
      api.onMatchEnded(() => {
        setIsMatchActive(false);
      })
    );

    cleanups.push(
      api.onGameLogEntry((entry) => {
        setLogEntries(prev => {
          const next = [...prev, entry];
          // Keep last 50 entries to save memory in overlay
          return next.length > 50 ? next.slice(-50) : next;
        });
      })
    );

    if (api.onGameLogUpdate) {
      cleanups.push(
        api.onGameLogUpdate((updatedEntry) => {
          setLogEntries(prev => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            next[next.length - 1] = updatedEntry;
            return next;
          });
        })
      );
    }

    // Restore state on mount
    api.getGameState().then((state) => {
      if (state) {
        setGameState(state as GameStateSnapshot);
        setIsMatchActive(state.isActive);
      }
    });

    api.getGameLog().then((entries) => {
      if (entries && entries.length > 0) {
        setLogEntries(entries.slice(-50));
      }
    });

    api.getLastMatchInfo().then((info) => {
      if (info) setMatchInfo(info);
    });

    return () => cleanups.forEach(fn => fn());
  }, []);

  const handleSetInteractive = useCallback(async (interactive: boolean) => {
    const api = getElectronAPI();
    if (api) await api.setOverlayInteractive(interactive);
  }, []);

  if (!isElectron()) {
    return <div className="p-4 text-sm text-gray-400">Overlay requires desktop app</div>;
  }

  if (!gameState && !matchInfo && logEntries.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-gray-400 text-xs">
          <div className="text-lg mb-1">&#128214;</div>
          <div>Waiting for match...</div>
        </div>
      </div>
    );
  }

  const deckList = gameState?.deckList ?? [];
  const librarySize = gameState?.librarySize ?? 0;
  const drawProbs = gameState?.drawProbabilities ?? {};
  const playerLife = gameState?.playerLife ?? 20;
  const opponentLife = gameState?.opponentLife ?? 20;
  const opponentCards = gameState?.opponentCardsSeen ?? [];

  return (
    <div
      className="flex flex-col h-screen select-none text-gray-200 text-xs"
      style={{ background: 'transparent' }}
    >
      {/* Draggable title bar */}
      <div
        className="flex items-center justify-between px-2 py-1 bg-black/80 cursor-move"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-[10px] font-semibold tracking-wider text-amber-400/80 uppercase">
          Grimoire
        </span>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span
            className={`h-1.5 w-1.5 rounded-full ${isMatchActive ? 'bg-green-400' : 'bg-gray-600'}`}
          />
          {matchInfo?.format ?? ''}
        </div>
      </div>

      {/* Life totals bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/70">
        <div className="flex items-center gap-1.5">
          <span className="text-green-400 font-mono font-bold text-sm">{playerLife}</span>
          <span className="text-gray-500 text-[10px]">You</span>
        </div>
        <div className="text-gray-600 text-[10px]">vs</div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-[10px]">
            {matchInfo?.opponentName?.slice(0, 12) ?? 'Opp'}
          </span>
          <span className="text-red-400 font-mono font-bold text-sm">{opponentLife}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-black/60 border-b border-gray-700/50">
        {(['deck', 'log', 'opponent'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); handleSetInteractive(true); }}
            className={`flex-1 py-1 text-[10px] uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-amber-400 border-b border-amber-400/60'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'deck' ? `Deck (${librarySize})` : tab === 'opponent' ? `Opp (${opponentCards.length})` : 'Log'}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto bg-black/60 backdrop-blur-sm">
        {activeTab === 'deck' && (
          <OverlayDeckView deckList={deckList} drawProbs={drawProbs} />
        )}
        {activeTab === 'log' && (
          <OverlayLogView entries={logEntries} />
        )}
        {activeTab === 'opponent' && (
          <OverlayOpponentView cards={opponentCards} />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function OverlayDeckView({
  deckList,
  drawProbs,
}: {
  deckList: Array<{ grpId: number; name?: string; qty: number; remaining: number }>;
  drawProbs: Record<string, number>;
}) {
  // Group by CMC bucket for compact display
  const sorted = [...deckList].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  return (
    <div className="p-1">
      {/* Draw probabilities summary */}
      {Object.keys(drawProbs).length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 py-1 mb-1 border-b border-gray-700/30">
          {Object.entries(drawProbs).slice(0, 4).map(([type, prob]) => (
            <span key={type} className="text-[9px] text-gray-400">
              {type}: <span className="text-gray-200">{(prob * 100).toFixed(0)}%</span>
            </span>
          ))}
        </div>
      )}

      {sorted.map((card, i) => (
        <div
          key={`${card.grpId}-${i}`}
          className={`flex items-center justify-between px-1.5 py-0.5 ${
            card.remaining === 0 ? 'opacity-30 line-through' : ''
          }`}
        >
          <span className="truncate flex-1 text-[11px]">
            {card.remaining}x {card.name ?? `#${card.grpId}`}
          </span>
        </div>
      ))}

      {deckList.length === 0 && (
        <div className="p-3 text-center text-gray-500 text-[10px]">No deck data yet</div>
      )}
    </div>
  );
}

function OverlayLogView({ entries }: { entries: GameLogEntry[] }) {
  return (
    <div className="p-1 space-y-0.5">
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`px-1.5 py-0.5 text-[10px] leading-tight ${
            entry.type === 'turn'
              ? 'text-amber-400/80 font-semibold border-t border-gray-700/30 mt-1 pt-1'
              : entry.type === 'life' || entry.type === 'damage'
              ? 'text-red-300/80'
              : entry.type === 'result'
              ? 'text-amber-300 font-semibold'
              : 'text-gray-400'
          }`}
        >
          {entry.text}
        </div>
      ))}

      {entries.length === 0 && (
        <div className="p-3 text-center text-gray-500 text-[10px]">No events yet</div>
      )}
    </div>
  );
}

function OverlayOpponentView({ cards }: { cards: number[] }) {
  return (
    <div className="p-1">
      {cards.map((grpId, i) => (
        <div key={`${grpId}-${i}`} className="flex items-center px-1.5 py-0.5">
          <span className="truncate flex-1 text-[11px]">#{grpId}</span>
        </div>
      ))}

      {cards.length === 0 && (
        <div className="p-3 text-center text-gray-500 text-[10px]">No cards seen</div>
      )}
    </div>
  );
}
