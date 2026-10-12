process.env.MTG_DB_DIR = 'C:/Users/QuLeR/AppData/Local/Temp/audit-B-db';
async function main() {
  const { classifyCard, getPrimaryCategory } = await import('../../src/lib/card-classifier');
  const { getDb } = await import('../../src/lib/db');
  const db = getDb();
  const names = ['Black Market Connections', "Roilmage's Trick", "An Offer You Can't Refuse", 'Reckless Lackey', 'Idol of Oblivion', 'Well of Lost Dreams',
    "Dragon's Hoard", 'Season of Gathering', "Night of the Sweets' Revenge", 'Tainted Pact', 'Deadly Dispute', 'Scuzzback Scrounger', 'Howlsquad Heavy',
    'Ashling, Flame Dancer', 'Collector\'s Vault', 'Vanquisher\'s Banner', 'Chronicle of Victory', 'Fierce Empath', 'Sram, Senior Edificer', 'Garruk\'s Uprising',
    'Lotus Petal', 'Dark Ritual', 'Storm-Kiln Artist', 'Pitiless Plunderer', 'Marionette Apprentice', 'Amalia Benavides Aguirre', 'Whispersilk Cloak', 'Walking Ballista',
    'Tyvar Kell', 'Zada, Hedron Grinder', 'Entomb', 'Reanimate', 'Mesmeric Orb', 'Altar of Dementia', 'Lifespring Druid', 'Centaur Nurturer', 'Ticket Turbotubes', 'Professional Wrestler'];
  for (const n of names) {
    const c = db.prepare('select name, oracle_text, type_line, cmc, edhrec_rank, price_usd from cards where name=? limit 1').get(n) as any;
    if (!c) { console.log(n, 'NOT FOUND'); continue; }
    const cats = classifyCard(c.name, c.oracle_text || '', c.type_line || '', c.cmc || 0);
    console.log(n.padEnd(30), 'primary', getPrimaryCategory(cats).padEnd(14), JSON.stringify(cats), 'edh', c.edhrec_rank, '$' + c.price_usd);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
