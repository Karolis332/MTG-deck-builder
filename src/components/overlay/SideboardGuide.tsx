'use client';

import { useState, useEffect } from 'react';
import { getElectronAPI } from '@/lib/electron-bridge';
import type { SideboardPlan } from '@/lib/sideboard-guide';

interface SideboardGuideProps {
  isSideboarding: boolean;
  opponentCardsSeen: number[];
}

export function SideboardGuide({ isSideboarding, opponentCardsSeen }: SideboardGuideProps) {
  const [guides, setGuides] = useState<SideboardPlan[]>([]);
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Try to load cached guides
  useEffect(() => {
    const api = getElectronAPI();
    if (!api) return;

    // For now, guides need to be generated from the deck editor
    // In a future version, we could auto-detect the deck being played
  }, []);

  const selectedGuide = guides.find(g => g.opponentArchetype === selectedArchetype);

  if (!isSideboarding && guides.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <div style={styles.emptyText}>Sideboard guides appear during Bo3 intermissions</div>
          <div style={styles.hint}>Generate guides from the deck editor first</div>
          {opponentCardsSeen.length > 0 && (
            <div style={styles.hint}>
              {opponentCardsSeen.length} opponent cards tracked
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {isSideboarding && (
        <div style={styles.sideboardingBanner}>
          SIDEBOARDING
        </div>
      )}

      {loading && <div style={styles.loading}>Generating guides...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {/* Archetype selector */}
      {guides.length > 0 && (
        <div style={styles.archetypeList}>
          {guides.map(guide => (
            <button
              key={guide.opponentArchetype}
              onClick={() => setSelectedArchetype(guide.opponentArchetype)}
              style={{
                ...styles.archetypeBtn,
                ...(selectedArchetype === guide.opponentArchetype ? styles.archetypeBtnActive : {}),
              }}
            >
              {guide.opponentArchetype}
            </button>
          ))}
        </div>
      )}

      {/* Selected guide details */}
      {selectedGuide && (
        <div style={styles.guideDetail}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <span style={styles.inLabel}>IN</span>
            </div>
            {selectedGuide.cardsIn.map((card, i) => (
              <div key={i} style={styles.cardAction}>
                <span style={styles.inQty}>+{card.quantity}</span>
                <span style={styles.cardName}>{card.name}</span>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <span style={styles.outLabel}>OUT</span>
            </div>
            {selectedGuide.cardsOut.map((card, i) => (
              <div key={i} style={styles.cardAction}>
                <span style={styles.outQty}>-{card.quantity}</span>
                <span style={styles.cardName}>{card.name}</span>
              </div>
            ))}
          </div>

          {selectedGuide.strategyNotes && (
            <div style={styles.notes}>
              {selectedGuide.strategyNotes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 0,
  },
  empty: {
    padding: '16px 8px',
    textAlign: 'center' as const,
  },
  emptyText: {
    color: '#8b7355',
    fontSize: 11,
    marginBottom: 4,
  },
  hint: {
    color: '#5a4e3a',
    fontSize: 10,
  },
  sideboardingBanner: {
    padding: '4px 8px',
    background: 'rgba(201, 168, 76, 0.15)',
    color: '#c9a84c',
    fontSize: 11,
    fontWeight: 700,
    textAlign: 'center' as const,
    letterSpacing: 2,
    borderBottom: '1px solid rgba(201, 168, 76, 0.3)',
  },
  loading: {
    padding: '8px',
    color: '#8b7355',
    fontSize: 11,
    textAlign: 'center' as const,
  },
  error: {
    padding: '8px',
    color: '#e74c3c',
    fontSize: 10,
  },
  archetypeList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 2,
    padding: '4px 6px',
    borderBottom: '1px solid rgba(201, 168, 76, 0.15)',
  },
  archetypeBtn: {
    padding: '2px 6px',
    background: 'rgba(201, 168, 76, 0.1)',
    border: '1px solid rgba(201, 168, 76, 0.2)',
    borderRadius: 3,
    color: '#8b7355',
    fontSize: 10,
    cursor: 'pointer',
  },
  archetypeBtnActive: {
    background: 'rgba(201, 168, 76, 0.25)',
    color: '#c9a84c',
    borderColor: 'rgba(201, 168, 76, 0.5)',
  },
  guideDetail: {
    padding: 6,
  },
  section: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    padding: '2px 0',
    borderBottom: '1px solid rgba(201, 168, 76, 0.1)',
    marginBottom: 2,
  },
  inLabel: {
    color: '#27ae60',
  },
  outLabel: {
    color: '#e74c3c',
  },
  cardAction: {
    display: 'flex',
    alignItems: 'center',
    padding: '1px 0',
    fontSize: 11,
  },
  inQty: {
    color: '#27ae60',
    fontWeight: 600,
    width: 20,
    fontSize: 10,
  },
  outQty: {
    color: '#e74c3c',
    fontWeight: 600,
    width: 20,
    fontSize: 10,
  },
  cardName: {
    color: '#d4c4a8',
  },
  notes: {
    padding: '4px 0',
    fontSize: 10,
    color: '#8b7355',
    fontStyle: 'italic',
    borderTop: '1px solid rgba(201, 168, 76, 0.1)',
  },
};
