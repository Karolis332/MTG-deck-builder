'use client';

import { useState, useEffect, useCallback } from 'react';
import { getElectronAPI } from '@/lib/electron-bridge';
import type { GameStateSnapshot } from '@/lib/game-state-engine';
import type { MulliganAdvice } from '@/lib/mulligan-advisor';
import { OverlayHeader } from './OverlayHeader';
import { DeckTracker } from './DeckTracker';
import { OpponentTracker } from './OpponentTracker';
import { MulliganAdvisor } from './MulliganAdvisor';
import { SideboardGuide } from './SideboardGuide';

type Panel = 'deck' | 'opponent' | 'mulligan' | 'sideboard';

export function OverlayRoot() {
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [activePanel, setActivePanel] = useState<Panel>('deck');
  const [mulliganAdvice, setMulliganAdvice] = useState<MulliganAdvice | null>(null);
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [isSideboarding, setIsSideboarding] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{
    matchId: string;
    format: string | null;
    playerName: string | null;
    opponentName: string | null;
  } | null>(null);

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
        setIsSideboarding(false);
        setMulliganAdvice(null);
        setActivePanel('deck');
      })
    );

    cleanups.push(
      api.onMatchEnded(() => {
        setIsMatchActive(false);
        setIsSideboarding(false);
      })
    );

    cleanups.push(
      api.onMulliganPrompt(async (data) => {
        setActivePanel('mulligan');
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
            // Mulligan advice failed — non-critical
          }
        }
      })
    );

    cleanups.push(
      api.onIntermissionStart(() => {
        setIsSideboarding(true);
        setActivePanel('sideboard');
      })
    );

    // Check for existing game state
    api.getGameState().then((state) => {
      if (state) {
        setGameState(state as GameStateSnapshot);
        setIsMatchActive(state.isActive);
      }
    });

    return () => cleanups.forEach(fn => fn());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePanelSwitch = useCallback((panel: Panel) => {
    setActivePanel(panel);
  }, []);

  if (!isMatchActive && !gameState) {
    return (
      <div style={styles.container}>
        <div style={styles.waitingPanel}>
          <div style={styles.logo}>&#128214;</div>
          <div style={styles.waitingText}>Waiting for match...</div>
          <div style={styles.hint}>Alt+O to toggle · Alt+L for click-through</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <OverlayHeader
        playerLife={gameState?.playerLife ?? 20}
        opponentLife={gameState?.opponentLife ?? 20}
        turnNumber={gameState?.turnNumber ?? 0}
        format={matchInfo?.format ?? gameState?.format ?? null}
        playerName={matchInfo?.playerName ?? null}
        opponentName={matchInfo?.opponentName ?? null}
      />

      {/* Panel tabs */}
      <div style={styles.tabs}>
        {(['deck', 'opponent', 'mulligan', 'sideboard'] as Panel[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handlePanelSwitch(tab)}
            style={{
              ...styles.tab,
              ...(activePanel === tab ? styles.tabActive : {}),
            }}
          >
            {tab === 'deck' ? 'Deck' : tab === 'opponent' ? 'Opp' : tab === 'mulligan' ? 'Mull' : 'SB'}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <div style={styles.panelBody}>
        {activePanel === 'deck' && gameState && (
          <DeckTracker
            deckList={gameState.deckList}
            librarySize={gameState.librarySize}
            drawProbabilities={gameState.drawProbabilities}
            cardsDrawn={gameState.cardsDrawn}
          />
        )}
        {activePanel === 'opponent' && gameState && (
          <OpponentTracker
            opponentCardsSeen={gameState.opponentCardsSeen}
            opponentBattlefield={gameState.opponentBattlefield}
            opponentGraveyard={gameState.opponentGraveyard}
          />
        )}
        {activePanel === 'mulligan' && (
          <MulliganAdvisor
            advice={mulliganAdvice}
            openingHand={gameState?.openingHand ?? []}
          />
        )}
        {activePanel === 'sideboard' && (
          <SideboardGuide
            isSideboarding={isSideboarding}
            opponentCardsSeen={gameState?.opponentCardsSeen ?? []}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(8, 6, 13, 0.85)',
    border: '1px solid rgba(201, 168, 76, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    WebkitAppRegion: 'drag',
  } as React.CSSProperties,
  waitingPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 32,
    filter: 'drop-shadow(0 0 6px rgba(180,140,60,0.4))',
  },
  waitingText: {
    color: '#8b7355',
    fontSize: 13,
    letterSpacing: 1,
  },
  hint: {
    color: '#5a4e3a',
    fontSize: 10,
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(201, 168, 76, 0.2)',
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties,
  tab: {
    flex: 1,
    padding: '4px 0',
    background: 'transparent',
    border: 'none',
    color: '#8b7355',
    fontSize: 11,
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    transition: 'color 0.15s, border-color 0.15s',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#c9a84c',
    borderBottomColor: '#c9a84c',
  },
  panelBody: {
    flex: 1,
    overflow: 'auto',
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties,
};
