import type { ArenaImportLine } from './types';

// ── Tab-separated collection format ─────────────────────────────────────────
// Handles formats like: "6873\tCrash of Rhinos\tAA4\tGreen\tCommon\t0\t0"
// Columns: id, name, set, color, rarity, quantity, quantity_foil

const TSV_LINE = /^\d+\t.+\t\w+\t\w+\t\w+\t\d+\t\d+$/;

export function detectFormat(text: string): 'arena' | 'tsv' {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return 'arena';
  const sample = lines.slice(0, 5);
  const tsvCount = sample.filter((l) => TSV_LINE.test(l)).length;
  return tsvCount >= Math.min(2, sample.length) ? 'tsv' : 'arena';
}

export interface TsvImportLine {
  name: string;
  setCode: string;
  quantity: number;
  quantityFoil: number;
}

export function parseTsvCollection(text: string): TsvImportLine[] {
  const lines = text.split(/\r?\n/);
  const result: TsvImportLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split('\t');
    if (parts.length < 7) continue;

    const [, name, setCode, , , qtyStr, qtyFoilStr] = parts;
    const quantity = parseInt(qtyStr, 10);
    const quantityFoil = parseInt(qtyFoilStr, 10);

    // Skip cards you own 0 of
    if (quantity + quantityFoil <= 0) continue;

    result.push({
      name: name.trim(),
      setCode: setCode.trim().toUpperCase(),
      quantity,
      quantityFoil,
    });
  }

  return result;
}

// ── Arena export format ─────────────────────────────────────────────────────

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

export interface ArenaParseResult {
  cards: ArenaImportLine[];
  deckName?: string;
}

export function parseArenaExportWithMeta(text: string): ArenaParseResult {
  const lines = text.split(/\r?\n/);
  let deckName: string | undefined;

  // Check first non-empty line: if it's not a card line and not a section header, treat it as deck name
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue; // skip leading blank lines
    const lower = trimmed.toLowerCase().replace(/:$/, '');
    if (!LINE_REGEX.test(trimmed) && !SECTION_HEADERS[lower]) {
      deckName = trimmed;
      lines.splice(i, 1); // remove name line before parsing cards
    }
    break; // only check the first non-empty line
  }

  const cards = parseArenaExport(lines.join('\n'));
  return { cards, deckName };
}

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
