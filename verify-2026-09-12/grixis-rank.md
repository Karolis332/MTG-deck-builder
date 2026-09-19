# Arena Brawl commanders in the collection — identity within BRU, archetype spellslinger

Candidates scanned: 66 owned legendary creatures inside BRU (>= 2 colours).
Passing the archetype filter (fit >= 4): 17.
Exact BRU identity owned: 1.

| # | Commander | Cost | ID | Power (EDHPL) | Bracket | Corpus decks | Collection coverage | Fit | Composite |
|---|-----------|------|----|---------------|---------|--------------|---------------------|-----|-----------|
| 1 | Prismari, the Inspiration | {5}{U}{R} | RU | 7.74 | 4 | 9,239 | 72% | 6 | 83.4 |
| 2 | Ral, Monsoon Mage | {1}{R} | RU | 8.46 | 4 | 3,281 | 46% | 8 | 81.6 |
| 3 | Gandalf the Grey | {3}{U}{R} | RU | 7.76 | 4 | 1,069 | 60% | 8 | 79.9 |
| 4 | A-Vivi Ornitier | {1}{U}{R} | RU | 8.61 | 4 | 13,000 | 56% | 5 | 79.4 |
| 5 | Kuja, Genome Sorcerer | {2}{B}{R} | BR | 7.66 | 3 | 6,983 | 66% | 5 | 77.7 |
| 6 | Fire Lord Azula **(true BRU)** | {1}{U}{B}{R} | BRU | 7.77 | 4 | 13,983 | 66% | 4 | 77 |
| 7 | Bria, Riptide Rogue | {2}{U}{R} | RU | 7.79 | 4 | 3,039 | 72% | 5 | 76.9 |
| 8 | Black Waltz No. 3 | {2}{B}{R} | BR | 7.74 | 4 | 1,687 | 68% | 5 | 74 |
| 9 | Judith, Carnage Connoisseur | {3}{B}{R} | BR | 8.03 | 4 | 3,674 | 54% | 5 | 73.6 |
| 10 | Kraum, Violent Cacophony | {2}{U}{R} | RU | 7.55 | 3 | 347 | 68% | 6 | 71.7 |
| 11 | Balmor, Battlemage Captain | {U}{R} | RU | 7.64 | 3 | 1,161 | 72% | 4 | 70.4 |
| 12 | Ovika, Enigma Goliath | {5}{U}{R} | RU | 7.63 | 3 | 3,822 | 44% | 4 | 67.1 |

## Detail

### 1. Prismari, the Inspiration {5}{U}{R} (RU)
- signals: cast-instant/sorcery trigger, spell recursion
- oracle: Flying / Ward—Pay 5 life. / Instant and sorcery spells you cast have storm. (Whenever you cast an instant or sorcery spell, copy it for each spell cast before it this turn. You may choose new targets 
- model-built deck: `verify-2026-09-12/built/prismari-the-inspiration.txt`

### 2. Ral, Monsoon Mage {1}{R} (RU)
- signals: cast-instant/sorcery trigger, spell cost reduction, card flow
- oracle: Instant and sorcery spells you cast cost {1} less to cast. / Whenever you cast an instant or sorcery spell during your turn, flip a coin. If you lose the flip, Ral deals 1 damage to you. If you win th
- model-built deck: `verify-2026-09-12/built/ral-monsoon-mage.txt`

### 3. Gandalf the Grey {3}{U}{R} (RU)
- signals: cast-instant/sorcery trigger, spell copying, reach/ping
- oracle: Whenever you cast an instant or sorcery spell, choose one that hasn't been chosen — / • You may tap or untap target permanent. / • Gandalf deals 3 damage to each opponent. / • Copy target instant or s
- model-built deck: `verify-2026-09-12/built/gandalf-the-grey.txt`

### 4. A-Vivi Ornitier {1}{U}{R} (RU)
- signals: cast-noncreature trigger, reach/ping
- oracle: {T}: Add X mana in any combination of {U} and/or {R}, where X is Vivi Ornitier's power. / Whenever you cast a noncreature spell, put a +1/+1 counter on Vivi Ornitier and it deals 1 damage to each oppo
- model-built deck: `verify-2026-09-12/built/a-vivi-ornitier.txt`

### 5. Kuja, Genome Sorcerer {2}{B}{R} (BR)
- signals: cast-noncreature trigger, reach/ping
- oracle: At the beginning of your end step, create a tapped 0/1 black Wizard creature token with "Whenever you cast a noncreature spell, this token deals 1 damage to each opponent." Then if you control four or
- model-built deck: `verify-2026-09-12/built/kuja-genome-sorcerer.txt`

### 6. Fire Lord Azula {1}{U}{B}{R} (BRU)
- signals: cast-any-spell trigger
- oracle: Firebending 2 (Whenever this creature attacks, add {R}{R}. This mana lasts until end of combat.) / Whenever you cast a spell while Fire Lord Azula is attacking, copy that spell. You may choose new tar
- model-built deck: `verify-2026-09-12/built/fire-lord-azula.txt`

### 7. Bria, Riptide Rogue {2}{U}{R} (RU)
- signals: cast-noncreature trigger, prowess
- oracle: Prowess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.) / Other creatures you control have prowess. (If a creature has multiple instances of prowess, each triggers
- model-built deck: `verify-2026-09-12/built/bria-riptide-rogue.txt`

### 8. Black Waltz No. 3 {2}{B}{R} (BR)
- signals: cast-noncreature trigger, reach/ping
- oracle: Flying, deathtouch / Whenever you cast a noncreature spell, Black Waltz No. 3 deals 2 damage to each opponent.
- model-built deck: `verify-2026-09-12/built/black-waltz-no-3.txt`

### 9. Judith, Carnage Connoisseur {3}{B}{R} (BR)
- signals: cast-instant/sorcery trigger, reach/ping
- oracle: Whenever you cast an instant or sorcery spell, choose one — / • That spell gains deathtouch and lifelink. / • Create a 2/2 red Imp creature token with "When this token dies, it deals 2 damage to each 
- model-built deck: `verify-2026-09-12/built/judith-carnage-connoisseur.txt`

### 10. Kraum, Violent Cacophony {2}{U}{R} (RU)
- signals: first/second-spell trigger, extra-draw/cast payoff, card flow
- oracle: Flying / Whenever you cast your second spell each turn, put a +1/+1 counter on Kraum and draw a card.
- model-built deck: `verify-2026-09-12/built/kraum-violent-cacophony.txt`

### 11. Balmor, Battlemage Captain {U}{R} (RU)
- signals: cast-instant/sorcery trigger
- oracle: Flying / Whenever you cast an instant or sorcery spell, creatures you control get +1/+0 and gain trample until end of turn.
- model-built deck: `verify-2026-09-12/built/balmor-battlemage-captain.txt`

### 12. Ovika, Enigma Goliath {5}{U}{R} (RU)
- signals: cast-noncreature trigger
- oracle: Flying / Ward—{3}, Pay 3 life. / Whenever you cast a noncreature spell, create X 1/1 red Phyrexian Goblin creature tokens, where X is the mana value of that spell. They gain haste until end of turn.
- model-built deck: `verify-2026-09-12/built/ovika-enigma-goliath.txt`
