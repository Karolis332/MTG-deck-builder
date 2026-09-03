/**
 * Fetch benchmark reference decklists for the harness commander roster.
 *
 * Pulls real-world decklists from four sources and writes them to
 * decks/test-builds/refs/<slug>/<set>.json for convergence comparison
 * against engine builds. See SCENARIOS in test-deck-builds.ts for the
 * commander roster.
 *
 * Usage: npx tsx scripts/fetch-benchmark-refs.ts [--only <slug>] [--set <name>] [--format brawl]
 *
 * --format brawl restricts to moxfield-top (format=historicBrawl, min_cards=55)
 * and edhrec-avg (from <slug>--brawl-winning-reference.txt, if it exists),
 * writing <set>--brawl.json instead of <set>.json.
 */
import fs from 'fs';
import path from 'path';
import { SCENARIOS, type Scenario } from './test-deck-builds';
import { getCFApiUrl, buildCFHeaders } from '../src/lib/cf-api-client';

const OUT_DIR = path.join(process.cwd(), 'decks', 'test-builds', 'refs');
const SET_NAMES = ['moxfield-top', 'cedhtop16', 'edhrec-avg', 'topdeck'] as const;
type SetName = (typeof SET_NAMES)[number];

interface RefDeck {
  id: string;
  source: string;
  url?: string;
  likes?: number;
  views?: number;
  wins?: number;
  losses?: number;
  placement?: number;
  event?: string;
  cards: string[];
  /** Omitted (not zero/empty) when the source has no real quantity data —
   * the benchmark treats a missing key as "quantities unavailable" and
   * flags that set instead of silently reporting undercounted land totals. */
  counts?: Record<string, number>;
}

interface RefFile {
  set: SetName;
  commander: string;
  partner?: string;
  fetchedAt: string;
  decks: RefDeck[];
}

// ── args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const onlySlug = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
const setIdx = args.indexOf('--set');
const onlySet = setIdx >= 0 ? (args[setIdx + 1] as SetName) : null;

const formatIdx = args.indexOf('--format');
const brawlMode = formatIdx >= 0 && args[formatIdx + 1] === 'brawl';

const scenarios = onlySlug ? SCENARIOS.filter((s) => s.slug === onlySlug) : SCENARIOS;
// Brawl only has a moxfield-top corpus and (sometimes) a local reference —
// cedhtop16/topdeck are paper cEDH tournament data, no Brawl equivalent.
const sets = brawlMode ? (['moxfield-top', 'edhrec-avg'] as const) : onlySet ? [onlySet] : [...SET_NAMES];

// ── shared helpers ───────────────────────────────────────────────────────

function writeRef(slug: string, set: SetName, data: RefFile) {
  const dir = path.join(OUT_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  const filename = brawlMode ? `${set}--brawl.json` : `${set}.json`;
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}

// Strip commander/partner names, sum quantity across boards (main +
// commander-excluded) into counts, and dedupe into a unique-name list.
// Land totals must come from `counts`, never from `cards.length`.
interface CardEntry { name: string; qty: number }

function buildCardsAndCounts(entries: Iterable<CardEntry>, commander: string, partner?: string): { cards: string[]; counts: Record<string, number> } {
  const skip = new Set([commander.toLowerCase(), partner?.toLowerCase()].filter(Boolean));
  const counts: Record<string, number> = {};
  for (const { name, qty } of entries) {
    const trimmed = name.trim();
    if (!trimmed || skip.has(trimmed.toLowerCase())) continue;
    counts[trimmed] = (counts[trimmed] ?? 0) + qty;
  }
  return { cards: Object.keys(counts), counts };
}

// Parse the "N Card Name" text format used by winning-reference.txt and by
// inline (non-URL) topdeck/cedhtop16 decklist text.
function parseCardListText(text: string): CardEntry[] {
  const out: CardEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    const m = line.match(/^(\d+)\s+(.+?)(?:\s+\*CMDR\*)?$/);
    if (m) out.push({ name: m[2].trim(), qty: parseInt(m[1], 10) });
  }
  return out;
}

function moxfieldIdFromUrl(url: string): string | null {
  const m = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// ── set: moxfield-top (internal CF-API harness feed) ────────────────────

async function fetchMoxfieldTop(commander: string, partner?: string): Promise<RefDeck[]> {
  const cmd = partner ? `${commander} // ${partner}` : commander;
  const formatParams = brawlMode ? '&format=historicBrawl&min_cards=55' : '';
  const url = `${getCFApiUrl()}/commander-top-decks?commander=${encodeURIComponent(cmd)}&limit=30${formatParams}`;
  const resp = await fetch(url, { headers: buildCFHeaders() });
  if (!resp.ok) {
    console.warn(`  moxfield-top: HTTP ${resp.status}`);
    return [];
  }
  const data = await resp.json();
  return (data.decks || []).map((d: any) => ({
    id: String(d.source_id),
    source: d.source,
    url: d.url || undefined,
    likes: d.likes ?? undefined,
    views: d.views ?? undefined,
    ...buildCardsAndCounts(
      d.cards.map((c: any) => ({ name: c.card_name, qty: c.quantity })),
      commander,
      partner,
    ),
  }));
}

// Resolve a batch of Moxfield source_ids to cards via the internal CF-API
// endpoint (used by the topdeck.gg set, which links out to Moxfield decks).
// commander/partner must match what these decks were found under — the
// endpoint's source_ids mode still ANDs on the commander filter.
async function resolveViaCFApi(sourceIds: string[], commander: string, partner?: string): Promise<Map<string, CardEntry[]>> {
  const cmd = partner ? `${commander} // ${partner}` : commander;
  const out = new Map<string, CardEntry[]>();
  for (let i = 0; i < sourceIds.length; i += 50) {
    const batch = sourceIds.slice(i, i + 50);
    const url = `${getCFApiUrl()}/commander-top-decks?commander=${encodeURIComponent(cmd)}&source_ids=${batch.join(',')}`;
    const resp = await fetch(url, { headers: buildCFHeaders() });
    if (!resp.ok) continue;
    const data = await resp.json();
    for (const d of data.decks || []) {
      out.set(String(d.source_id), d.cards.map((c: any) => ({ name: c.card_name, qty: c.quantity })));
    }
  }
  return out;
}

// ── set: cedhtop16 (edhtop16.com GraphQL API — the REST API this task was
// originally specced against 302-redirects cedhtop16.com → edhtop16.com and
// its documented /api/req route now 404s there; the live site runs a
// GraphQL API instead, found via schema introspection. It returns maindeck
// cards inline, so no Moxfield/CF-API resolution step is needed here.) ────

const EDHTOP16_GRAPHQL = 'https://edhtop16.com/api/graphql';
const YEAR_MS = 365 * 24 * 3600 * 1000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function edhtop16Query(query: string, variables: Record<string, unknown>): Promise<any> {
  const resp = await fetch(EDHTOP16_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!resp.ok) throw new Error(`edhtop16 HTTP ${resp.status}`);
  const json = await resp.json();
  if (json.errors && !json.data?.commander) return null; // "no rows" = unknown commander name
  return json.data;
}

const CEDHTOP16_ENTRIES_QUERY = `
  query($n: String!) {
    commander(name: $n) {
      name
      entries(first: 30, sortBy: TOP, filters: { timePeriod: ONE_YEAR, minEventSize: 16 }) {
        edges {
          node {
            id
            wins
            losses
            standing
            decklist
            tournament { name TID }
            maindeck { name }
          }
        }
      }
    }
  }
`;

async function fetchCedhtop16(commander: string, partner?: string): Promise<RefDeck[]> {
  await sleep(500); // ≤2 req/s courtesy
  // Partner pairs are indexed under one exact "A / B" string — order matters
  // and isn't predictable, so try both.
  const names = partner ? [`${commander} / ${partner}`, `${partner} / ${commander}`] : [commander];

  let data: any = null;
  for (const n of names) {
    try {
      data = await edhtop16Query(CEDHTOP16_ENTRIES_QUERY, { n });
    } catch (e) {
      console.warn(`  cedhtop16: ${(e as Error).message}`);
      return [];
    }
    if (data?.commander) break;
    await sleep(500);
  }
  if (!data?.commander) return [];

  const edges = data.commander.entries?.edges ?? [];
  return edges.map(({ node }: any) => ({
    id: node.id,
    source: 'edhtop16',
    url: typeof node.decklist === 'string' ? node.decklist : undefined,
    wins: node.wins ?? undefined,
    losses: node.losses ?? undefined,
    placement: node.standing ?? undefined,
    event: node.tournament?.name ?? undefined,
    // edhtop16's maindeck is a deduped unique-card list with no quantity
    // field (verified: real 20+-copy basics report as 1 entry) — omit
    // `counts` entirely (not a fabricated qty=1) so the benchmark flags
    // this set's land/composition numbers as unavailable instead of
    // silently trusting an undercount.
    cards: buildCardsAndCounts(
      (node.maindeck ?? []).map((c: any) => ({ name: c.name, qty: 1 })),
      commander,
      partner,
    ).cards,
  }));
}

// ── set: edhrec-avg (local winning-reference.txt fixtures) ──────────────

function fetchEdhrecAvg(slug: string, commander: string, partner?: string): RefDeck[] {
  const filename = brawlMode ? `${slug}--brawl-winning-reference.txt` : `${slug}--winning-reference.txt`;
  const file = path.join(process.cwd(), 'decks', 'test-builds', filename);
  if (!fs.existsSync(file)) return [];
  const entries = parseCardListText(fs.readFileSync(file, 'utf8'));
  return [
    {
      id: slug,
      source: 'edhrec-avg',
      ...buildCardsAndCounts(entries, commander, partner),
    },
  ];
}

// ── set: topdeck (behind TOPDECK_API_KEY) ────────────────────────────────

const TOPDECK_BASE = 'https://topdeck.gg/api';

async function fetchTopdeck(commander: string, partner?: string): Promise<RefDeck[]> {
  const key = process.env.TOPDECK_API_KEY;
  if (!key) {
    console.log('topdeck: skipped (no TOPDECK_API_KEY)');
    return [];
  }
  const headers = { Authorization: key, 'Content-Type': 'application/json' };
  const start = Math.floor((Date.now() - YEAR_MS) / 1000);
  const end = Math.floor(Date.now() / 1000);

  const tResp = await fetch(`${TOPDECK_BASE}/v2/tournaments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ game: 'Magic: The Gathering', format: 'EDH', start, end, participantMin: 16 }),
  });
  if (!tResp.ok) {
    console.warn(`  topdeck tournaments: HTTP ${tResp.status}`);
    return [];
  }
  const tournaments = (await tResp.json()) as Array<{ TID: string; tournamentName?: string }>;

  const names = [commander, ...(partner ? [partner] : [])].map((n) => n.toLowerCase());
  const out: RefDeck[] = [];
  const moxIds: { id: string; url: string; standing: any; tName?: string }[] = [];

  for (const t of tournaments) {
    await sleep(600); // ≤100 req/min
    const sResp = await fetch(`${TOPDECK_BASE}/v2/tournaments/${t.TID}/standings`, { headers });
    if (!sResp.ok) continue;
    const standings = (await sResp.json()) as any[];
    for (const s of standings) {
      const commanderField = (s.commander ?? s.leader ?? '').toString().toLowerCase();
      if (!names.every((n) => commanderField.includes(n))) continue;
      const decklist = s.decklist as string | undefined;
      if (!decklist) continue;
      const moxId = moxfieldIdFromUrl(decklist);
      if (moxId) {
        moxIds.push({ id: moxId, url: decklist, standing: s, tName: t.tournamentName });
      } else {
        const entries = parseCardListText(decklist);
        if (entries.length) {
          out.push({
            id: `${t.TID}-${s.standing}`,
            source: 'topdeck-inline',
            wins: s.wins ?? undefined,
            losses: s.losses ?? undefined,
            placement: s.standing ?? undefined,
            event: t.tournamentName,
            ...buildCardsAndCounts(entries, commander, partner),
          });
        }
      }
    }
  }

  if (moxIds.length) {
    const cardsById = await resolveViaCFApi(moxIds.map((m) => m.id), commander, partner);
    for (const { id, url, standing, tName } of moxIds) {
      const rawCards = cardsById.get(id);
      if (!rawCards) continue;
      out.push({
        id,
        source: 'moxfield',
        url,
        wins: standing.wins ?? undefined,
        losses: standing.losses ?? undefined,
        placement: standing.standing ?? undefined,
        event: tName,
        ...buildCardsAndCounts(rawCards, commander, partner),
      });
    }
  }
  return out;
}

// ── main ──────────────────────────────────────────────────────────────────

async function fetchSet(set: SetName, scenario: Scenario): Promise<RefDeck[]> {
  const { slug, commander, partner } = scenario;
  switch (set) {
    case 'moxfield-top':
      return fetchMoxfieldTop(commander, partner);
    case 'cedhtop16':
      return fetchCedhtop16(commander, partner);
    case 'edhrec-avg':
      return fetchEdhrecAvg(slug, commander, partner);
    case 'topdeck':
      return fetchTopdeck(commander, partner);
  }
}

async function main() {
  const summary: Array<{ slug: string; set: SetName; count: number }> = [];

  for (const scenario of scenarios) {
    console.log(`\n== ${scenario.slug} ==`);
    for (const set of sets) {
      let decks: RefDeck[] = [];
      try {
        decks = await fetchSet(set, scenario);
      } catch (e) {
        console.warn(`  ${set}: FAILED — ${(e as Error).message}`);
      }
      if (decks.length || set !== 'topdeck' || process.env.TOPDECK_API_KEY) {
        writeRef(scenario.slug, set, {
          set,
          commander: scenario.commander,
          partner: scenario.partner,
          fetchedAt: new Date().toISOString(),
          decks,
        });
      }
      summary.push({ slug: scenario.slug, set, count: decks.length });
      console.log(`  ${set}: ${decks.length} decks`);
    }
  }

  console.log('\n== summary ==');
  console.table(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
