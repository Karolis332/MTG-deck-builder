'use client';

import { useMemo } from 'react';
import type { DeckCardEntry } from '@/lib/game-state-engine';
import { CardLine } from './CardLine';

interface DeckTrackerProps {
  deckList: DeckCardEntry[];
  librarySize: number;
  drawProbabilities: Map<number, number> | Record<number, number>;
  cardsDrawn: number[];
}

interface GroupedCard {
  grpId: number;
  name: string;
  remaining: number;
  total: number;
  probability: number;
  manaCost: string | null;
  typeLine: string | null;
  cmc: number;
}

function getCategory(typeLine: string | null): string {
  if (!typeLine) return 'Other';
  const t = typeLine.toLowerCase();
  if (t.includes('land')) return 'Lands';
  if (t.includes('creature')) return 'Creatures';
  if (t.includes('instant')) return 'Instants';
  if (t.includes('sorcery')) return 'Sorceries';
  if (t.includes('enchantment')) return 'Enchantments';
  if (t.includes('artifact')) return 'Artifacts';
  if (t.includes('planeswalker')) return 'Planeswalkers';
  return 'Other';
}

const CATEGORY_ORDER = ['Creatures', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Planeswalkers', 'Lands', 'Other'];

export function DeckTracker({ deckList, librarySize, drawProbabilities, cardsDrawn }: DeckTrackerProps) {
  // Normalize drawProbabilities to a regular object
  const probMap = useMemo(() => {
    if (drawProbabilities instanceof Map) {
      return Object.fromEntries(drawProbabilities);
    }
    return drawProbabilities as Record<number, number>;
  }, [drawProbabilities]);

  const grouped = useMemo(() => {
    const cards: GroupedCard[] = deckList.map(entry => ({
      grpId: entry.grpId,
      name: entry.card?.name ?? `Card #${entry.grpId}`,
      remaining: entry.remaining,
      total: entry.qty,
      probability: probMap[entry.grpId] ?? 0,
      manaCost: entry.card?.manaCost ?? null,
      typeLine: entry.card?.typeLine ?? null,
      cmc: entry.card?.cmc ?? 0,
    }));

    // Group by category
    const groups: Record<string, GroupedCard[]> = {};
    for (const card of cards) {
      const cat = getCategory(card.typeLine);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(card);
    }

    // Sort within each group by probability descending
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => b.probability - a.probability);
    }

    return groups;
  }, [deckList, probMap]);

  const drawnSet = useMemo(() => new Set(cardsDrawn), [cardsDrawn]);

  return (
    <div style={styles.container}>
      <div style={styles.libraryCount}>
        Library: {librarySize} cards
      </div>

      {CATEGORY_ORDER.map(cat => {
        const cards = grouped[cat];
        if (!cards || cards.length === 0) return null;

        const remaining = cards.reduce((sum, c) => sum + c.remaining, 0);
        const total = cards.reduce((sum, c) => sum + c.total, 0);

        return (
          <div key={cat}>
            <div style={styles.categoryHeader}>
              {cat} ({remaining}/{total})
            </div>
            {cards.map(card => (
              <CardLine
                key={card.grpId}
                name={card.name}
                remaining={card.remaining}
                total={card.total}
                probability={card.remaining > 0 ? card.probability : null}
                isDrawn={drawnSet.has(card.grpId) && card.remaining === 0}
                manaCost={card.manaCost}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 0,
  },
  libraryCount: {
    padding: '4px 8px',
    fontSize: 10,
    color: '#c9a84c',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    borderBottom: '1px solid rgba(201, 168, 76, 0.15)',
  },
  categoryHeader: {
    padding: '3px 8px',
    fontSize: 10,
    color: '#8b7355',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    background: 'rgba(201, 168, 76, 0.05)',
  },
};
