import fs from 'fs';
import Database from 'better-sqlite3';
import { pathToFileURL } from 'url';
async function main() {
  const ms = await import(pathToFileURL('C:/Users/QuLeR/mtg-wt-lands/src/lib/mana-sources.ts').href);
  const db = new Database('C:/Users/QuLeR/AppData/Roaming/the-black-grimoire/data/mtg-deck-builder.db', { readonly: true, fileMustExist: true });
  const row = db.prepare('SELECT * FROM cards WHERE name = ? ORDER BY updated_at DESC LIMIT 1');
  const count = (ci: string[], entries: Array<{ name: string; quantity: number }>) => {
    const cards = entries.map((e) => ({ card: row.get(e.name) as any, quantity: e.quantity })).filter((e) => e.card);
    const ctx = ms.buildManaSourceContext(ci, cards);
    const reliable = cards.filter((e) => ms.realManaSources(e.card, ctx).reliable);
    const total = ms.countColorSources(reliable, ctx);
    const per = new Map(cards.map((e) => [e.card.name, ms.realManaSources(e.card, ctx).reliable ? ms.countColorSources([e], ctx) : {}]));
    return { total, per, missing: entries.length - cards.length };
  };
  const fmt = (t: any, ci: string[]) => ci.map((c) => `${c}${t[c] ?? 0}`).join(' ');
  for (const k of ['tam', 'atraxa', 'tymna-thrasios', 'meren']) {
    const b = JSON.parse(fs.readFileSync(`verify-2026-09-30/lands/out-base/${k}.json`, 'utf8'));
    const t = JSON.parse(fs.readFileSync(`verify-2026-09-30/lands/out-tip/${k}.json`, 'utf8'));
    const ci: string[] = b.ci;
    const B = count(ci, b.lands.map((l: any) => ({ name: l.name, quantity: l.qty })));
    const T = count(ci, t.lands.map((l: any) => ({ name: l.name, quantity: l.qty })));
    console.log(`${k}: base ${fmt(B.total, ci)} -> tip ${fmt(T.total, ci)} (missing rows ${B.missing}/${T.missing})`);
    if (k === 'tam') {
      const bn = new Set(b.lands.map((l: any) => l.name)), tn = new Set(t.lands.map((l: any) => l.name));
      const show = (label: string, names: string[], per: Map<string, any>) => console.log(`  ${label}: ` + names.map((n) => `${n}=${Object.entries(per.get(n) || {}).filter(([, v]) => (v as number) > 0).map(([c, v]) => `${c}${v}`).join('') || '0'}`).join('; '));
      show('base-only', [...bn].filter((n) => !tn.has(n)) as string[], B.per);
      show('tip-only', [...tn].filter((n) => !bn.has(n)) as string[], T.per);
    }
  }
  const txt = fs.readFileSync('C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-30/arena-tam/final.txt', 'utf8');
  const names = txt.split(/\r?\n/).map((l) => l.trim().match(/^(\d+) (.+)$/)).filter(Boolean).map((m) => ({ name: m![2], quantity: Number(m![1]) }));
  const landNames = names.filter((e) => { const r = row.get(e.name) as any; return r && (r.type_line || '').split('//')[0].includes('Land'); });
  const E = count(['W', 'U', 'B', 'R', 'G'], landNames);
  console.log(`expert Tam (${landNames.length} lands, ${E.missing} rows missing): ${fmt(E.total, ['W', 'U', 'B', 'R', 'G'])}`);
  console.log('  zero-credit expert lands: ' + [...E.per].filter(([, v]) => !Object.values(v as any).some((x) => (x as number) > 0)).map(([n]) => n).join('; '));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
