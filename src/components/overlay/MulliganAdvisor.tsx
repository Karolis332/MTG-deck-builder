'use client';

import { useState, useEffect } from 'react';
import { getElectronAPI } from '@/lib/electron-bridge';
import type { MulliganAdvice } from '@/lib/mulligan-advisor';

interface MulliganAdvisorProps {
  advice: MulliganAdvice | null;
  openingHand: number[];
}

interface ResolvedCardInfo {
  name: string;
  manaCost: string | null;
}

export function MulliganAdvisor({ advice, openingHand }: MulliganAdvisorProps) {
  const [handCards, setHandCards] = useState<ResolvedCardInfo[]>([]);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api || openingHand.length === 0) return;

    api.resolveGrpIds(openingHand).then((resolved) => {
      const cards: ResolvedCardInfo[] = openingHand.map(grpId => {
        const card = (resolved as Record<number, { name?: string; manaCost?: string }>)[grpId];
        return {
          name: card?.name ?? `Card #${grpId}`,
          manaCost: card?.manaCost ?? null,
        };
      });
      setHandCards(cards);
    });
  }, [openingHand]);

  if (!advice && openingHand.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>Waiting for opening hand...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {advice && (
        <div style={{
          ...styles.recommendation,
          background: advice.recommendation === 'keep'
            ? 'rgba(39, 174, 96, 0.15)'
            : 'rgba(231, 76, 60, 0.15)',
          borderColor: advice.recommendation === 'keep'
            ? 'rgba(39, 174, 96, 0.4)'
            : 'rgba(231, 76, 60, 0.4)',
        }}>
          <div style={styles.recHeader}>
            <span style={{
              ...styles.recText,
              color: advice.recommendation === 'keep' ? '#27ae60' : '#e74c3c',
            }}>
              {advice.recommendation.toUpperCase()}
            </span>
            <span style={styles.confidence}>
              {Math.round(advice.confidence * 100)}% confident
            </span>
          </div>
          <div style={styles.scoreBar}>
            <div style={{
              ...styles.scoreFill,
              width: `${advice.score}%`,
              background: advice.score >= 60 ? '#27ae60' : advice.score >= 45 ? '#f39c12' : '#e74c3c',
            }} />
          </div>
        </div>
      )}

      {/* Hand display */}
      {handCards.length > 0 && (
        <div style={styles.handSection}>
          <div style={styles.sectionTitle}>Opening Hand ({handCards.length})</div>
          {handCards.map((card, i) => (
            <div key={i} style={styles.handCard}>
              <span style={styles.cardName}>{card.name}</span>
              {card.manaCost && (
                <span style={styles.manaCost}>{card.manaCost}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reasoning */}
      {advice && advice.reasoning.length > 0 && (
        <div style={styles.reasoningSection}>
          <div style={styles.sectionTitle}>Analysis</div>
          {advice.reasoning.map((reason, i) => (
            <div key={i} style={styles.reasonLine}>
              <span style={styles.bullet}>&#8226;</span>
              {reason}
            </div>
          ))}
        </div>
      )}

      {/* Hand stats */}
      {advice && (
        <div style={styles.stats}>
          <span>Lands: {advice.handAnalysis.landCount}</span>
          <span>Avg CMC: {advice.handAnalysis.avgCmc.toFixed(1)}</span>
          <span>Colors: {advice.handAnalysis.colors.join('') || '?'}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 6,
  },
  empty: {
    padding: '16px 0',
    textAlign: 'center' as const,
    color: '#5a4e3a',
    fontSize: 11,
  },
  recommendation: {
    padding: 8,
    borderRadius: 4,
    border: '1px solid',
    marginBottom: 6,
  },
  recHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recText: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
  },
  confidence: {
    fontSize: 10,
    color: '#8b7355',
  },
  scoreBar: {
    height: 3,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  handSection: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#8b7355',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    padding: '3px 0',
    borderBottom: '1px solid rgba(201, 168, 76, 0.1)',
    marginBottom: 2,
  },
  handCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
    fontSize: 11,
    borderBottom: '1px solid rgba(201, 168, 76, 0.04)',
  },
  cardName: {
    color: '#d4c4a8',
  },
  manaCost: {
    color: '#8b7355',
    fontSize: 10,
  },
  reasoningSection: {
    marginBottom: 6,
  },
  reasonLine: {
    fontSize: 10,
    color: '#a89878',
    padding: '1px 0',
    display: 'flex',
    gap: 4,
  },
  bullet: {
    color: '#c9a84c',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#6b5a3e',
    padding: '4px 0',
    borderTop: '1px solid rgba(201, 168, 76, 0.1)',
  },
};
