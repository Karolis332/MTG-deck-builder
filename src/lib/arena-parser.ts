import type { ArenaImportLine } from './types';

const SECTION_HEADERS: Record<string, ArenaImportLine['board']> = {
  deck: 'main',
  maindeck: 'main',
  main: 'main',
  mainboard: 'main',
  sideboard: 'sideboard',
  side: 'sideboard',
  commander: 'commander',
  companion: 'companion',
};

// Matches: "4 Lightning Bolt (2X2) 117" or "4 Lightning Bolt" or "4x Lightning Bolt"
const LINE_REGEX = /^(\d+)x?\s+(.+?)(?:\s+\((\w+)\)\s+(\S+))?$/i;

export function parseArenaExport(text: string): ArenaImportLine[] {
  const lines = text.split(/\r?\n/);
  const result: ArenaImportLine[] = [];
  let currentBoard: ArenaImportLine['board'] = 'main';
  let lastWasBlank = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      // Blank line after cards typically means sideboard follows
      if (result.length > 0 && !lastWasBlank) {
        lastWasBlank = true;
      }
      continue;
    }

    // Check if it's a section header
    const lowerLine = line.toLowerCase().replace(/:$/, '');
    if (SECTION_HEADERS[lowerLine]) {
      currentBoard = SECTION_HEADERS[lowerLine];
      lastWasBlank = false;
      continue;
    }

    // If we had a blank line and haven't seen an explicit section header, assume sideboard
    if (lastWasBlank && currentBoard === 'main') {
      currentBoard = 'sideboard';
    }
    lastWasBlank = false;

    const match = line.match(LINE_REGEX);
    if (!match) continue;

    const [, qty, name, setCode, collectorNumber] = match;

    result.push({
      quantity: parseInt(qty, 10),
      name: name.trim(),
      setCode: setCode?.toUpperCase(),
      collectorNumber: collectorNumber,
      board: currentBoard,
    });
  }

  return result;
}

export function formatArenaExport(
  cards: Array<{
    name: string;
    quantity: number;
    set_code?: string;
    collector_number?: string;
    board: string;
  }>
): string {
  const sections: Record<string, typeof cards> = {};

  for (const card of cards) {
    const board = card.board || 'main';
    if (!sections[board]) sections[board] = [];
    sections[board].push(card);
  }

  const parts: string[] = [];

  if (sections.commander?.length) {
    parts.push('Commander');
    for (const c of sections.commander) {
      parts.push(formatCardLine(c));
    }
    parts.push('');
  }

  if (sections.companion?.length) {
    parts.push('Companion');
    for (const c of sections.companion) {
      parts.push(formatCardLine(c));
    }
    parts.push('');
  }

  if (sections.main?.length) {
    parts.push('Deck');
    for (const c of sections.main) {
      parts.push(formatCardLine(c));
    }
    parts.push('');
  }

  if (sections.sideboard?.length) {
    parts.push('Sideboard');
    for (const c of sections.sideboard) {
      parts.push(formatCardLine(c));
    }
  }

  return parts.join('\n').trim();
}

function formatCardLine(card: {
  name: string;
  quantity: number;
  set_code?: string;
  collector_number?: string;
}): string {
  let line = `${card.quantity} ${card.name}`;
  if (card.set_code && card.collector_number) {
    line += ` (${card.set_code.toUpperCase()}) ${card.collector_number}`;
  }
  return line;
}
