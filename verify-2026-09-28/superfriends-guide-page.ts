/**
 * One-off: the Tam superfriends deck guide as a standalone HTML page (deck by role with card
 * images + sleeve ticks, engine, win lines, order list, held-back and bench cards).
 *
 *   MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx verify-2026-09-28/superfriends-guide-page.ts
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(__dirname, '..');
const LIST = path.join(ROOT, 'decks/paper/proposals/superfriends-tam.txt');
const OUT = [path.join(ROOT, 'decks/paper/superfriends-tam.html'), 'C:/Users/QuLeR/Desktop/MTG collection/MTG decks/superfriends-tam.html'];

const dbDir = process.env.MTG_DB_DIR || path.join(process.env.APPDATA!, 'the-black-grimoire', 'data');
const db = new Database(path.join(dbDir, 'mtg-deck-builder.db'), { readonly: true });
const cardQ = db.prepare(
  "select name, cmc, type_line, mana_cost, image_uri_normal as img from cards where name = ? or name like ? order by (layout not in ('art_series','token')) desc, (image_uri_normal is not null) desc, length(name) limit 1",
);
type Card = { name: string; cmc: number; type_line: string; mana_cost: string | null; img: string | null };
const card = (n: string): Card => {
  const c = cardQ.get(n, n + ' // %') as Card | undefined;
  if (!c) throw new Error('unresolved: ' + n);
  return c;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const deck = fs.readFileSync(LIST, 'utf8').trim().split(/\r?\n/).map((l) => /^(\d+) (.+)$/.exec(l.trim())!).map((m) => ({ qty: +m[1], name: m[2] }));
const [commander, ...main] = deck;

const GROUPS: [string, string, string[]][] = [
  ['Walkers', 'Tam makes all of these but Jared cost {1} less.', ['Chandra, Torch of Defiance', 'Chandra, Fire Artisan', 'Oko, Thief of Crowns', 'Elspeth, Sun\'s Champion', 'Ajani Unrelenting', 'Ajani Resolute', 'Professor Dellian Fel', 'Vraska, Betrayal\'s Sting', 'Jared Carthalion', 'Sarkhan the Masterless', 'Ob Nixilis Reignited', 'Jace, Reality Sculptor', 'Sorin, Vengeful Bloodlord', 'The Wanderer', 'Jace, Memory Adept', 'Saheeli, Sublime Artificer', 'Kaya, Intangible Slayer', 'Kaito, Dancing Shadow', 'Quintorius Kand']],
  ['Ways', 'Each one creates the Jace token or adds 2–7 loyalty to it, and gives every walker a new ability.', ['Way of the Mentor', 'Way of the Paradox', 'Way of the Pyromancer', 'Way of the Mind Sculptor', 'Way of the Warlord', 'Way of the Wildspeaker', 'Way of the Healer']],
  ['Jace token package', 'Adds loyalty to the Jace token and finds the pieces.', ['Protege\'s Awakening', 'Avatar of Burgeoning Echoes', 'Arcane Amphisbaena', 'Rewrite Regrets', 'Entrust the Spark', 'Pia, Aether Ascetic']],
  ['Protection', 'Keeps attackers, removal and wipes off the walkers.', ['Tomik, Orzhov Lawmage', 'Archangel of Tithes', 'Liliana the Faultless', 'Counterspell', 'Dovin\'s Veto', 'Boros Charm', 'Vigorbloom Charm']],
  ['Engine', "Flux Channeler proliferates on every noncreature spell, Thrummingbird on every hit.", ['Flux Channeler', 'Thrummingbird', 'Geist of Saint Thalia', 'Evolution Sage']],
  ['Ramp', 'Timeless Lotus taps for {W}{U}{B}{R}{G}, which pays for Tam\'s proliferate every turn by itself. Great Hall of the Citadel (in Lands) makes two colours for any legendary spell. Great Divide Guide lets every land tap for any colour.', ['Timeless Lotus', 'Sol Ring', 'Arcane Signet', 'Talisman of Progress', 'Talisman of Dominance', 'Talisman of Conviction', 'Bloom Tender', 'Faeburrow Elder', 'Farseek', 'Great Divide Guide', 'Omenpath Journey']],
  ['Removal', 'Toxic Deluge, Settle the Wreckage, Fumigate and Final Act kill creatures and leave your walkers standing. Fumigate\'s life gain also triggers Way of the Mentor.', ['Path to Exile', 'Erode', 'Assassin\'s Trophy', 'Atomize', 'Vraska\'s Final Mercy', 'Toxic Deluge','Settle the Wreckage', 'Fumigate', 'Final Act']],
];
const grouped = new Set(GROUPS.flatMap((g) => g[2]));
const lands = main.filter((l) => !grouped.has(l.name));
for (const n of grouped) if (!main.some((l) => l.name === n)) throw new Error('group card not in list: ' + n);
for (const l of lands) if (!/Land/.test(card(l.name).type_line)) throw new Error('ungrouped nonland: ' + l.name);
GROUPS.push(['Lands', '', lands.map((l) => l.name)]);

const qtyOf = (n: string) => main.find((l) => l.name === n)?.qty ?? 1;
const total = deck.reduce((s, l) => s + l.qty, 0);
const landCount = lands.reduce((s, l) => s + l.qty, 0);
const spells = main.filter((l) => !lands.includes(l)).map((l) => card(l.name));
const curve = new Map<number, number>();
for (const c of spells) curve.set(Math.min(7, c.cmc), (curve.get(Math.min(7, c.cmc)) || 0) + 1);
const avg = spells.reduce((s, c) => s + c.cmc, 0) / spells.length;
const maxBar = Math.max(...curve.values());

const tile = (n: string, tick: boolean) => {
  const c = card(n);
  const q = qtyOf(n);
  return `<label class="card">${tick ? `<input type="checkbox" data-n="${esc(n)}">` : ''}<img loading="lazy" src="${esc(c.img || '')}" alt="${esc(c.name)}"><span class="meta"><b>${q > 1 ? q + '× ' : ''}${esc(c.name)}</b><small>${esc(c.mana_cost || '')} · ${esc(c.type_line)}</small></span></label>`;
};
const thumbs = (names: string[]) => names.map((n) => `<img class="thumb" loading="lazy" src="${esc(card(n).img || '')}" alt="${esc(n)}" title="${esc(n)}">`).join('');

const ENGINE = [
  ['Way of the Paradox', 'Every loyalty ability you use gains you 1 life.'],
  ['Way of the Mentor', 'Every time you gain life, put +1 loyalty on every walker.'],
  ['Liliana the Faultless', '1 life whenever a walker or creature enters.'],
  ['Interplanar Beacon', '1 life per walker you cast.'],
  ['Sorin, Vengeful Bloodlord', 'Your walkers have lifelink on your turn.'],
  ['Kaya, Intangible Slayer', 'Her +2 drains each opponent for 3 and gains you life.'],
];

const WINS: [string, string, string[]][] = [
  ['Jace wipes out their libraries', 'Jace, Reality Sculptor\'s 0 ability works once your Jaces have 25+ loyalty combined. It exiles all but the bottom card of each opponent\'s library, so they lose on their second draw. The Ways add 2–7 to the Jace token each, Protege\'s Awakening and Vraska\'s Final Mercy add 6, Avatar adds 2 per land, and Tam plus Mentor keep pumping it. Jace, Memory Adept is a second Jace, so its loyalty counts too, and its 0 mills 10 to speed the finish. Entrust the Spark puts Jace straight onto the battlefield, and Pia finds a Way.', ['Jace, Reality Sculptor', 'Jace, Memory Adept', 'Entrust the Spark', 'Protege\'s Awakening']],
  ['Poison kill', 'Vraska, Betrayal\'s Sting −9 puts one player at 9 poison. Any proliferate finishes them: Vraska\'s own 0, Tam\'s ability, an Evolution Sage landfall or a Thrummingbird hit.', ['Vraska, Betrayal\'s Sting', 'Evolution Sage', 'Thrummingbird']],
  ['Dragon attack', 'Sarkhan the Masterless +1 turns every walker into a 4/4 flying Dragon. Then Ajani Unrelenting +1 gives them haste and +1/+0, and each activation also makes a Cadet. Five walkers means 25 flying damage.', ['Sarkhan the Masterless', 'Ajani Unrelenting']],
  ['Ultimates', 'With the engine running, every walker climbs 2–3 loyalty a turn. Main targets: Elspeth −7 (+2/+2 and flying for your tokens), Chandra −7, Ajani Resolute −10, and Kaya +2 draining each opponent for 3 every turn.', ['Elspeth, Sun\'s Champion', 'Kaya, Intangible Slayer', 'Chandra, Torch of Defiance']],
  ['Drain', 'Quintorius drains 2 per opponent whenever you cast from exile, which Chandra\'s +1 does every turn.', ['Quintorius Kand', 'Chandra, Fire Artisan']],
];

const ORDER: [number, string[], string, string, string][] = [
  [1, ['The Chain Veil', 'Teferi, Temporal Archmage'], '7.40 + 1.50', '<b>Infinite combo with the cards you have.</b> Teferi\'s −1 untaps the Veil plus Timeless Lotus, Faeburrow Elder or Bloom Tender for more mana than the Veil costs. Paradox + Mentor give Teferi back the loyalty he spent, so the loop never ends: infinite activations on every walker, and Kaya\'s +2 kills the table. It needs 4 specific cards, so it stays bracket 3.', 'Kaito, Tomik'],
  [1, ['Oath of Teferi'], '1.07', 'Use every walker\'s loyalty ability twice a turn. With the engine, each walker gains roughly 2 loyalty per turn.', 'Way of the Warlord'],
  [1, ['Carth the Lion'], '0.27', 'Plus abilities add 1 extra and minus abilities cost 1 less. When a walker dies, it looks at your top 7 cards for another.', 'Arcane Amphisbaena'],
  [1, ['Deepglow Skate'], '0.32', 'Doubles every counter when it enters, which can take the Jace token straight toward 25.', 'Saheeli'],
  [2, ['Karn\'s Bastion'], '2.75', 'A land that proliferates.', 'Exotic Orchard'],
  [2, ['Ghostly Prison', 'Norn\'s Annex', 'Propaganda'], '5.81 / 5.64 / 2.03', 'Opponents pay to attack you or your walkers.', 'Boros Charm, Vigorbloom Charm'],
  [3, ['Ichormoon Gauntlet'], '21.84', 'Every walker gets "0: proliferate" and "−12: take an extra turn".', 'Rewrite Regrets'],
  [3, ['Raffine\'s Tower', 'Spara\'s Headquarters', 'Jetmir\'s Garden', 'Xander\'s Lounge', 'Zagoth Triome'], '13–21 each', 'Replace the 5 tri-lands, which enter tapped with no upside.', 'tri-lands'],
];

const HELD: [string, string, string][] = [
  ['Swords to Plowshares', 'Tazri', 'Bedevil slot (now Path/Erode)'],
  ['Sakura-Tribe Elder', 'Meren (a core piece there)', 'a ramp slot'],
  ['Fellwar Stone', 'Tazri', 'a Talisman'],
  ['Inspiring Vantage', 'Tazri', 'Bleachbone Verge'],
  ['Gilded Lotus', 'Imotekh', 'not needed'],
  ['Liliana, Dreadhorde General', 'Meren (its sacrifice-and-draw engine)', 'kept there'],
];

const BENCH: [string, string][] = [
  ['Fatehold Charm', 'Thrummingbird took the slot: a 2-mana flier that proliferates on every hit (loyalty on every walker, Jace counters, Vraska poison).'],
  ['Shatter the Sky', 'Fumigate took the slot: its life gain triggers Way of the Mentor, and it gives opponents no cards.'],
  ['Cultivate', 'Great Divide Guide took the slot: 2 mana, and every land taps for any colour. Cultivate needs basics; the deck has four.'],
  ['Cinder Glade', 'Shivan Reef took the slot: enters untapped; U/R was the thinnest colour pair.'],
  ['Sunken Hollow', 'Enters tapped with only four basics; Shipwreck Marsh and Theorix Annex already cover U/B.'],
  ['Overwhelming Forces', 'Eight mana to wipe one opponent; the cheaper wipes cover it.'],
  ['Kasmina, Enigmatic Mentor', 'Jace, Memory Adept took the slot: a second Jace for the 25-loyalty win, plus card draw.'],
  ['Evolving Wilds', 'Mana Confluence took the slot: untapped, any colour, 1 life per tap.'],
  ['Fire Covenant', 'Toxic Deluge took the slot: a full wipe for 3 mana instead of paying life per creature.'],
  ['Identity Echo', 'Fun roulette, but {3}{R} per use at sorcery speed; Timeless Lotus took the slot.'],
  ['Path of Ancestry', 'Enters tapped; Great Hall of the Citadel took the slot.'],
  ["Innkeeper's Talent", 'Owned but not found yet; Way of the Healer holds the slot. Put it back in when found: at level 3 it doubles every counter you put.'],
  ['Teyo, the Shieldmage', 'Flux Channeler took the slot; Teyo protects you, not your walkers.'],
  ['Generous Gift', 'Atomize does the same job and proliferates.'],
  ['Moment of Reckoning', 'Destroys up to four things or returns up to four walkers, but costs 7. First card to add if games run long.'],
  ['Way of the Cryomancer', 'The 8th Way; copying one instant is weaker than the other seven.'],
  ['Liliana, Death Wielder', 'Costs 7 mana for a +2 that only shrinks one creature.'],
  ['Sarkhan, the Dragonspeaker', 'The weakest walker once Sarkhan the Masterless arrived.'],
  ['Kaya, Bane of the Dead', 'Intangible Slayer is stronger.'],
  ['Tamiyo, Inquisitive Student', 'Only flips if you draw three cards in a turn.'],
  ['Nissa, Who Shakes the World', 'Her mana boost needs Forests; the deck has three.'],
  ['Plan for All Outcomes', 'Four-mana removal; the slots are full.'],
  ['Tam\'s Resistance', 'Jace fuel; Protege\'s Awakening draws a card too.'],
  ['Three Steps Ahead', 'Counterspell and Dovin\'s Veto are enough.'],
  ['Countersculpt', 'Counterspell and Dovin\'s Veto are enough.'],
  ['Vindictive Triumph', 'Good removal; the removal slots are full.'],
  ['Alms Collector', 'Flash 3/3 flier, but no slot left.'],
  ['Baeloth Barrityl, Entertainer', 'Goads enemy creatures toward other players, but costs 5.'],
];
const BENCH_MORE = 'Domri, Mu Yanling, Ral Zarek, Oko, Lorwyn Liege, Ob Nixilis, the Hate-Twisted, Dovin, Nahiri, Davriel, Tezzeret, Arlinn, Vivien, Chandra, Spark Hunter, Samut, Angrath, Jaya, Ashiok, Jiang Yanggu, Nissa, Steward of Elements, Vraska, Swarm\'s Eminence · Sheoldred\'s Edict, Black Sun\'s Zenith, Chain Reaction, Bedevil, Terminate, Putrefy, Infernal Grasp, Violent Echoes, No Admittance, Binding the Old Gods, Final Showdown, The Echoverse Fulcrum, Strix Serenade, Theorix / Stingerquill / Konstrari / Sultai / Simic Charm, Hindering Light, Spell Pierce · Chimil, Glissa, Uro, Contagion Clasp, Inspired Tethermage, Mindseeker Oculus, Kaya\'s Ghostform, Teyo, Lightshield Expert · Painful Truths, Night\'s Whisper, Harmonize, Syphon Mind, Growth Spiral, Rampant Growth, Kodama\'s Reach, Commander\'s Sphere, Talisman of Hierarchy / Unity, Lockets, Bender\'s Waterskin, Tome of the Guildpact, Nyx Lotus, mana dorks.';

const cmd = card(commander.name);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tam, the Possibility — Superfriends</title><style>
body{margin:0;background:#15110d;color:#e8dcc4;font:15px/1.45 Georgia,serif}header{position:sticky;top:0;background:#1d1711;border-bottom:1px solid #6b5220;padding:10px 18px;display:flex;gap:18px;align-items:center;z-index:3;flex-wrap:wrap}
h1{font-size:19px;margin:0;color:#d4af37;letter-spacing:.04em}h2{font-size:17px;color:#d4af37;margin:26px 18px 8px;border-bottom:1px solid #3a2d17;padding-bottom:4px}h2 small{font-weight:normal;font-size:13px;color:#b5a27b;margin-left:8px}
nav a{color:#b5a27b;font-size:13px;margin-right:12px;text-decoration:none}nav a:hover{color:#d4af37}
.cmd{display:flex;gap:22px;align-items:flex-start;padding:16px 18px 4px;flex-wrap:wrap}.cmd img{width:220px;border-radius:10px}.facts{font-size:14px;color:#b5a27b;line-height:1.7}.facts b{color:#e8dcc4}
.curve{display:flex;gap:8px;align-items:flex-end;height:90px;margin-top:8px}.bar{display:flex;flex-direction:column;align-items:center;width:26px}.bar span{display:block;width:22px;background:#8b6914;border-radius:3px 3px 0 0}.bar em{font:11px monospace;color:#b5a27b;margin-top:2px}.bar i{font:10px monospace;color:#e8dcc4}
.box{margin:0 18px;background:#1d1711;border:1px solid #3a2d17;border-radius:8px;padding:12px 16px}.box p{margin:4px 0}
.engine{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}.engine div{display:flex;gap:10px;align-items:center}.engine b{color:#d4af37}
.thumb{width:62px;border-radius:4px;vertical-align:middle}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:0 18px}
.card{display:block;background:#221b13;border:1px solid #3a2d17;border-radius:8px;padding:6px;cursor:pointer;position:relative}.card:has(input:checked){opacity:.35;filter:grayscale(1)}.card input{position:absolute;top:10px;left:10px;width:20px;height:20px;accent-color:#d4af37;z-index:1}
.card img{width:100%;aspect-ratio:488/680;border-radius:6px;display:block;background:#0e0b08}.meta{padding:6px 2px 0;display:block}.meta b{display:block;font-size:13px;line-height:1.2}.meta small{color:#b5a27b;font-size:11px;display:block}
table{border-collapse:collapse;margin:0 18px;width:calc(100% - 36px)}td,th{border-bottom:1px solid #3a2d17;padding:8px 8px;vertical-align:top;text-align:left;font-size:14px}th{color:#d4af37;font-weight:normal;font-size:13px}td.n{white-space:nowrap}
.tier{display:inline-block;border-radius:10px;padding:1px 9px;font:12px monospace}.t1{background:#6b5220;color:#fff}.t2{background:#3a2d17}.t3{background:#2a2118;color:#b5a27b}
.win td:first-child{width:210px}.win b{color:#d4af37}.muted{color:#b5a27b;font-size:13px}
#done{color:#b5a27b;font-size:13px}button{background:#2a2118;color:#e8dcc4;border:1px solid #6b5220;border-radius:6px;padding:4px 10px;cursor:pointer}
footer{margin:30px 18px;color:#7d6c4d;font-size:12px}@media print{header button,.card input,nav{display:none}}
</style></head><body>
<header><h1>Tam, the Possibility — Superfriends</h1><span class="muted">${total} cards · ${landCount} lands · ${GROUPS[0][2].length} walkers · ${GROUPS[1][2].length} Ways · 0 game changers</span><span id="done"></span><button id="reset">Reset ticks</button>
<nav style="margin-left:auto"><a href="#engine">Engine</a><a href="#wins">Win lines</a><a href="#deck">Deck</a><a href="#order">Order</a><a href="#held">Held back</a><a href="#bench">Bench</a></nav></header>
<div class="cmd"><img src="${esc(cmd.img || '')}" alt="${esc(cmd.name)}"><div class="facts">
<b>Commander:</b> Tam, the Possibility — walker spells cost {1} less; {W}{U}{B}{R}{G}, {T}: proliferate once per walker type you control.<br>
<b>Plan:</b> land walkers early, run the Paradox + Mentor loyalty engine, protect the board, then win with Jace, poison, Dragons or ultimates.<br>
<b>Average mana value:</b> ${avg.toFixed(2)} before Tam's discount (about 3.1 after it) · <b>Bracket:</b> 2–3 (no game changers, no two-card combos)<br>
<b>Deck gate:</b> size, singleton, legality, colour identity, ownership and lands pass; the "plan" check fails only because it has no planeswalker category.<br>
<b>Colour sources:</b> W 17 · U 14 · B 17 · R 14 · G 16, plus Interplanar Beacon for walkers.
<div class="curve">${[...Array(8).keys()].map((m) => { const v = curve.get(m) || 0; return `<div class="bar"><i>${v || ''}</i><span style="height:${Math.round((v / maxBar) * 64)}px"></span><em>${m === 7 ? '7+' : m}</em></div>`; }).join('')}</div>
</div></div>

<h2 id="engine">The engine</h2><div class="box">
<p>Every loyalty ability gains you 1 life (Paradox), and every life gain puts +1 loyalty on <b>every</b> walker (Mentor). So each activation also pumps the whole team. These cards gain you life too, and each gain triggers Mentor again:</p>
<div class="engine">${ENGINE.map(([n, t]) => `<div>${thumbs([n])}<span><b>${esc(n)}</b><br><span class="muted">${esc(t)}</span></span></div>`).join('')}</div></div>

<h2 id="wins">How you win</h2><table class="win">${WINS.map(([t, d, ns], i) => `<tr><td><b>${i + 1}. ${esc(t)}</b><br>${thumbs(ns)}</td><td>${esc(d)}</td></tr>`).join('')}</table>

<h2 id="deck">The deck <small>tick cards as you sleeve them; ticks are remembered in this browser</small></h2>
${GROUPS.map(([g, note, ns]) => `<h2>${esc(g)} <small>${ns.reduce((s, n) => s + qtyOf(n), 0)}${note ? ' · ' + esc(note) : ''}</small></h2><div class="grid">${ns.map((n) => tile(n, true)).join('')}</div>`).join('\n')}

<h2 id="order">Cards to order <small>cheapest printing in USD from Scryfall (09-26 snapshot); Cardmarket in the EU is usually lower</small></h2>
<table><tr><th>Tier</th><th>Card</th><th>$</th><th>Why</th><th>Replaces</th></tr>
${ORDER.map(([t, ns, p, why, rep]) => `<tr><td><span class="tier t${t}">${t}</span></td><td>${thumbs(ns)}<br>${ns.map(esc).join(' + ')}</td><td class="n">${esc(p)}</td><td>${why}</td><td>${esc(rep)}</td></tr>`).join('')}
</table><p class="box" style="margin-top:10px"><b>Skipped:</b> Doubling Season ($32) — Innkeeper's Talent does the same once you find it. <b>Best value:</b> the tier-1 rows cost about <b>$10.50</b> and turn the deck from value-grind into one that can kill from nowhere.</p>

<h2 id="held">Held back: sleeved in another deck <small>one copy registered; with a second copy these go in</small></h2>
<table><tr><th>Card</th><th>Sleeved in</th><th>Would replace</th></tr>${HELD.map(([n, d, r]) => `<tr><td>${thumbs([n])} ${esc(n)}</td><td>${esc(d)}</td><td>${esc(r)}</td></tr>`).join('')}</table>

<h2 id="bench">On the bench <small>owned, considered, left out</small></h2>
<table>${BENCH.map(([n, r]) => `<tr><td>${thumbs([n])} ${esc(n)}</td><td>${esc(r)}</td></tr>`).join('')}</table>
<p class="box" style="margin-top:10px"><b>Also owned and left out:</b> <span class="muted">${esc(BENCH_MORE)}</span></p>

<footer>List: decks/paper/proposals/superfriends-tam.txt · generated ${new Date().toISOString().slice(0, 10)} by verify-2026-09-28/superfriends-guide-page.ts · card images © Wizards of the Coast via Scryfall.</footer>
<script>
const KEY='sleeved:superfriends-tam';const boxes=[...document.querySelectorAll('input[data-n]')];
let s={};try{s=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){s={}}
const upd=()=>{const n=boxes.filter(b=>b.checked).length;document.getElementById('done').textContent=n+' / '+boxes.length+' sleeved'};
boxes.forEach(b=>{b.checked=!!s[b.dataset.n];b.addEventListener('change',()=>{s[b.dataset.n]=b.checked;localStorage.setItem(KEY,JSON.stringify(s));upd()})});
document.getElementById('reset').onclick=()=>{s={};localStorage.removeItem(KEY);boxes.forEach(b=>b.checked=false);upd()};upd();
</script></body></html>`;

for (const f of OUT) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
  console.log('wrote', f, (html.length / 1024).toFixed(0) + ' KB');
}
