import type { DeckCardEntry } from './types';

export function exportToArena(
  deckName: string,
  cards: DeckCardEntry[]
): string {
  const sections: Record<string, DeckCardEntry[]> = {};
  for (const card of cards) {
    const board = card.board || 'main';
    if (!sections[board]) sections[board] = [];
    sections[board].push(card);
  }

  const lines: string[] = [];

  if (sections.commander?.length) {
    lines.push('Commander');
    for (const c of sections.commander) {
      lines.push(formatLine(c));
    }
    lines.push('');
  }

  if (sections.companion?.length) {
    lines.push('Companion');
    for (const c of sections.companion) {
      lines.push(formatLine(c));
    }
    lines.push('');
  }

  if (sections.main?.length) {
    lines.push('Deck');
    for (const c of sections.main) {
      lines.push(formatLine(c));
    }
    lines.push('');
  }

  if (sections.sideboard?.length) {
    lines.push('Sideboard');
    for (const c of sections.sideboard) {
      lines.push(formatLine(c));
    }
  }

  return lines.join('\n').trim();
}

export function exportToText(
  deckName: string,
  cards: DeckCardEntry[]
): string {
  const lines: string[] = [`// ${deckName}`, ''];
  const mainCards = cards.filter((c) => c.board === 'main');
  const sideCards = cards.filter((c) => c.board === 'sideboard');
  const cmdCards = cards.filter((c) => c.board === 'commander');

  if (cmdCards.length) {
    lines.push('// Commander');
    for (const c of cmdCards) {
      lines.push(`${c.quantity}x ${c.card.name}`);
    }
    lines.push('');
  }

  if (mainCards.length) {
    lines.push('// Maindeck');
    for (const c of mainCards) {
      lines.push(`${c.quantity}x ${c.card.name}`);
    }
    lines.push('');
  }

  if (sideCards.length) {
    lines.push('// Sideboard');
    for (const c of sideCards) {
      lines.push(`${c.quantity}x ${c.card.name}`);
    }
  }

  return lines.join('\n').trim();
}

export function exportToMtgo(
  deckName: string,
  cards: DeckCardEntry[]
): string {
  const mainCards = cards.filter((c) => c.board === 'main' || c.board === 'commander');
  const sideCards = cards.filter((c) => c.board === 'sideboard');

  const lines: string[] = [];
  for (const c of mainCards) {
    lines.push(`${c.quantity} ${c.card.name}`);
  }
  if (sideCards.length) {
    lines.push('');
    lines.push('Sideboard');
    for (const c of sideCards) {
      lines.push(`${c.quantity} ${c.card.name}`);
    }
  }

  return lines.join('\n').trim();
}

function formatLine(c: DeckCardEntry): string {
  return `${c.quantity} ${c.card.name} (${c.card.set_code.toUpperCase()}) ${c.card.collector_number}`;
}
