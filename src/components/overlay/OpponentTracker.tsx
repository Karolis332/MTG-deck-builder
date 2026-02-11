'use client';

import { useState, useEffect } from 'react';
import { getElectronAPI } from '@/lib/electron-bridge';

interface OpponentTrackerProps {
  opponentCardsSeen: number[];
  opponentBattlefield: number[];
  opponentGraveyard: number[];
}

interface ResolvedCardInfo {
  name: string;
  manaCost: string | null;
  typeLine: string | null;
}

export function OpponentTracker({
  opponentCardsSeen,
  opponentBattlefield,
  opponentGraveyard,
}: OpponentTrackerProps) {
  const [resolvedCards, setResolvedCards] = useState<Record<number, ResolvedCardInfo>>({});

  useEffect(() => {
    const api = getElectronAPI();
    if (!api || opponentCardsSeen.length === 0) return;

    api.resolveGrpIds(opponentCardsSeen).then((resolved) => {
      const mapped: Record<number, ResolvedCardInfo> = {};
      for (const [grpIdStr, card] of Object.entries(resolved)) {
        const c = card as { name?: string; manaCost?: string; typeLine?: string };
        mapped[Number(grpIdStr)] = {
          name: c.name ?? `Card #${grpIdStr}`,
          manaCost: c.manaCost ?? null,
          typeLine: c.typeLine ?? null,
        };
      }
      setResolvedCards(mapped);
    });
  }, [opponentCardsSeen]);

  const battlefieldSet = new Set(opponentBattlefield);
  const graveyardSet = new Set(opponentGraveyard);

  // Infer opponent colors from mana costs
  const colors = new Set<string>();
  for (const card of Object.values(resolvedCards)) {
    if (card.manaCost) {
      if (card.manaCost.includes('W')) colors.add('W');
      if (card.manaCost.includes('U')) colors.add('U');
      if (card.manaCost.includes('B')) colors.add('B');
      if (card.manaCost.includes('R')) colors.add('R');
      if (card.manaCost.includes('G')) colors.add('G');
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.colorBar}>
        Opponent colors: {colors.size > 0 ? Array.from(colors).join('') : '?'}
        <span style={styles.cardCount}>{opponentCardsSeen.length} cards seen</span>
      </div>

      {opponentCardsSeen.length === 0 ? (
        <div style={styles.empty}>No opponent cards seen yet</div>
      ) : (
        <div>
          {opponentCardsSeen.map((grpId) => {
            const card = resolvedCards[grpId];
            const name = card?.name ?? `Card #${grpId}`;
            const inPlay = battlefieldSet.has(grpId);
            const inGY = graveyardSet.has(grpId);

            return (
              <div key={grpId} style={styles.cardRow}>
                <span style={{
                  ...styles.zone,
                  color: inPlay ? '#27ae60' : inGY ? '#e74c3c' : '#6b5a3e',
                }}>
                  {inPlay ? 'BF' : inGY ? 'GY' : '--'}
                </span>
                <span style={styles.name}>{name}</span>
                {card?.typeLine && (
                  <span style={styles.type}>
                    {card.typeLine.split('—')[0].trim()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 0,
  },
  colorBar: {
    padding: '4px 8px',
    fontSize: 10,
    color: '#c9a84c',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    borderBottom: '1px solid rgba(201, 168, 76, 0.15)',
    display: 'flex',
    justifyContent: 'space-between',
  },
  cardCount: {
    color: '#8b7355',
    fontWeight: 400,
  },
  empty: {
    padding: '16px 8px',
    textAlign: 'center' as const,
    color: '#5a4e3a',
    fontSize: 11,
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '2px 6px',
    fontSize: 11,
    lineHeight: '18px',
    borderBottom: '1px solid rgba(201, 168, 76, 0.06)',
  },
  zone: {
    width: 20,
    fontSize: 9,
    fontWeight: 600,
    marginRight: 4,
    textAlign: 'center' as const,
  },
  name: {
    flex: 1,
    color: '#d4c4a8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  type: {
    color: '#6b5a3e',
    fontSize: 9,
    marginLeft: 4,
    maxWidth: 80,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};
