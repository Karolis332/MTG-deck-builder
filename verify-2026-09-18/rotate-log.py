"""Append a Session Log entry to CLAUDE.md, archiving the oldest when the rolling window exceeds 10."""
import re, sys

NEW = """### 2026-09-18 — The Cabbage Merchant (paper Commander) registered + upgrade proposal
- **Did:** physical deck registered as `decks/paper/decks/the-cabbage-merchant.txt` (operator's typed 101-card list, one Forest dropped; deck id via `paper-sync`, v1) and the typed 96-card spare pile added to `collection.txt` (register now 1,000 owned / 593 open). Proposal `decks/paper/proposals/cabbage-merchant-upgrade.txt` + `.md` guide (win conditions vs a 3-opponent table, engine lines with rules caveats, keep/mull, cuts/adds): 26 out, 21 in, Forest 26→31, lands 32→36, avg MV 3.25→2.81, EDHPL 7.06→7.09, owned cards only (deck + pile + open cards), 0 validator errors. ManaBox copy in Desktop `new lists/`. Tooling in `verify-2026-09-18/`: `resolve-side.py` (typo-tolerant name resolver for chat lists), `build-pool-paper.cjs` (pool × VPS `commander_card_stats`, 2,001-deck corpus → `cabbage-pool-PAPER.txt`, 278 rows), `check-deck-paper.cjs`, `cabbage-buy-candidates.txt` (top not-owned corpus cards with min USD). Process: 2 Opus designers (corpus-faithful vs table-resilient) → Opus refuter → merge (base B + 3 A picks: Spider-Ham, Kodama's Reach, Sapseep Forest).
- **Why:** an Arena Brawl build was delivered first (files removed) because the old `docs/CABBAGE_MERCHANT_BRAWL.md` and the commander's Arena ownership suggested Arena; the operator corrected to paper after delivery. The 13 "brawl not_legal" flags were the true signal (paper-only cards), not stale data. Lesson saved to memory: ask the format before designing; register deck + pile first; never brief designers on an incomplete pool (two full design rounds were wasted).
- **Open:** operator to re-sleeve, then copy the proposal over the deck file and run `npx tsx scripts/paper-sync.ts`; add the commander to `scripts/corpus-stats-cache.sh` + `deck-edit-plan.ts` DECKS for the image edit-plan page; five pile cards are also sleeved elsewhere (Llanowar Elves, Sakura-Tribe Elder, Eternal Witness used as assumed second copies); Ramos register entry is 3 cards (pre-existing); operator ideas for later: Beledros Witherbloom in Meren or a Golgari lifegain deck; nothing committed.
"""

p = 'CLAUDE.md'
s = open(p, encoding='utf-8').read()
head, log = s.split('## Session Log', 1)
parts = re.split(r'(?m)^(?=### \d{4}-\d{2}-\d{2})', log)
pre, ents = parts[0], parts[1:]
if len(ents) >= 10:
    old = ents.pop(0)
    with open('docs/SESSION_LOG_ARCHIVE.md', 'a', encoding='utf-8') as a:
        a.write('\n' + old.rstrip() + '\n')
ents.append(NEW)
body = ''.join(e if e.endswith('\n\n') else e.rstrip() + '\n\n' for e in ents)
open(p, 'w', encoding='utf-8', newline='\n').write(head + '## Session Log' + pre + body)
print('session log entries:', len(ents))
