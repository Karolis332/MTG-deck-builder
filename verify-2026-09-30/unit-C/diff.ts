// Cards in/out between two harness labels: npx tsx diff.ts baseline tip [slug]
import fs from 'fs';
import path from 'path';

const [a, b, only] = process.argv.slice(2);
const dir = (l: string) => path.join(__dirname, 'builds', l);
for (const f of fs.readdirSync(dir(a)).filter((f) => f.endsWith('.json'))) {
  const slug = f.replace(/\.json$/, '');
  if (only && slug !== only) continue;
  const pb = path.join(dir(b), f);
  if (!fs.existsSync(pb)) { console.log(`## ${slug}: no ${b} build`); continue; }
  const A = JSON.parse(fs.readFileSync(path.join(dir(a), f), 'utf8'));
  const B = JSON.parse(fs.readFileSync(pb, 'utf8'));
  const names = (x: any) => new Map<string, any>(x.cards.map((c: any) => [c.name, c]));
  const na = names(A); const nb = names(B);
  const fmt = (c: any) => `${c.qty} ${c.name} [${c.cmc} ${(c.type_line || '').slice(0, 24)}] role=${c.role || '-'} strict=${c.strict.join('/')}`;
  console.log(`## ${slug}: ${a} strategy ${A.summary.strategy} → ${b} strategy ${B.summary.strategy}`);
  console.log(`   strict  ${a} ${JSON.stringify(A.summary.strictCounts)}\n   strict  ${b} ${JSON.stringify(B.summary.strictCounts)}`);
  console.log(`   lands ${A.summary.lands} → ${B.summary.lands}   size ${A.summary.size} → ${B.summary.size}`);
  const out = [...na.values()].filter((c) => !nb.has(c.name));
  const inn = [...nb.values()].filter((c) => !na.has(c.name));
  console.log(`   OUT (${out.length}):`); for (const c of out) console.log('     - ' + fmt(c));
  console.log(`   IN  (${inn.length}):`); for (const c of inn) console.log('     + ' + fmt(c));
}
