// Card keep-list page with images (Scryfall URIs from the local card table). Sections and tags are
// data below; ticks persist in the browser and sync across duplicate tiles.  node scripts/keep-list.cjs
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(process.env.APPDATA, 'the-black-grimoire', 'data', 'mtg-deck-builder.db'), { readonly: true });
const OUT = ['decks/paper/otj-keep-list.html', 'C:/Users/QuLeR/Desktop/MTG collection/MTG decks/otj-keep-list.html'];
const TITLE = 'Outlaws of Thunder Junction — cards to keep';

const SECTIONS = [
  ['Keep — slots into your decks now (corpus % where the card is played with that commander; the rest is role and colour fit)', {
    'Corrupted Conviction': 'Meren 12% · Imotekh 5%',
    'Honest Rutstein': 'Meren 14%',
    'Lively Dirge': 'Meren 6% · Imotekh 6% · Marchesa',
    'Forsaken Miner': 'Meren 5% · Marchesa 15%',
    'Shoot the Sheriff': 'Meren · Imotekh · Marchesa 27%',
    'Hardbristle Bandit': 'Tazri (Rogue ramp) · Riku',
    'Visage Bandit': 'Tazri (Rogue clone) · Marchesa',
    'Bovine Intervention': 'Tazri (removal)',
    'Getaway Glamer': 'Tazri (protection)',
    'Take Up the Shield': 'Tazri (protection)',
    'Ruthless Lawbringer': 'Tazri (edict body)',
    'Baron Bertram Graywater': 'Tazri (token payoff)',
    'Return the Favor': 'Ramos · Marchesa 21% · Riku 72%',
    'Doc Aurlock, Grizzled Genius': 'Ramos · Riku 11%',
    'Map the Frontier': 'Meren · Ramos (ramp)',
    'Dance of the Tumbleweeds': 'Meren · Ramos · Riku 44%',
    'Trash the Town': 'Meren · Ramos · Riku 58%',
  }],
  ['Keep — staples with no slot yet', {
    'Requisition Raid': 'cheap artifact/enchantment answer',
    'Arid Archway': 'Desert · Marchesa',
    'Lavaspur Boots': 'haste + ward equip · Marchesa',
    "Bandit's Haul": 'Marchesa 22%',
    'Highway Robbery': 'red draw',
    'Magebane Lizard': 'anti-spellslinger',
    'Ankle Biter': '1-drop deathtouch',
    'Abraded Bluffs': 'Desert',
    'Bristling Backwoods': 'Desert · Riku',
    'Conduit Pylons': 'Desert · in Imotekh · Marchesa',
    'Creosote Heath': 'Desert',
    'Eroded Canyon': 'Desert · Marchesa 35% · Riku',
    'Festering Gulch': 'Desert · Meren',
    'Forlorn Flats': 'Desert',
    'Jagged Barrens': 'Desert · Marchesa 34%',
    'Lonely Arroyo': 'Desert',
    'Lush Oasis': 'Desert · Riku',
    'Mirage Mesa': 'Desert · Marchesa',
    'Soured Springs': 'Desert · Marchesa 36%',
    'Sandstorm Verge': 'Desert · Marchesa',
  }],
  ['Keep — for Marchesa, Dealer of Death (crimes): every common/uncommon in at least 2% of Marchesa decks', {
    'At Knifepoint': '34%', 'Shoot the Sheriff': '27%', "Bandit's Haul": '22%', 'Raven of Fell Omens': '22%', 'Return the Favor': '21%',
    'Servant of the Stinger': '19%', 'Nimble Brigand': '17%', 'Intimidation Campaign': '17%', 'Seize the Secrets': '16%',
    'Vial Smasher, Gleeful Grenadier': '16%', 'Forsaken Miner': '15%', 'Blood Hustler': '14%', 'Rattleback Apothecary': '13%',
    'Slick Sequence': '10%', 'Marauding Sphinx': '10%', 'Take for a Ride': '9%', 'Deepmuck Desperado': '9%', 'Lively Dirge': '7%',
    'Deadeye Duelist': '7%', 'Rakish Crew': '6%', 'Shifting Grift': '6%', 'Take the Fall': '5%', 'Rodeo Pyromancers': '4%',
    "Mourner's Surprise": '3%', 'Slickshot Lockpicker': '3%', 'Overzealous Muscle': '3%', 'Explosive Derailment': '3%',
    'Hollow Marauder': '2%', 'Brimstone Roundup': '2%', 'Visage Bandit': '2%', 'Slickshot Vault-Buster': '2%',
    'Corrupted Conviction': '2%', 'Lavaspur Boots': '2%', 'Metamorphic Blast': '2% · in your rares file',
  }],
  ['Keep — for Riku of Many Paths: every Temur-legal Spree/modal spell in the set', {
    'Return the Favor': 'Spree · 72%', 'Trash the Town': 'Spree · 58%', 'Dance of the Tumbleweeds': 'Spree · 44%',
    'Shifting Grift': 'Spree · 41%', 'Metamorphic Blast': 'Spree · 35% · in your rares file',
    'Phantom Interference': 'Spree · 22% · in your file ×3', 'Jailbreak Scheme': 'Spree · 16% · in your file',
    'Explosive Derailment': 'Spree · 15%', 'Ferocification': 'Spree enchantment', 'Caught in the Crossfire': 'Spree · 4%',
    'Three Steps Ahead': 'Spree · 67% · in your rares file', 'Doc Aurlock, Grizzled Genius': 'cost reducer, not a trigger · 11%',
    'Hardbristle Bandit': '2%',
  }],
  ['Keep only if you play Pauper', { 'Spinewoods Armadillo': 'land cycling body', 'Sterling Keykeeper': 'flash tapper' }],
];

const q = db.prepare("select name, rarity, image_uri_normal, image_uri_small from cards where name = ? or name like ? order by (set_code in ('otj','otp','big')) desc, length(name) limit 1");
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const names = new Set();
let sections = '';
for (const [title, cards] of SECTIONS) {
  let tiles = '';
  for (const [name, tag] of Object.entries(cards)) {
    const c = q.get(name, name + ' // %');
    if (!c) { console.log('?? ' + name); continue; }
    names.add(c.name);
    const img = c.image_uri_normal || c.image_uri_small || 'https://api.scryfall.com/cards/named?exact=' + encodeURIComponent(name) + '&format=image&version=normal';
    const r = ((c.rarity || '')[0] || '').toUpperCase();
    tiles += '<label class="card" data-name="' + esc(c.name) + '"><input type="checkbox"><img loading="lazy" src="' + esc(img) + '" alt="' + esc(c.name) + '"><div class="meta"><b>' + esc(name) + '</b><span class="r r' + r + '">' + r + '</span>' + (tag ? '<small>' + esc(tag) + '</small>' : '') + '</div></label>';
  }
  sections += '<section><h2>' + esc(title) + ' <span class="count"></span></h2><div class="grid">' + tiles + '</div></section>';
}
const n = names.size;
const css = [
  'body{margin:0;background:#15110d;color:#e8dcc4;font:15px/1.4 Georgia,serif}',
  'header{position:sticky;top:0;background:#1d1711;border-bottom:1px solid #6b5220;padding:10px 18px;display:flex;gap:18px;align-items:center;z-index:2}',
  'h1{font-size:18px;margin:0;color:#d4af37;letter-spacing:.04em}h2{font-size:16px;color:#d4af37;margin:22px 18px 8px;border-bottom:1px solid #3a2d17;padding-bottom:4px}',
  '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:0 18px}',
  '.card{display:block;background:#221b13;border:1px solid #3a2d17;border-radius:8px;padding:6px;cursor:pointer;position:relative}.card:has(input:checked){opacity:.35;filter:grayscale(1)}',
  '.card input{position:absolute;top:10px;left:10px;width:20px;height:20px;accent-color:#d4af37;z-index:1}.card img{width:100%;aspect-ratio:488/680;border-radius:6px;display:block;background:#0e0b08}',
  '.meta{padding:6px 2px 0}.meta b{display:block;font-size:13px;line-height:1.2}.meta small{color:#b5a27b;font-size:11px;display:block}',
  '.r{display:inline-block;font:11px monospace;padding:0 5px;border-radius:3px;margin-top:3px;background:#3a2d17}.rU{background:#5a5a6a}.rR{background:#8b6914}.rM{background:#a0522d}',
  '.count{font-weight:normal;font-size:13px;color:#b5a27b}#done{color:#b5a27b;font-size:13px}button{background:#2a2118;color:#e8dcc4;border:1px solid #6b5220;border-radius:6px;padding:4px 10px;cursor:pointer}',
  '@media print{header,.card input{display:none}.card:has(input:checked){display:none}}',
].join('\n');
const js = [
  "const K='otj-keep-ticks';const s=new Set(JSON.parse(localStorage.getItem(K)||'[]'));",
  "const tiles=[...document.querySelectorAll('.card')];",
  "const sync=()=>tiles.forEach(c=>{c.querySelector('input').checked=s.has(c.dataset.name)});",
  "const upd=()=>{const names=new Set(tiles.map(c=>c.dataset.name));document.getElementById('done').textContent=[...names].filter(n=>s.has(n)).length+' / '+names.size+' sorted';document.querySelectorAll('section').forEach(sec=>{const c=[...sec.querySelectorAll('.card')];sec.querySelector('.count').textContent=c.filter(x=>s.has(x.dataset.name)).length+'/'+c.length;});};",
  "tiles.forEach(c=>c.querySelector('input').addEventListener('change',(e)=>{e.target.checked?s.add(c.dataset.name):s.delete(c.dataset.name);localStorage.setItem(K,JSON.stringify([...s]));sync();upd();}));",
  "document.getElementById('reset').onclick=()=>{s.clear();localStorage.setItem(K,'[]');sync();upd();};",
  'sync();upd();',
].join('\n');
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + TITLE + ' (' + n + ')</title><style>' + css + '</style></head><body>'
  + '<header><h1>' + TITLE + ' (' + n + ')</h1><span id="done"></span><button id="reset">Reset</button><span style="margin-left:auto;font-size:12px;color:#b5a27b">Tick a card once it is sorted; ticks are remembered in this browser and sync across sections. Everything not on this page: sell.</span></header>'
  + sections + '<script>' + js + '</script></body></html>';
for (const f of OUT) fs.writeFileSync(f, html);
console.log('unique cards:', n, '| tiles:', (html.match(/class="card"/g) || []).length);
