/**
 * Run the app's Standard optimizer (build-api /optimize engine) on a list, with Arena ownership.
 *   MTG_DB_DIR=<appdata>/the-black-grimoire/data npx tsx verify-2026-10-05/ghalta/run-model.ts [list.txt] > model.json
 */
import fs from 'fs';
import path from 'path';
import { optimizeDeck } from '../../services/build-api/optimize';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const list = process.argv[2] || path.join(here, 'input.txt');
const result = optimizeDeck({
  format: 'standard',
  text: fs.readFileSync(list, 'utf8'),
  ownedCards: JSON.parse(fs.readFileSync(path.join(here, 'owned.json'), 'utf8')),
});
console.log(JSON.stringify(result, null, 1));
