import { loadOwned, legalPool, isCommander } from '../../scripts/best-deck-lib';
const o = loadOwned('arena'); const legal = legalPool(o, 'brawl');
process.stdout.write(`arena owned ${o.cards.length} brawl-legal ${legal.length} commanders ${legal.filter((c) => isCommander(c, 'brawl')).length}\n`);
