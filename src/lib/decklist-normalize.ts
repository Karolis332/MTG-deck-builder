/**
 * Normalise pasted decklists (Arena, Moxfield, Archidekt, MTGO, plain names,
 * our own test-build files) into the Arena export shape that
 * `parseArenaExportWithMeta` understands. Pure — no DB.
 *
 * Handles: `//` and `#` comment lines, `About` / `Name X` headers, Moxfield
 * `*CMDR*` / `*F*` markers, Archidekt `[Commander{top}]` tags and `1x` counts,
 * "Sideboard (15)" style headers, number-less name lists, and the unlabeled
 * blank-line sideboard convention.
 */

export interface NormalizedDeckText {
  text: string;
  deckName?: string;
  commanderNames: string[];
  /** True when the text declares a sideboard explicitly (header or inferred trailing block). */
  hasSideboardHeader: boolean;
}

const COMMENT_RE = /^\s*(\/\/|#)/;
const CMDR_MARKER_RE = /\s*\*CMDR\*\s*/i;
const MARKER_RE = /\s*\*[A-Za-z]+\*\s*/g;
const BRACKET_TAG_RE = /\s*\[([^\]]*)\]\s*$/;
const SECTION_RE = /^\s*(commander|commanders|deck|main|mainboard|main deck|sideboard|side|companion)\s*:?\s*(\(\d+\))?\s*$/i;
const SIDEBOARD_RE = /^(sideboard|side)$/i;
const CARD_LINE_RE = /^\d+x?\s+\S/i;
const MAX_INFERRED_SIDEBOARD = 15;
const MIN_MAIN_FOR_INFERENCE = 40;

const CANONICAL_HEADER: Record<string, string> = {
  commander: 'Commander', commanders: 'Commander',
  deck: 'Deck', main: 'Deck', mainboard: 'Deck', 'main deck': 'Deck',
  sideboard: 'Sideboard', side: 'Sideboard',
  companion: 'Companion',
};

function lineQuantity(line: string): number {
  const m = line.match(/^(\d+)x?\s/i);
  return m ? parseInt(m[1], 10) : 1;
}

/** Split blank-line-separated card blocks and insert a Sideboard header before a small trailing block. */
function inferSideboard(lines: string[]): { lines: string[]; inferred: boolean } {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);
  if (blocks.length < 2) return { lines, inferred: false };
  const last = blocks[blocks.length - 1];
  const lastCount = last.reduce((s, l) => s + lineQuantity(l), 0);
  const mainCount = blocks.slice(0, -1).flat().reduce((s, l) => s + lineQuantity(l), 0);
  if (lastCount > MAX_INFERRED_SIDEBOARD || mainCount < MIN_MAIN_FOR_INFERENCE) return { lines, inferred: false };
  const out = [...blocks.slice(0, -1).flatMap((b) => [...b, '']), 'Sideboard', ...last];
  return { lines: out, inferred: true };
}

export function normalizeDeckText(raw: string): NormalizedDeckText {
  const commanderNames: string[] = [];
  const body: string[] = [];
  let deckName: string | undefined;
  let hasSideboardHeader = false;

  for (const rawLine of raw.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) {
      body.push('');
      continue;
    }
    if (COMMENT_RE.test(line)) continue;
    if (/^about$/i.test(line)) continue;
    const nameMatch = line.match(/^name\s+(.+)$/i);
    if (nameMatch && !CARD_LINE_RE.test(line)) {
      deckName = nameMatch[1].trim();
      continue;
    }
    const section = line.match(SECTION_RE);
    if (section) {
      const canonical = CANONICAL_HEADER[section[1].toLowerCase()];
      if (SIDEBOARD_RE.test(section[1])) hasSideboardHeader = true;
      body.push(canonical);
      continue;
    }
    let isCommander = false;
    if (CMDR_MARKER_RE.test(line)) {
      isCommander = true;
      line = line.replace(CMDR_MARKER_RE, ' ');
    }
    const tag = line.match(BRACKET_TAG_RE);
    if (tag) {
      if (/commander/i.test(tag[1])) isCommander = true;
      line = line.replace(BRACKET_TAG_RE, '');
    }
    line = line.replace(MARKER_RE, ' ').replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (isCommander) {
      commanderNames.push(line.replace(/^\d+x?\s+/i, '').replace(/\s+\([A-Za-z0-9]+\)\s+\S+$/, ''));
      continue;
    }
    body.push(line);
  }

  // A pure name list (no quantities anywhere) gets "1 " prefixes so the parser accepts it.
  const anyQuantity = body.some((l) => CARD_LINE_RE.test(l));
  const withQuantities = anyQuantity
    ? body
    : body.map((l) => (l && !CANONICAL_HEADER[l.toLowerCase()] ? `1 ${l}` : l));

  const collapsed = withQuantities.filter((l, i, arr) => !(l === '' && (i === 0 || arr[i - 1] === '')));
  while (collapsed.length && collapsed[collapsed.length - 1] === '') collapsed.pop();
  const inference = hasSideboardHeader ? { lines: collapsed, inferred: false } : inferSideboard(collapsed);

  return {
    text: inference.lines.join('\n'),
    deckName,
    commanderNames,
    hasSideboardHeader: hasSideboardHeader || inference.inferred,
  };
}
