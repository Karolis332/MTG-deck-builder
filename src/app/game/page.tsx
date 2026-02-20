'use client';

import { useState, useEffect, useCallback } from 'react';
import { isElectron, getElectronAPI } from '@/lib/electron-bridge';
import type { GameLogEntry } from '@/lib/electron-bridge';
import type { GameStateSnapshot } from '@/lib/game-state-engine';
import type { MulliganAdvice } from '@/lib/mulligan-advisor';
import { GameLog } from '@/components/game-log';
import { GameDeckTracker } from '@/components/game-deck-tracker';
import { GameOpponentTracker } from '@/components/game-opponent-tracker';

export default function GamePage() {
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{
    matchId: string;
    format: string | null;
    playerName: string | null;
    opponentName: string | null;
  } | null>(null);
  const [mulliganAdvice, setMulliganAdvice] = useState<MulliganAdvice | null>(null);
  const [showMulligan, setShowMulligan] = useState(false);
  const [isSideboarding, setIsSideboarding] = useState(false);
  const [logEntries, setLogEntries] = useState<GameLogEntry[]>([]);
  const [lastGameState, setLastGameState] = useState<GameStateSnapshot | null>(null);
  const [lastMatchInfo, setLastMatchInfo] = useState<{
    matchId: string;
    format: string | null;
    playerName: string | null;
    opponentName: string | null;
  } | null>(null);
  const [watcherStatus, setWatcherStatus] = useState<{
    running: boolean;
    matchCount: number;
    hasActiveGame?: boolean;
  } | null>(null);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;

    const cleanups: Array<() => void> = [];

    // Poll watcher status
    const statusInterval = setInterval(() => {
      api.getWatcherStatus().then(setWatcherStatus);
    }, 3000);
    api.getWatcherStatus().then(setWatcherStatus);

    // Game state updates — also save as lastGameState for post-match display
    cleanups.push(
      api.onGameStateUpdate((state) => {
        setGameState(state as GameStateSnapshot);
        setLastGameState(state as GameStateSnapshot);
      })
    );

    // Match lifecycle
    cleanups.push(
      api.onMatchStarted((data) => {
        setMatchInfo(data);
        setLastMatchInfo(data);
        setIsMatchActive(true);
        setIsSideboarding(false);
        setMulliganAdvice(null);
        setShowMulligan(false);
        setLogEntries([]); // Clear previous match log on new match start
      })
    );

    cleanups.push(
      api.onMatchEnded(() => {
        setIsMatchActive(false);
        setIsSideboarding(false);
        setShowMulligan(false);
      })
    );

    // Mulligan prompt
    cleanups.push(
      api.onMulliganPrompt(async (data) => {
        setShowMulligan(true);
        if (data.hand.length > 0 && gameState?.deckList) {
          try {
            const advice = await api.getMulliganAdvice({
              hand: data.hand,
              deckList: gameState.deckList.map(d => ({ grpId: d.grpId, qty: d.qty })),
              format: gameState.format,
              archetype: null,
              commanderGrpIds: gameState.commanderGrpIds,
              mulliganCount: data.mulliganCount,
            });
            setMulliganAdvice(advice);
          } catch {
            // Non-critical
          }
        }
      })
    );

    // Intermission (sideboarding)
    cleanups.push(
      api.onIntermissionStart(() => {
        setIsSideboarding(true);
        setShowMulligan(false);
      })
    );

    // Game log entries
    cleanups.push(
      api.onGameLogEntry((entry) => {
        setLogEntries(prev => [...prev, entry]);
      })
    );

    // Restore state from watcher on mount (covers page navigation + refresh)
    api.getGameState().then((state) => {
      if (state) {
        setGameState(state as GameStateSnapshot);
        setLastGameState(state as GameStateSnapshot);
        setIsMatchActive(state.isActive);
      }
    });

    api.getGameLog().then((entries) => {
      if (entries && entries.length > 0) {
        setLogEntries(entries);
      }
    });

    api.getLastMatchInfo().then((info) => {
      if (info) {
        setMatchInfo(info);
        setLastMatchInfo(info);
      }
    });

    return () => {
      clearInterval(statusInterval);
      cleanups.forEach(fn => fn());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start watcher if not running
  useEffect(() => {
    const api = getElectronAPI();
    if (!api || !watcherStatus || watcherStatus.running) return;

    api.getDefaultArenaLogPath().then((logPath) => {
      api.startWatcher(logPath);
    });
  }, [watcherStatus]);

  if (!isElectron()) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl text-primary mb-4">Game Tracker</h1>
        <p className="text-muted-foreground">
          The live game tracker requires the desktop app. Run with <code className="rounded bg-card px-1.5 py-0.5 text-sm">npm run dev:electron</code>
        </p>
      </div>
    );
  }

  // Determine if we have match data to show (active OR recently completed)
  const hasMatchData = isMatchActive || gameState?.isActive || logEntries.length > 0;

  // Waiting state — no active match AND no log data from a completed match
  if (!hasMatchData) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4">
        <div className="text-4xl filter drop-shadow-[0_0_8px_rgba(180,140,60,0.4)]">&#128214;</div>
        <h2 className="font-heading text-xl tracking-wide text-primary">Watching for Arena Match</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${watcherStatus?.running ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          {watcherStatus?.running
            ? 'Watcher active — start a game in Arena'
            : 'Watcher starting...'}
        </div>
        {watcherStatus && watcherStatus.matchCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {watcherStatus.matchCount} match{watcherStatus.matchCount !== 1 ? 'es' : ''} tracked this session
          </p>
        )}
      </div>
    );
  }

  // Use current state if available, fall back to last known state for post-match display
  const displayState = gameState ?? lastGameState;
  const displayMatchInfo = matchInfo ?? lastMatchInfo;

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[280px_1fr_280px]">
      {/* Left: Your Deck */}
      <div className="border-r border-border overflow-hidden">
        <GameDeckTracker
          deckList={displayState?.deckList ?? []}
          librarySize={displayState?.librarySize ?? 0}
          drawProbabilities={displayState?.drawProbabilities ?? {}}
          cardsDrawn={displayState?.cardsDrawn ?? []}
          mulliganAdvice={mulliganAdvice}
          showMulligan={showMulligan}
          isSideboarding={isSideboarding}
          opponentCardsSeen={displayState?.opponentCardsSeen ?? []}
        />
      </div>

      {/* Center: Game Log */}
      <div className="overflow-hidden">
        <GameLog
          entries={logEntries}
          format={displayMatchInfo?.format ?? displayState?.format ?? null}
          opponentName={displayMatchInfo?.opponentName ?? displayState?.opponentName ?? null}
        />
      </div>

      {/* Right: Opponent */}
      <div className="border-l border-border overflow-hidden">
        <GameOpponentTracker
          opponentCardsSeen={displayState?.opponentCardsSeen ?? []}
          opponentBattlefield={displayState?.opponentBattlefield ?? []}
          opponentGraveyard={displayState?.opponentGraveyard ?? []}
          opponentLife={displayState?.opponentLife ?? 20}
          opponentName={displayMatchInfo?.opponentName ?? displayState?.opponentName ?? null}
        />
      </div>
    </div>
  );
}
