# MTG Comprehensive Deck Construction Ratios Guide
## Commander (EDH), Brawl, and Standard Formats

**Last Updated:** March 22, 2026
**Data Sources:** EDHREC, The Command Zone Podcast, MTGArena Zone, Scryfall, MTGGoldfish, MTGDecks, Draftsim, cEDH Decklist Database, TCGPlayer
**Purpose:** AI training data and reference guide for optimal deck construction across all formats

---

## TABLE OF CONTENTS

1. [COMMANDER (EDH) FORMAT](#commander-edh-format)
2. [BRAWL FORMAT](#brawl-format)
3. [STANDARD FORMAT](#standard-format)
4. [ARCHETYPE-SPECIFIC RATIOS](#archetype-specific-ratios)
5. [COLOR IDENTITY ADJUSTMENTS](#color-identity-adjustments)
6. [BUDGET CONSIDERATIONS](#budget-considerations)
7. [MANA CURVE DISTRIBUTION](#mana-curve-distribution)
8. [FORMAT COMPARISON MATRIX](#format-comparison-matrix)

---

## COMMANDER (EDH) FORMAT

### Overview
- **Deck Size:** 100 cards (99 + 1 Commander)
- **Card Copies:** 1 of each (except basic lands)
- **Deck Legality:** All Magic cards not on the ban list
- **Player Count:** 1v1 or multiplayer (4+ players typical)
- **Casualty Level:** Highly variable (casual to competitive/cEDH)

---

### 1. LANDS

#### Recommended Total Land Count
- **Default Target:** 37-38 lands (middle golden number)
- **Range:** 33-40 lands total
- **Adjustment by Color Identity:**
  - Mono-colored: 34 lands
  - 2-colored: 34-35 lands
  - 3-colored: 35-36 lands
  - 4-colored: 36 lands
  - 5-colored: 37 lands

#### Land Composition (37-land baseline)
- **Basic Lands:** 6-8 basics (higher in mono-color decks, lower in 3+ color)
  - Mono-color: 8-10 basics
  - 2-color: 5-7 basics
  - 3-color: 3-5 basics
  - 4-5 color: 2-4 basics

- **Dual Lands (Color-producing):** 10-14 duals
  - ABUR Duals (original): 0-3 (budget dependent; cEDH: 3)
  - Shock Lands (e.g., Hallowed Fountain): 3-5
  - Check Lands (e.g., Glacial Fortress): 2-3
  - Pain Lands (e.g., Adarkar Wastes): 1-3
  - Trilands (e.g., Seaside Citadel): 1-3 (3+ color)

- **Fetch Lands:** 0-5 fetches (budget dependent)
  - Casual: 0-2 fetches
  - Optimized: 2-4 fetches
  - cEDH: 3-5 fetches

- **Utility Lands (color-producing or colorless):** 8-12 utility lands
  - Examples: Command Tower, Reflecting Pool, Exotic Orchard, City of Brass, Mana Confluence
  - Other: Strip Mine, Wastes, Maze of Ith (depends on strategy)

#### mana Base Construction: Formula Method
If you run 42 lands baseline and add:
- 5 mana rocks = remove 2.5 lands (run 39-40 lands)
- 8 mana rocks = remove 4 lands (run 38 lands)
- 3 cost reducers = remove 1.5 lands
- 2 mana dorks = remove 1 land

**cEDH Land Count Adjustment:** 27-30 lands (significantly lower due to aggressive ramp)

---

### 2. RAMP / MANA ACCELERATION

#### Total Ramp Sources
- **Recommended:** 10-13 dedicated ramp sources
- **Total Mana Sources (lands + rocks + dorks + spells):** 43-55 cards
- **Rough composition:** ~50% of deck dedicated to mana

#### Ramp Breakdown by Type

**A. Mana Rocks (Artifacts)**
- **Optimal Count:** 5-8 rocks
- **Rock-to-Land Ratio:** 1 rock per 5-8 lands (approx. 2 rocks per land removed)
- **Minimum:** 3 rocks (Sol Ring, Darksteel Ingot, Commander's Sphere for casual)
- **Typical:** 8 rocks for optimized decks

**By CMC:**
- **0-1 CMC rocks:** 1-2 cards (e.g., Sol Ring, Mox-style cards in budget)
- **2 CMC rocks:** 3-4 cards (e.g., Arcane Signet, Fellwar Stone, Mind Stone)
- **3 CMC rocks:** 2-3 cards (e.g., Darksteel Ingot, Commander's Sphere)
- **4+ CMC rocks:** 0-1 cards (e.g., Gilded Lotus for specific needs)

**Popular mana rock progression (by budget tier):**
- **Budget:** Sol Ring, Arcane Signet, Fellwar Stone (3 rocks)
- **Mid-level:** + Darksteel Ingot, Mind Stone, Chromatic Lantern (5-6 rocks)
- **Optimized:** + Mana Vault, Chrome Mox, Grim Monolith (7-8 rocks)
- **cEDH:** + Ancient Tomb, Lotus Petal, Lion's Eye Diamond (8+ rocks, heavy 0-mana acceleration)

**B. Mana Dorks (Creatures)**
- **Optimal Count:** 2-4 dorks
- **Alternative to rocks:** Varies by color and deck strategy
- **Green decks:** Can run 4-5 dorks (Llanowar Elves, Elf Archetype)
- **Non-green decks:** 0-2 dorks
- **Dryad Arbor test:** If you'd play Dryad Arbor over a Forest, prioritize dorks; otherwise, prioritize rocks

**By Color:**
- **Green:** 3-5 dorks (color-specific ramp advantage)
- **Blue:** 0-1 dork (limited options)
- **Black:** 1-2 dorks (very limited)
- **Red:** 0-1 dork (very limited, ceremony-based)
- **White:** 0-1 dork (very limited)

**C. Land Ramp Spells**
- **Optimal Count:** 2-4 spells
- **Common:** Cultivate, Kodama's Reach, Farseek, Nature's Lore, Skyshroud Claim
- **CMC:** 2-4 (mostly 3-4 CMC)
- **Best in:** Green-heavy decks

**D. Ritual Spells / Fast Mana**
- **Optimal Count:** 1-3 spells
- **Examples:** Dark Ritual, Seething Song, Cabal Ritual
- **CMC:** 1-2 (typically instant-speed)
- **Best in:** Combo decks, Black/Red heavy decks

**E. Cost Reducers**
- **Optimal Count:** 1-3 cards
- **Examples:** Goblin Electromancer, Archmage Emeritus, Semblance Anvil
- **Effect:** Reduces cost of spells (specific type)
- **Impact:** Can reduce land requirement by 1-1.5 lands per reducer

#### Ramp by CMC Bracket (total of 13 sources)
- **0-1 CMC:** 2-3 (Sol Ring, Dark Ritual, fast mana)
- **2 CMC:** 4-5 (Arcane Signet, Fellwar Stone, Llanowar Elves, etc.)
- **3 CMC:** 3-4 (Cultivate, Kodama's Reach, Dorks, Rocks)
- **4 CMC:** 1-2 (Cabal Coffers effects, high-impact ramp)
- **5+ CMC:** 0-1 (rare, only for massive ramp effects)

#### cEDH Ramp (Total: 24-30 non-land mana sources)
- **0-mana accelerants:** 4-6 (Mox Diamond, Chrome Mox, Lotus Petal, Lion's Eye Diamond)
- **1-mana accelerants:** 5-7 (Dark Ritual, Elvish Mystic, Ornithopter, LED effects)
- **2-mana accelerants:** 6-8 (Arcane Signet, Collector Ouphe, Yavimaya Ouphe)
- **3+ mana accelerants:** 3-5 (Cultivate effects, but less common in cEDH)

---

### 3. CARD DRAW / CARD ADVANTAGE

#### Total Draw Sources
- **Recommended:** 8-12 dedicated draw spells/engines
- **Types:** Cantrips (card-neutral), effective draws (net positive), engines (repeatable)

#### EDHREC Statistics (verified data)
- **Average 2-mana cards per deck:** 15.7
- **Average 3-mana cards per deck:** 15.4
- **Peak of curve:** CMC 2-3 range
- **High-end cards (8+ CMC):** 1.5 average

#### Draw Sources by Type

**A. Cantrips (Card-neutral, cycle effects)**
- **Count:** 2-4 cantrips
- **CMC:** 1-2 (typically instant/sorcery)
- **Examples:** Ponder, Brainstorm, Thought Scour, Faithless Looting
- **Effect:** "Draw a card" + other effect (replaces itself)

**B. Effective Draws (Net-positive card advantage)**
- **Count:** 4-7 cards
- **CMC:** 2-5 (variable)
- **Examples:** Harmonize (5 CMC, draw 3), Divination (3 CMC, draw 2), Read the Bones
- **Effect:** Draws cards net-positively

**C. Card Advantage Engines (Repeatable)**
- **Count:** 2-4 engines
- **CMC:** 2-6 (usually higher CMC)
- **Examples:**
  - Creature-based: Archmage Emeritus (triggers on spellcast), Siege Rhino effects
  - Enchantment-based: Omen of the Hunt, Puresteel Paladin
  - Artifact-based: Welcoming Vampire
- **Frequency:** Triggers once per turn or once per spell cast

**D. Wheel Effects (Mass draw, reset)**
- **Count:** 0-2 wheels
- **CMC:** 3-5
- **Examples:** Wheel of Fortune, Dark Deal, Windfall
- **Effect:** Everyone (or you) discards and draws large amount

**E. Tutors that Function as Draw**
- **Count:** Included in tutor count (see section 13)
- **Effect:** Search + thin deck = card advantage

#### Draw by Color
- **Blue:** 8-10 draw sources (color specialty)
- **Green:** 4-6 draw sources (creature ETB effects)
- **Black:** 4-6 draw sources (sacrifice effects, painful draw)
- **White:** 2-4 draw sources (limited options)
- **Red:** 2-3 draw sources (looting effects, wheel effects)

---

### 4. REMOVAL / INTERACTION

#### Total Removal Package
- **Recommended:** 8-15 total interaction spells
- **Breakdown:** Spot removal + board wipes + counterspells + discard

#### A. Single-Target Removal
- **Count:** 3-7 spot removal spells
- **Types:**
  - **Creature-only removal:** 2-4 (e.g., Path to Exile, Swords to Plowshares)
  - **Artifact/Enchantment removal:** 1-2 (e.g., Disenchant, Nature's Claim)
  - **Permanent removal (any):** 1-3 (e.g., Anguished Unmaking, Beast Within)
- **CMC:** 1-4 (prefer 1-2 CMC for efficiency)

#### B. Board Wipes / Mass Removal
- **Recommended Count:**
  - **Casual decks:** 3-5 board wipes
  - **Control-focused:** 4-7 board wipes
  - **Aggro/Tempo:** 0-2 board wipes
  - **Multiplayer:** 3-5 (more needed due to 3-4 opponents)
  - **cEDH:** 0-2 (less common; focused on targeted removal)

- **By Type:**
  - **Creature-only wipes:** 2-4 (Wrath of God, Supreme Verdict)
  - **All permanents:** 0-2 (Pernicious Deed, Damnation)
  - **Conditional wipes:** 1-2 (Austere Command, Engineered Explosives)

- **CMC:** 4-7 (typically 5-6 for standard wipes)

#### C. Counterspells (Blue/Control)**
- **For control-heavy blue decks:** 8-12 counterspells
- **For mid-range blue:** 4-6 counterspells
- **For non-blue (UX):** 2-4 counterspells
- **CMC:** 1-3 (prefer 2-3 CMC; some 1-mana counters)
- **Types:**
  - **Hard counters (unconditional):** 3-5 (Counterspell, Negate)
  - **Soft counters (conditional):** 2-4 (Spell Pierce, Cancel)
  - **Modal counters:** 1-2 (Swan Song, Spell Queller)

#### D. Discard/Hand Disruption
- **Count:** 1-3 discard spells
- **Examples:** Duress, Thoughtseize, Collective Brutality
- **Best in:** Black/Grixis control

#### E. Interaction by Format
- **Control-archetype decks:** 12-15 interaction spells
- **Tempo-archetype decks:** 8-10 interaction spells
- **Midrange-archetype decks:** 6-8 interaction spells
- **Aggro-archetype decks:** 2-4 interaction spells

---

### 5. COUNTERSPELLS / NON-BLUE INTERACTION

#### Blue Counterspells
- **Control decks:** 10-15 counterspells
- **Tempo decks:** 4-8 counterspells
- **Combo protection:** 2-4 counterspells

#### Non-Blue Interaction (for non-blue or Grixis/Izzet)
- **Red:** Creature-damage removal (Lightning Bolt, etc.), stax effects
- **Black:** Discard, removal, stax
- **Green:** Creature removal, nature-based removal
- **White:** Creature removal, exile effects, board wipes

#### Total Interaction Target (all types combined)
- **Control decks:** 15-20 total interaction spells
- **Tempo decks:** 10-12 total
- **Midrange decks:** 8-10 total
- **Aggro decks:** 2-4 total

---

### 6. WIN CONDITIONS

#### Win Condition Slots
- **Recommended:** 5-10 dedicated slots (but varies widely)
- **Types of win conditions:**

**A. Primary Win Conditions** (2-5 slots)
- Most decks have 1-3 primary avenues
- Examples:
  - Combat damage (creatures attacking)
  - Commander damage (21 commander damage threshold)
  - Infinite combo (e.g., Rings of Brighthearth)
  - Laboratory Maniac (deck out self for win)

**B. Backup Win Conditions** (1-3 slots)
- Secondary methods to close games
- Examples: Torment of Hailfire, Approach of the Second Sun

**C. Incidental/Emergent Win Conditions** (1-4 slots)
- Not dedicated win cards but can win by themselves
- Examples: Talrand tokens, Purphoros damage, Craterhoof Behemoth

#### Win Condition by Archetype
- **Control:** 2-4 win conditions (minimal slots; focus on locking out opponents)
- **Combo:** 2-5 combos (each combo = 1 win condition slot)
- **Aggro:** 15-25 creatures (win condition is distributed)
- **Midrange:** 4-8 threats (distributed)
- **Ramp:** 3-5 payoff threats
- **Voltron:** 1 primary (commander) + 2-3 backup conditions

---

### 7. CREATURES VS NON-CREATURES RATIO

#### General Guidelines
- **Average creatures per deck:** ~25 creatures
- **Range:** 10-35 creatures (heavily archetype-dependent)

#### By Archetype

**Aggro:**
- **Total creatures:** 25-30+
- **Sub-CMC 3:** 12-16 (cheap threats)
- **CMC 3-4:** 8-12 (mid-range threats)
- **CMC 5+:** 2-4 (rarely held)
- **Non-creature spells:** 15-20 (mostly pump/combat tricks)

**Tempo:**
- **Total creatures:** 15-20
- **Sub-CMC 3:** 8-10 (tempo creatures)
- **CMC 3-4:** 4-6
- **CMC 5+:** 1-2
- **Non-creature spells:** 30-40 (mostly interaction)

**Midrange:**
- **Total creatures:** 20-25
- **Sub-CMC 3:** 3-5 (some early drops)
- **CMC 3-4:** 10-12 (main bulk)
- **CMC 5+:** 4-6 (payoff creatures)
- **Non-creature spells:** 20-25 (removal + draw + ramp)

**Control:**
- **Total creatures:** 3-8 (finishers only)
- **Non-creature spells:** 60-70 (removal, draw, counterspells)
- **Creatures are:** Finishers like Teferi, Elspeth, or bomb creatures

**Combo:**
- **Total creatures:** 5-15 (variable; depends on combo pieces)
- **Non-creature spells:** 45-60
- **Creatures serve:** Combo pieces or protection

**Voltron:**
- **Total creatures:** 1-5 (commander + minimal others)
- **Equipment/Auras:** 12-18
- **Non-creature spells:** 25-35

**Tribal:**
- **Total creatures:** 25-35 (tribal synergies demand creatures)
- **Archetype-specific:** All creatures share type (Elves, Goblins, etc.)

**Reanimator:**
- **Total creatures:** 15-20 (in graveyard as payoff)
- **Reanimate spells:** 5-8
- **Non-creature spells:** 30-40

**Spellslinger:**
- **Total creatures:** 5-10 (often evasive/spell-synergy creatures like Ledger Shredder)
- **Non-creature spells:** 50-60 (all instants/sorceries for triggers)

**Aristocrats:**
- **Total creatures:** 20-30 (sacrifice outlets + fodder)
- **Sacrifice outlets:** 2-4
- **Aristocrat payoffs:** 3-5 creatures

**Stax:**
- **Total creatures:** 5-15 (creature stax effects)
- **Artifact/Enchantment stax:** 8-12
- **Non-creature spells:** 25-35

---

### 8. MANA CURVE DISTRIBUTION

#### EDHREC Verified Data
- **0-mana:** ~0-1 cards
- **1-mana:** 3-5 cards
- **2-mana:** 15.7 cards average (peak)
- **3-mana:** 15.4 cards average (peak)
- **4-mana:** 10-12 cards
- **5-mana:** 6-8 cards
- **6-mana:** 4-5 cards
- **7-mana:** 2-3 cards
- **8+ mana:** 1.5 cards average

#### Mana Curve Distribution by Percentage (non-land cards)
**Standard Distribution (Midrange/Balanced):**
- 0-mana: 0%
- 1-mana: 3-5%
- 2-mana: 15-17%
- 3-mana: 15-16%
- 4-mana: 10-12%
- 5-mana: 6-8%
- 6-mana: 4-5%
- 7+ mana: 3-4%

**Aggressive Distribution:**
- 1-2 mana: 25-30%
- 3-4 mana: 20-25%
- 5+ mana: 10-15%

**Control Distribution:**
- 1-2 mana: 10-15%
- 3-4 mana: 25-30%
- 5+ mana: 20-25%

**Combo Distribution:**
- Heavily concentrated around combo pieces (highly variable)
- Usually: 2-4 mana peak
- High volatility based on specific combo

#### Commander's Impact on Curve
- **Low-CMC commander (2-3):** Can afford slightly higher average curve
- **Mid-CMC commander (4-5):** Standard curve recommended
- **High-CMC commander (6+):** Need lower curve to cast commander early

---

### 9. AVERAGE CMC TARGETS

#### By Archetype
- **Aggro:** 1.8-2.2 average CMC
- **Tempo:** 2.3-2.8 average CMC
- **Midrange:** 2.8-3.5 average CMC
- **Control:** 3.0-3.8 average CMC
- **Combo:** 2.5-3.5 average CMC (variable)
- **Ramp:** 3.0-4.0 average CMC
- **Voltron:** 2.5-3.2 average CMC
- **Reanimator:** 3.5-4.5 average CMC (high due to large threats)
- **Tribal:** 2.5-3.5 average CMC (depends on tribe)
- **Stax:** 2.8-3.8 average CMC

#### cEDH Average CMC
- **Typical range:** 1.8-2.5 average CMC
- **Rationale:** Explosive early game, fast combo enablement
- **Examples:** Magda decks ~2.0 CMC, Control decks ~2.3 CMC

---

### 10. SYNERGY / THEME CARDS

#### Synergy Slot Allocation
- **Recommended:** 30-50% of non-land cards directly support theme
- **Percentage by archetype:**
  - **Tribal:** 60-75% tribal members + synergies
  - **Voltron:** 40-50% equipment/aura synergies
  - **Aristocrats:** 50-60% sacrifice synergies
  - **Reanimator:** 40-50% reanimate synergies
  - **Spellslinger:** 50-70% spell-synergy creatures
  - **Control:** 20-30% (less synergy-heavy)
  - **Midrange:** 25-35% thematic cards
  - **Tempo:** 20-30% thematic cards

#### Synergy Categories
- **Creature type synergies:** Tribal lords, type-specific payoffs
- **Mechanic synergies:** Sacrifice synergies, token synergies, spell synergies
- **Color synergies:** Devotion payoffs, hybrid mana matters
- **Graveyard synergies:** Reanimation, flashback, delve synergies
- **Keyword synergies:** Infect, proliferate, energy, etc.

---

### 11. PROTECTION

#### Total Protection Slots
- **Recommended:** 3-6 protection sources
- **Purpose:** Protect commander, key pieces, or player

#### A. Counterspells (Blue)
- **Count:** Already counted in counterspell section
- **Function:** Prevent threats to commander or critical spells
- **Protection % of total interaction:** 30-50% for control decks

#### B. Hexproof/Shroud Enablers
- **Count:** 2-4 cards
- **Examples:**
  - Creatures with hexproof/shroud
  - Spells that grant hexproof (Apostle's Blessing, Vines of Vastwood)
  - Permanent enchantments (Lightning Greaves, Swiftfoot Boots)
- **Best in:** Voltron, commander-focused strategies

#### C. Indestructible Effects
- **Count:** 1-2 cards
- **Examples:** Kaya's Ghostform, Malakir Rebirth, Basalt Monolith (self-indestructible)
- **Best in:** Commander-focused, attrition decks

#### D. Protection from Specific Threats
- **Count:** 1-3 cards
- **Examples:** Plague Masque (creature removal immunity), Ward spells
- **Flexible:** Often picked for meta-specific threats

#### E. Evasion (not protection per se, but prevention)
- **Count:** 2-4 creatures/effects
- **Examples:** Unblockable creatures, flying creatures, shadow creatures
- **Purpose:** Prevents damage through combat

---

### 12. RECURSION / GRAVEYARD INTERACTION

#### Total Recursion Slots
- **Recommended:** 2-5 recursion effects
- **Variable:** Heavily depends on graveyard strategy

#### A. Creature Recursion
- **Count:** 1-3 cards
- **Examples:** Animate Dead, Resurrection, Unearth, Palace Siege
- **CMC:** 1-4 (prefer 1-3 for efficiency)

#### B. Spell Recursion
- **Count:** 1-3 cards
- **Examples:** Snapcaster Mage, Mystic Reflection, Loot Paths
- **Best in:** Spellslinger, control decks

#### C. Artifact/Enchantment Recursion
- **Count:** 0-2 cards
- **Examples:** Return of the Wildspeaker, Replenish
- **Less common** than creature recursion

#### D. Tutor-Based Recursion
- **Count:** 1-3 cards
- **Examples:** Buried Alive, Entomb (put cards into graveyard for future use)
- **Best in:** Reanimator decks

#### E. Graveyard Interaction (non-recursion)
- **Mill/Discard enablers:** 1-2 cards (put cards into graveyard)
- **Flashback/Escape enablers:** 1-2 cards
- **Total GY synergy:** 5-10 cards if heavily focused, 1-3 if not

#### Recursion by Archetype
- **Reanimator:** 8-12 recursion + graveyard interaction
- **Grindy value:** 3-5 recursion effects
- **Control:** 1-2 recursion effects
- **Tempo:** 0-1 recursion
- **Aggro:** 0-1 recursion

---

### 13. TUTORS

#### Total Tutor Count
- **Recommended:** 5-8 tutors (casual to optimized)
- **cEDH:** 5-10+ tutors (depends on combo/consistency needs)
- **Budget casual:** 2-3 tutors

#### Tutor Heuristic
- **Rule of thumb:** If you tutor for the same non-land card more than once per game, it's too many tutors
- **Exceptions:** Combo decks (need consistency), cEDH (optimal consistency)

#### By Tutor Type

**A. Creature Tutors**
- **Count:** 1-2 tutors
- **Examples:** Worldly Tutor, Green Sun's Zenith, Recruiter of the Guard
- **Best in:** Green, creature-heavy decks

**B. Artifact/Enchantment Tutors**
- **Count:** 1-2 tutors
- **Examples:** Enlightened Tutor, Fabricate, Starfield of Nyx
- **Best in:** Artifact/enchantment-heavy decks

**C. Land Tutors**
- **Count:** 1-2 tutors
- **Examples:** Expedition Map, Crop Rotation, Natural Order
- **Best in:** Land-heavy or mana-consistency decks

**D. Spell Tutors (Instant/Sorcery)**
- **Count:** 1-2 tutors
- **Examples:** Mystical Tutor, Gamble, Dark Petition
- **Best in:** Spellslinger, combo decks

**E. General Tutors (Any card type)**
- **Count:** 1-3 tutors
- **Examples:** Demonic Tutor, Vampiric Tutor, Mystical Tutor, Grim Tutor
- **Best in:** All decks (if available/budget permits)

**F. Speed of Tutors (CMC)**
- **Fast tutors (0-2 CMC):** 2-3 (Mystical Tutor, Vampiric Tutor, Green Sun's Zenith)
- **Medium tutors (3-4 CMC):** 2-3 (Demonic Tutor, Fabricate, Enlightened Tutor)
- **Slow tutors (5+ CMC):** 0-1 (rarely played unless specific effect)

#### Budget Tutor Substitutes
- **Creature tutors (budget):** Trinket Mage, Brudiclad, Ranger-Captain of Eos
- **Any-card tutors (budget):** Personal Tutor, Mystical Tutor, Tribute Mage
- **Free tutors:** Flotsam Lotus, Sunbeam Splitter

---

## BRAWL FORMATS

### Overview
Brawl has two main variants based on card legality:
- **Standard Brawl:** 60 cards (59 + 1 Commander), Standard-legal cards only
- **Historic Brawl:** 100 cards (99 + 1 Commander), all Magic cards legal (except banlist)

Both are singleton formats (1 copy max per card) on MTG Arena. Historic Brawl is closer to Commander but smaller.

---

## STANDARD BRAWL (60-card, Standard-legal)

### Overview
- **Deck Size:** 60 cards (59 + 1 Commander)
- **Card Copies:** 1 of each (except basic lands, unlimited)
- **Legal Cards:** Standard-legal only (current block + 4 sets back)
- **Format rotation:** Every ~2 years when new sets release
- **Player Count:** 1v1 on MTG Arena
- **Game length:** 15-25 minutes average

### Core Deck Ratios

| Category | Count | % of Deck | Notes |
|----------|-------|-----------|-------|
| **Lands** | 24–26 | 40–43% | Start at 25; adjust based on mana curve |
| **Mana Ramp** | 5–8 | 8–13% | Mana dorks, rocks (Arcane Signet, etc.), land ramp |
| **Card Draw/Advantage** | 5–8 | 8–13% | Must include filtering, scrying, tutors |
| **Targeted Removal** | 5–8 | 8–13% | Single-target removal (sorcery or instant) |
| **Board Wipes** | 1–3 | 2–5% | Cheap wraths (2–4 mana preferred) |
| **Commander Synergy** | 3–6 | 5–10% | Direct synergy pieces for commander |
| **Win Conditions/Finishers** | 3–6 | 5–10% | Creatures, direct damage, or payoffs |
| **Interaction/Protection** | 2–4 | 3–7% | Counterspells, protection, hand disruption |
| **Flex/Tech Slots** | 3–8 | 5–13% | Meta answers, format-specific tech |

### Detailed Category Breakdowns (60-card Standard Brawl)

#### Lands (24–26 baseline)
- **Ideal:** 25 lands
- **Mana-heavy decks:** 26 lands
- **Ramp-heavy decks:** 23–24 lands
- **Composition:**
  - Basic lands: 4–6
  - Dual/Shock lands: 8–12
  - Utility lands: 4–6 (creature lands, cycling lands, etc.)

#### Mana Ramp (5–8 sources)
- **Mana dorks:** 1–3 (Llanowar Elves, Elvish Mystic if available)
- **Mana rocks:** 2–4 (Arcane Signet, Mind Stone, etc.)
- **Land ramp:** 1–2 (Cultivate, Farseek, etc.)
- **Note:** Green has easier access; non-green decks may run higher land count instead

#### Card Draw (5–8 sources)
- **Direct draw:** 2–3 (Divination, Fabled Passage effects)
- **Filtering/Scrying:** 2–3 (Opt, Chromatic Lantern effects)
- **Tutors:** 1–2 (limited availability in Standard)
- **Advantage engines:** 1–2 (creatures/permanents that draw)

#### Targeted Removal (5–8 spells)
- **Creature removal:** 3–5 (Kill spell, damage-based)
- **Artifact removal:** 1–2 (Nature's Claim, Disenchant effects)
- **Planeswalker removal:** 0–1 (if meta-relevant)
- **Efficiency:** Prefer 1–3 CMC for tempo

#### Board Wipes (1–3 spells)
- **Creature-only:** 1–2 (Wrath of God equivalents)
- **Conditional:** 1–2 (By Force, Blasphemous Act effects)
- **Note:** Limited slots in 60-card format; choose wisely

#### Creatures (8–22 total, archetype-dependent)
- **Aggro:** 18–24 creatures
- **Midrange:** 12–16 creatures
- **Control:** 2–5 creatures (finishers only)
- **Combo:** 3–8 creatures (if combo pieces)

#### Win Conditions (3–6 sources)
- Combat damage from creatures (primary)
- Planeswalker ultimates (1–2 if included)
- Burn/direct damage (0–2 in red decks)
- Alternate win (rare; 0–1)

#### Mana Curve Target (60-card Standard Brawl)
- **1 CMC:** 2–4 cards
- **2 CMC:** 10–14 cards (peak)
- **3 CMC:** 10–12 cards
- **4 CMC:** 6–8 cards
- **5+ CMC:** 4–6 cards
- **Average CMC:** 2.5–3.2

### Standard Brawl by Archetype

| Archetype | Lands | Creatures | Removal | Draw | Ramp | Avg CMC |
|-----------|-------|-----------|---------|------|------|---------|
| **Aggro** | 22–24 | 18–24 | 3–5 | 0–2 | 2–3 | 2.0–2.5 |
| **Midrange** | 24–25 | 12–16 | 5–7 | 4–6 | 5–7 | 2.8–3.5 |
| **Control** | 25–27 | 2–5 | 8–10 | 6–8 | 3–5 | 3.5–4.2 |
| **Ramp** | 24–25 | 6–12 | 3–5 | 4–6 | 8–10 | 2.8–3.8 |
| **Tempo** | 23–24 | 14–18 | 6–8 | 2–4 | 2–3 | 2.4–3.0 |

---

## HISTORIC BRAWL (100-card, All Magic legal)

### Overview
- **Deck Size:** 100 cards (99 + 1 Commander)
- **Card Copies:** 1 of each (except basic lands)
- **Legal Cards:** All Magic except banlist
- **Format:** Closer to Commander than Standard Brawl
- **Player Count:** 1v1 on MTG Arena
- **Game length:** 20–40 minutes average

### Core Deck Ratios

| Category | Count | % of Deck | Notes |
|----------|-------|-----------|-------|
| **Lands** | 35–40 | 35–40% | 38 is typical starting point |
| **Mana Ramp** | 8–12 | 8–12% | Mana dorks, rocks, land ramp (10 baseline) |
| **Card Draw/Advantage** | 8–12 | 8–12% | Includes draw, filtering, tutors (10 baseline) |
| **Targeted Removal** | 8–12 | 8–12% | Single-target removal (10 baseline) |
| **Board Wipes** | 2–4 | 2–4% | 3 is typical |
| **Commander Synergy** | 5–10 | 5–10% | Direct synergy pieces |
| **Win Conditions/Finishers** | 5–10 | 5–10% | Threats and payoffs |
| **Interaction/Protection** | 3–6 | 3–6% | Counterspells, disruption |
| **Creatures** (excluding commander) | 18–28 | 18–28% | Varies by archetype |
| **Flex/Tech Slots** | 4–10 | 4–10% | Meta tech, niche synergies |

### Detailed Category Breakdowns (100-card Historic Brawl)

#### Lands (35–40 baseline)
- **Ideal:** 38 lands (golden number)
- **Mana-heavy/4+ color:** 39–40 lands
- **Low-curve ramp-heavy:** 35–37 lands
- **Composition:**
  - Basic lands: 4–8 (varies by color intensity)
  - Dual lands: 12–16
  - Utility lands: 6–10 (creature lands, cycling, shrines, etc.)
  - Fetch lands: 2–4 (if format allows)

#### Mana Ramp (8–12 sources, 10 baseline)
- **Mana dorks:** 2–4 (Llanowar Elves, Elvish Mystic, Noble Hierarch, etc.)
- **Mana rocks:** 3–5 (Sol Ring, Arcane Signet, Llanowar Elixir, etc.)
- **Land ramp:** 2–4 (Cultivate, Farseek, Sakura-Tribe Elder, Three Visits, etc.)
- **Treasure/special:** 0–2 (if relevant to strategy)
- **Importance:** Critical for consistency in 100-card singleton

#### Card Draw (8–12 sources, 10 baseline)
- **Direct draw:** 3–5 (Divination, Treasure Cruise, etc.)
- **Filtering/Scrying:** 2–4 (Opt, Elvish Visionary, etc.)
- **Tutors:** 2–4 (Demonic Tutor, Natural Order, etc.)
- **Repeatable engines:** 2–4 (creatures/permanents with draw)
- **Wheeleffects:** 0–1 (if strategy allows)

#### Targeted Removal (8–12 spells, 10 baseline)
- **Creature-only removal:** 4–6 (Path to Exile, Fatal Push, etc.)
- **Artifact/Enchantment:** 1–2 (Nature's Claim, etc.)
- **Planeswalker removal:** 1–2 (if meta-relevant)
- **Any-permanent removal:** 2–3 (Anguished Unmaking, Beast Within, etc.)
- **Efficiency:** Mix of 1–4 CMC for tempo

#### Board Wipes (2–4 spells, 3 baseline)
- **Creature-only:** 1–2 (Wrath of God, Supreme Verdict, etc.)
- **All permanents:** 0–1 (Pernicious Deed, etc.)
- **Conditional:** 1–2 (Engineered Explosives, Austere Command, etc.)
- **Sorcery vs Instant:** Mix preferred (instant-speed better vs. tempo)

#### Creatures (18–28 total, archetype-dependent)
- **Control:** 3–8 creatures (finishers only)
- **Midrange:** 16–20 creatures
- **Creature-focused:** 22–28 creatures
- **Combo:** 5–10 creatures (if combo pieces)

#### Win Conditions (5–10 sources)
- Combat damage from creatures (primary for most)
- Planeswalker ultimates (1–2 if included)
- Combo finishes (1–3 if applicable)
- Alternate win conditions (0–1)

#### Mana Curve Target (100-card Historic Brawl)
- **1 CMC:** 4–6 cards
- **2 CMC:** 12–16 cards (peak)
- **3 CMC:** 12–16 cards (peak)
- **4 CMC:** 10–12 cards
- **5 CMC:** 6–8 cards
- **6+ CMC:** 4–6 cards
- **Average CMC:** 2.8–3.5

### Historic Brawl by Archetype

| Archetype | Lands | Creatures | Removal | Draw | Ramp | Avg CMC |
|-----------|-------|-----------|---------|------|------|---------|
| **Aggro** | 34–36 | 22–28 | 4–6 | 2–4 | 4–6 | 2.2–2.8 |
| **Midrange** | 36–38 | 16–20 | 8–10 | 8–10 | 8–10 | 3.0–3.5 |
| **Control** | 38–40 | 3–8 | 12–14 | 10–12 | 6–8 | 3.5–4.2 |
| **Ramp/Combo** | 38–40 | 6–12 | 4–6 | 8–10 | 10–12 | 3.0–4.0 |
| **Tempo** | 36–37 | 16–20 | 8–10 | 4–6 | 4–6 | 2.6–3.2 |

---

### Standard Brawl vs. Historic Brawl Comparison

| Aspect | Standard Brawl | Historic Brawl |
|--------|----------------|----------------|
| **Deck Size** | 60 cards | 100 cards |
| **Lands** | 24–26 (40%) | 35–40 (35–40%) |
| **Mana Ramp** | 5–8 sources | 8–12 sources |
| **Card Draw** | 5–8 spells | 8–12 spells |
| **Removal** | 5–8 spells | 8–12 spells |
| **Board Wipes** | 1–3 | 2–4 |
| **Card Pool** | Standard-legal only | All Magic legal |
| **Consistency** | Lower (small pool) | Higher (larger pool) |
| **Games** | 15–25 min avg | 20–40 min avg |
| **Meta** | Rotates every ~2 years | More stable |
| **Most similar to** | Standard 60-card | Commander (smaller) |

---

---

## COMMANDER/EDH — THE COMMAND ZONE TEMPLATE (Modern Standard)

### Overview
The Command Zone podcast (Jimmy Wong & Josh Lee Kwai) publishes regularly updated deck-building templates. This is the **current modern standard** for 100-card Commander construction, more optimized than the 8x8 Theory.

### The Command Zone Template Ratios (100-card Commander)

| Category | Count | % of Nonland | Notes |
|----------|-------|---|-------|
| **Lands** | 35–38 | N/A | 37 is golden number |
| **Ramp** | 10–12 | 10–12% | Essential for consistency |
| **Card Draw** | 10–12 | 10–12% | High-impact category |
| **Single-Target Removal** | 10–12 | 10–12% | Variety of threat types |
| **Board Wipes** | 3–4 | 3–4% | Mix of speeds |
| **Commander Synergy** | 8–12 | 8–12% | Direct payoff cards |
| **Win Conditions** | 4–6 | 4–6% | Specific close-out lines |
| **Interaction/Disruption** | 5–8 | 5–8% | Counterspells, taxing, etc. |
| **Creatures** | 15–25 | 15–25% | Varies heavily by archetype |
| **Flex/Tech Slots** | 5–10 | 5–10% | Meta answers |
| **Total Nonland Spells** | ~62 | 100% | |

### Key Principles from The Command Zone
1. **Ramp is critical:** 10–12 pieces ensure you hit your natural progression
2. **Card draw separates winners:** 10–12 sources prevent running out of options
3. **Removal density matters:** 13–16 total interaction (single + wipes + counterspells)
4. **Speed over perfection:** Don't mulligan excessively for perfect hands
5. **Synergy packages:** Include 2–3 synergy sub-themes beyond just your commander

### Mana Curve for The Command Zone Template
- **1 CMC:** 3–5 cards (ramp, early interaction)
- **2 CMC:** 12–14 cards (peak; ramp, removal, creatures)
- **3 CMC:** 12–14 cards (peak; creatures, removal, draw)
- **4 CMC:** 8–10 cards (threats, removal)
- **5 CMC:** 6–8 cards (payoffs, wipes)
- **6+ CMC:** 4–6 cards (bomb finishers)
- **Average CMC:** 2.8–3.2

### Comparison: 8x8 Theory vs. Command Zone Template

| Metric | 8x8 Theory | Command Zone Template |
|--------|-----------|----------------------|
| **Framework** | Rigid (8 categories × 8 cards each) | Flexible (min/max ranges) |
| **Ramp** | 8 cards | 10–12 cards |
| **Draw** | 8 cards | 10–12 cards |
| **Removal** | 8 cards | 13–16 total (3–4 wipes + 10–12 spot) |
| **Synergy** | Custom (3 categories) | 8–12 cards |
| **Lands** | 35 (fixed) | 35–38 (adjustable) |
| **Flexibility** | Low (template rigidity) | High (ranges allow adjustment) |
| **Modern use** | Reference/starting point | Currently recommended |

---

## STANDARD FORMAT

### Overview
- **Deck Size:** 60 cards minimum (typically exactly 60)
- **Sideboard:** 15 cards (maximum, can use fewer)
- **Card Copies:** 4 of each (except basic lands, unlimited)
- **Legal Cards:** Cards from most recent 13-15 sets (rotation every ~2 years)
- **Next Rotation:** January 23, 2027 (Duskmourn and earlier rotate out)
- **Player Count:** 1v1 only
- **Competitive focus:** Tournament and ladder-focused

---

### Deck Composition (60-card baseline)

#### Land Count
- **Recommended:** 23-25 lands
- **Typical:** 24 lands (most common)
- **Range:** 22-26 lands
- **Adjustment by archetype:**
  - **Aggro:** 20-22 lands (fast clock, lower land requirements)
  - **Midrange:** 24-25 lands (balanced)
  - **Control:** 26-27 lands (higher cost spells, consistency)
  - **Ramp:** 23-24 lands (ramp sources replace some lands)

#### Land Composition (24-land baseline)
- **Basic lands:** 4-8 basics (meta-dependent)
- **Dual/Shock lands:** 8-12 duals
- **Fetch lands:** 2-4 fetches (format-legal fetches only)
- **Utility lands:** 2-4 utility (Faceless Haven, creature lands, etc.)
- **Budget note:** Standard lands are generally cheaper than EDH; high-impact lands worth including

#### Creature Count
- **Aggro:** 18-24 creatures (creatures are primary threat)
- **Midrange:** 12-18 creatures (balanced with spells)
- **Control:** 0-4 creatures (finishers only, often 0)
- **Tempo:** 14-18 creatures (efficient creatures + interaction)
- **Ramp:** 6-12 creatures (often ramp creatures)

#### Spell Count
- **Aggro:** 15-20 spells (mostly pump/combat tricks; 20-24 creatures total)
- **Midrange:** 20-28 spells (mix of interaction, draw, ramp)
- **Control:** 35-44 spells (removal, counterspells, draw; minimal creatures)
- **Tempo:** 24-32 spells (interaction-heavy)
- **Ramp:** 30-36 spells (ramp + payoff cards)

#### Ramp (Standard-specific)
- **Mana rocks:** 2-4 rocks (limited Standard-legal options)
- **Land ramp spells:** 2-4 spells (Cultivate, Explore effects)
- **Creature ramp:** 2-4 dorks (Llanowar Elves, etc.; if available)
- **Total:** 4-8 ramp sources (less than Commander due to speed)

#### Removal
- **Total removal:** 4-8 removal spells
- **Creature removal:** 2-4 cards
- **Artifact/Enchantment:** 0-2 cards
- **Board wipes:** 0-4 (control-heavy decks only)
- **Counterspells (blue):** 3-5 if control-heavy
- **Total interaction:** 4-10 spells

#### Card Draw
- **Recommended:** 2-6 draw spells
- **Control/Ramp:** 4-6 draw
- **Tempo:** 2-4 draw
- **Aggro:** 0-2 draw (rarely needed)
- **CMC:** 2-5 (typically 3-4)

#### Tutors
- **Count:** 0-2 tutors (less common in Standard due to limited selection)
- **Examples:** (format-dependent; tutors rare in recent Standard sets)

#### Win Conditions
- **Creatures attacking:** Primary (20-30 creatures across all archetypes)
- **Planeswalker ultimates:** 1-2 Planeswalkers
- **Combo win:** 0-1 (rare in recent Standard)
- **Burn spell:** 0-2 (in red-heavy decks)

### Sideboard Construction (15 cards)

#### Sideboard Strategy (Standard)
- **Purpose:** Customize deck between games based on matchup
- **Usage:** After Game 1, players swap main deck cards with sideboard cards (4-of limits apply across main + side)
- **Typical:** 8-10 cards are flex slots from main deck; 5-7 are unique sideboard cards

#### Sideboard Composition by Archetype

**Against Aggro (if playing midrange/control):**
- 2-3 Life gain cards
- 2-3 Board wipes (if not all in main)
- 2-3 Anti-aggro creatures

**Against Control (if playing aggro/midrange):**
- 2-3 Counterspell hate (Mystical Dispute, etc.)
- 2-3 Fast threats
- 1-2 Tutor-like effects

**Against Midrange (if playing control/tempo):**
- 2-3 Board wipes
- 2-3 Removal
- 1-2 Card advantage engines

**Against Combo (if playing any):**
- 2-3 Disruption (removal, counterspells)
- 1-2 Combo-hate cards (if applicable)

**Meta-specific slots:**
- 3-5 cards tuned to current metagame (specific creature hate, enchantment removal, etc.)
- 2-3 flex slots for experimentation

#### Sideboard Examples (15-card total)
**Typical control sideboard:** 2 Ceremonious Rejection, 2 Mystical Dispute, 2 Grafdigger's Cage, 2 Aether Gust, 2 Teferi, 2 Shark Typhoon, 1 Island (flex)

**Typical aggro sideboard:** 2 Embercleave, 2 Arcanist's Spellbook, 2 Scorching Dragonfire, 2 Tormod's Crypt, 2 Robber of the Rich, 2 Scavenging Ouphe, 1 Anax

---

## ARCHETYPE-SPECIFIC RATIOS

### AGGRO (20-23 lands, ~2.0 CMC)
- **Creatures:** 24-30 (primary strategy)
  - 1-drop: 8-12
  - 2-drop: 6-10
  - 3-drop: 4-6
  - 4+ drop: 0-2
- **Ramp:** 0-2 (not needed)
- **Draw:** 0-2 (not needed; creatures are advantage)
- **Removal:** 2-4 (mostly combat tricks, sideboard)
- **Counterspells:** 0 (non-blue aggro)
- **Tutors:** 0 (rarely)
- **Win Conditions:** Creature damage (all creatures contribute)
- **CMC Average:** 1.8-2.2

### TEMPO (22-24 lands, ~2.4 CMC)
- **Creatures:** 14-18 (efficient, evasive creatures)
- **Ramp:** 1-2 (some tempo decks)
- **Draw:** 2-4 (situational card advantage)
- **Removal:** 8-12 (creature-heavy removal)
- **Counterspells:** 2-4 (if blue tempo)
- **Evasion:** 4-6 creatures with flying/unblockable
- **Tutors:** 0-1
- **CMC Average:** 2.3-2.8

### MIDRANGE (24-25 lands, ~2.8 CMC)
- **Creatures:** 18-24 (powerful midgame threats)
- **Ramp:** 4-6 (moderate ramp)
- **Draw:** 4-6 (value-generating)
- **Removal:** 6-10 (varied removal)
- **Counterspells:** 0-2 (mostly in blue midrange)
- **Tutors:** 1-2
- **Win Conditions:** Creature damage + burn/tokens
- **CMC Average:** 2.8-3.5

### CONTROL (26-27 lands, ~3.3 CMC)
- **Creatures:** 0-4 (finishers only)
- **Ramp:** 2-4 (mana consistency)
- **Draw:** 6-10 (primary way to win: eventually draw win condition)
- **Removal:** 15-25 (primary strategy)
  - Spot removal: 6-10
  - Board wipes: 4-8
  - Counterspells: 6-10
- **Tutors:** 2-4
- **Win Conditions:** 1-2 finishers (Planeswalker ultimates, creatures, or mill)
- **CMC Average:** 3.0-3.8

### COMBO (varies, ~2.8 CMC)
- **Creatures:** 5-15 (combo pieces often creatures)
- **Ramp:** 5-8 (speed important for early combo)
- **Draw:** 4-6 (find combo pieces)
- **Removal/Counterspells:** 4-8 (protection for combo)
- **Tutors:** 4-8 (find combo pieces quickly)
- **Win Conditions:** 2-5 distinct combos
- **CMC Average:** 2.5-3.5

### VOLTRON (17-20 lands Commander, ~2.6 CMC)
- **Commander:** 1 (voltron target)
- **Other creatures:** 1-4 (rarely needed)
- **Equipment:** 12-18 (core of strategy)
- **Auras:** 4-8 (backup for equipment)
- **Protection:** 4-6 (counterspells, hexproof effects)
- **Ramp:** 4-6 (to cast commander + equipment)
- **Draw:** 2-4 (modest)
- **Removal:** 4-6 (removal, not wipes)
- **Tutors:** 2-4 (find equipment/auras)
- **CMC Average:** 2.5-3.2

### TRIBAL (37-38 lands, ~2.8 CMC)
- **Creatures:** 28-35 (tribal creatures)
  - Core tribe members: 20-28
  - Hybrid creatures: 4-6
  - Lone finishers: 1-2
- **Tribal lords/synergies:** 4-8
- **Ramp:** 4-6
- **Draw:** 3-5 (tribal synergies provide some)
- **Removal:** 3-6
- **Tutors:** 2-4 (find tribal lords, synergies)
- **CMC Average:** 2.8-3.2

### REANIMATOR (37-38 lands, ~3.5 CMC)
- **Large creatures (payoff):** 12-18 (in graveyard as targets)
- **Reanimate spells:** 5-8 (core strategy)
- **Mill/Discard (enablers):** 3-5 (put creatures in graveyard)
- **Ramp:** 4-6
- **Draw:** 3-5
- **Removal:** 3-6
- **Tutors:** 2-4 (find reanimate pieces)
- **Graveyard interaction:** 8-12 total
- **CMC Average:** 3.5-4.5

### SPELLSLINGER (38 lands, ~2.8 CMC)
- **Creatures:** 6-10 (spellcasting synergies)
  - Archmage Emeritus, Talrand, Ledger Shredder, etc.
- **Cantrips:** 4-8 (cheap spells for triggers)
- **Draw:** 6-10 (core synergy)
- **Removal/Counterspells:** 8-12 (instants/sorceries for triggers)
- **Ramp:** 3-5
- **Tutors:** 2-4 (find key creatures)
- **Recursion:** 2-3 (flashback, snapcaster effects)
- **CMC Average:** 2.8-3.5

### ARISTOCRATS (37-38 lands, ~3.0 CMC)
- **Creatures:** 22-28
  - Sacrifice fodder: 10-14
  - Aristocrat payoffs: 4-6
  - Sacrifice outlets: 2-4
- **Token generators:** 2-4
- **Ramp:** 4-6
- **Draw:** 4-6 (often sacrifice-triggered)
- **Removal:** 2-4 (some decks use token removal)
- **Tutors:** 1-3
- **CMC Average:** 2.8-3.2

### STAX (37-38 lands, ~2.8 CMC)
- **Creatures:** 8-15 (creature stax effects)
- **Artifact/Enchantment stax:** 8-12 (core strategy)
- **Ramp:** 4-6
- **Draw:** 2-4 (stax limits draws for all players)
- **Removal:** 3-6 (mostly creature removal)
- **Tutors:** 2-4 (find key stax pieces)
- **Win condition:** 1-2 finishers (often turns into control-like plan)
- **CMC Average:** 2.8-3.5

---

## COLOR IDENTITY ADJUSTMENTS

### Land Base Ratios by Color

#### Mono-color
- **Total lands:** 34 lands
- **Basic lands:** 8-10 basics
- **Dual lands:** 0-2 (if including commander-friendly duals like Bojuka Bog)
- **Advantage:** Fewer color-fixing needs, more specialized utility lands

#### Two-color (UR, WB, etc.)
- **Total lands:** 34-35 lands
- **Color balance:** 1:1 split (50/50 of both colors)
- **Basic lands:** 4-6 basics (2-3 of each color)
- **Dual lands:** 8-10 duals (split between color combinations)
- **Fetches:** 0-3 (if budget permits)

#### Three-color
- **Total lands:** 35-36 lands
- **Color balance:** Depends on commander; rough 1:1:1
- **Basic lands:** 3-5 basics (1-2 of each color)
- **Optimal tri-color base:** 3 ABUR duals + 3 Shocks + 9 other fixing lands (3-3-9 baseline)
- **Without ABUR duals:** 3 Shocks + 3 Check lands + 3 Pain lands + 4 Trilands + 2 Omnilands
- **Fetches:** 3-5 (if green, can tutor for duals)

#### Four-color
- **Total lands:** 36 lands
- **Color balance:** 1:1:1:1 split (roughly)
- **ABUR duals:** 1-2 (usually skip some if not 5-color)
- **Shocks:** 4 (one for each color pair)
- **Other fixing:** 10-14 assorted fixing lands
- **Fetches:** 4-5 (essential for consistency)

#### Five-color
- **Total lands:** 37 lands (highest baseline)
- **ABUR duals:** 3 (usually Tundra, Taiga, Underground Sea or similar budget picks)
- **Shocks:** 5 (one for each color)
- **Fetch lands:** 4-5 (essential)
- **Omnilands:** 8-12 (Command Tower, City of Brass, Exotic Orchard, etc.)

#### Budget Adjustments
- **Without ABUR duals:** Add +2 lands to any color identity (use cheaper duals)
- **Without fetches:** Add +1 land, use more basics and check lands
- **Without shocks:** Use pain lands, tri-lands, or budget duals

---

### Ramp/Draw by Color

#### Green (Best for ramp)
- **Ramp:** 8-12 sources (color advantage)
- **Draw:** 3-5 sources (creature-based)
- **Removal:** 3-5 (creature-focused)

#### Blue (Best for draw/control)
- **Ramp:** 2-4 sources (weakest color for ramp)
- **Draw:** 6-10 sources (color advantage)
- **Counterspells:** 6-12 (color advantage)
- **Tutors:** 2-4 (Mystical Tutor, Enlightened Tutor)

#### Black (Best for tutor/discard)
- **Ramp:** 2-4 sources (Dark Ritual, etc.)
- **Draw:** 4-6 sources (painful draw)
- **Removal:** 4-6 (creature/permanent removal)
- **Tutors:** 3-5 (Demonic Tutor, Vampiric Tutor, Grim Tutor)
- **Discard:** 2-4 sources (card advantage)

#### Red (Best for burn/hasty threats)
- **Ramp:** 1-3 sources (Seething Song, Burnt Offering)
- **Draw:** 2-4 sources (looting effects)
- **Removal:** 4-8 (damage/creature removal, board wipes)
- **Creatures:** Higher focus on creatures

#### White (Best for board wipes/removal)
- **Ramp:** 2-4 sources (limited)
- **Draw:** 2-4 sources (very limited)
- **Removal:** 6-8 (wipes, targeted removal, exile)
- **Protection:** 3-5 (hexproof effects, protection spells)

#### Multi-color Identity
- **Ramp by strongest color:** Tier it based on dominant color
- **Example (Grindy Ux):** Aim for Black + Blue synergy (8 draw sources, 4 tutors, 4 removal), plus Blue's counterspells (6-8)

---

## BUDGET CONSIDERATIONS

### Budget Tiers

#### Casual Budget (under $100)
- **Land base:** Basic lands + $0.50-$2 duals (Guildgates, Bounce lands, Scry lands)
- **Ramp:** Sol Ring, Fellwar Stone, Arcane Signet (3 rocks total)
- **Draw:** Budget cantrips, limited card advantage
- **Removal:** Under $2 removal (Swords to Plowshares is often in budget, some efficient creature removal)
- **Mana rocks:** Only essential ones (Sol Ring must-have)
- **Tutors:** 1-2 tutors if any (usually Mystical Tutor or Green Sun's Zenith)
- **Total cards:** 80-90 cards total
- **Consistency:** Lower (older, less efficient cards)

#### Mid-range Budget ($100-$300)
- **Land base:** Mix of $1-$5 duals (Check lands, Pain lands, some Shocks)
- **Ramp:** Sol Ring, Arcane Signet, 1-2 mid-range rocks ($2-$10 each)
- **Draw:** 4-5 draw sources
- **Removal:** Quality removal, 5-10 pieces
- **Mana rocks:** 5-6 rocks
- **Tutors:** 2-3 tutors
- **Card quality:** Mostly recent/modern cards, good synergies

#### Optimized ($300-$1000)
- **Land base:** Mix of $5-$30 duals (Shocks, some ABUR duals if legacy format)
- **Ramp:** 8-10 rocks, including Mana Vault, Chrome Mox (if budget)
- **Draw:** 8-10 draw sources
- **Removal:** 10-15 removal pieces, quality
- **Tutors:** 4-5 tutors
- **Card quality:** High-impact cards, optimized synergies
- **Total cost:** Well-rounded deck with most staples

#### cEDH Optimized ($1000-$8000+)
- **Land base:** ABUR duals, Fetches, High-impact lands ($30-$500+ each land)
- **Ramp:** 8-10 zero-mana rocks (Mox Diamond, Chrome Mox, Lion's Eye Diamond, etc.)
- **Draw:** Top-tier draw sources
- **Removal:** Top-tier interaction
- **Tutors:** 5-8+ tutors, including 0-cost tutors
- **Mana sources:** 40-55 total mana sources
- **Card quality:** Every card is optimized for competitive play

### Budget Substitution Chart

| Staple | Budget Alternative | Compromise |
|--------|-------------------|------------|
| Flooded Strand (Fetch) | Evolving Wilds | No tutoring; one-turn delay |
| Tundra (ABUR Dual) | Glacial Fortress (Check) | Comes in tapped sometimes |
| Mana Vault ($200+) | Everflowing Chalice | Slower ramp |
| Demonic Tutor ($100+) | Personal Tutor ($5) | Less flexible |
| Force of Will ($500+) | Spell Pierce ($2) | Conditional counter |
| Mox Diamond ($400+) | Jeweled Amulet ($10) | Slower activation |

### Budget Deck Building Tips
1. **Prioritize lands first:** Budget mana base first, then ramp, then other synergies
2. **Sol Ring is non-negotiable:** Only 0-mana accelerant in many budgets
3. **Use budget tutors:** Personal Tutor, Green Sun's Zenith, Recruit, Vampiric Tutor (cheaper than Demonic)
4. **Proxy expensive cards:** For playtest purposes, proxy cards to test before buying
5. **Use EDHRec budget tags:** Filter by budget on EDHREC to find optimized budget versions

---

## MANA CURVE DISTRIBUTION

### Percentile Breakdown (Non-land Cards, 63 cards total)

#### Balanced Midrange Curve
| CMC | Count | Percentage |
|-----|-------|-----------|
| 0 | 0 | 0% |
| 1 | 3 | 4.8% |
| 2 | 10 | 15.9% |
| 3 | 10 | 15.9% |
| 4 | 8 | 12.7% |
| 5 | 5 | 7.9% |
| 6 | 4 | 6.3% |
| 7 | 2 | 3.2% |
| 8+ | 1 | 1.6% |

#### Aggressive Curve
| CMC | Count | Percentage |
|-----|-------|-----------|
| 0-1 | 6-8 | 9-12% |
| 2 | 12-14 | 19-22% |
| 3 | 8-10 | 12-16% |
| 4+ | 4-6 | 6-9% |

#### Control Curve
| CMC | Count | Percentage |
|-----|-------|-----------|
| 0-1 | 2-3 | 3-5% |
| 2 | 6-8 | 9-12% |
| 3 | 8-10 | 12-16% |
| 4 | 10-12 | 15-19% |
| 5+ | 10-15 | 15-24% |

---

## FORMAT COMPARISON MATRIX

| Aspect | Commander | Brawl | Standard |
|--------|-----------|-------|----------|
| **Deck Size** | 100 | 60 | 60 |
| **Lands** | 37-38 | 23-25 | 23-25 |
| **Ramp Sources** | 10-13 | 5-8 | 4-8 |
| **Draw Sources** | 8-12 | 4-6 | 2-6 |
| **Total Removal** | 8-15 | 4-8 | 4-8 |
| **Counterspells** | 6-12 (blue) | 3-5 (blue) | 3-5 (blue) |
| **Creatures** | 20-30 | 8-20 | 12-24 |
| **Tutors** | 5-8 | 1-2 | 0-2 |
| **Win Conditions** | 5-10 | 2-4 | 1-2 |
| **Average CMC** | 2.5-3.5 | 2.5-3.2 | 2.3-3.0 |
| **Card Copies** | 1x max | 1x max | 4x max |
| **Card Pool** | All (unbanned) | Standard | Standard |
| **Consistency** | High | Medium | Medium |
| **Game Length** | 30-60 min | 15-25 min | 20-35 min |

---

## KEY TAKEAWAYS FOR AI IMPLEMENTATION

### Critical Ratios (non-negotiable)
1. **Lands:** 37-38 for Commander, 23-25 for Brawl/Standard
2. **Ramp:** 10-13 sources for Commander, 5-8 for Brawl, 4-8 for Standard
3. **Draw:** 8-12 for Commander, 4-6 for Brawl, 2-6 for Standard
4. **Removal:** 8-15 for Commander, 4-8 for Brawl, 4-8 for Standard
5. **CMC Average:** 2.8-3.2 for balanced decks

### Archetype-Specific Adjustments
- **Control:** +2 lands, +4 removal, -6 creatures, +3 draw
- **Aggro:** -4 lands, -4 ramp, -4 draw, +8 creatures, -5 removal
- **Combo:** -2 lands, +3 tutors, +2 ramp, +2 counterspells/protection
- **Voltron:** -8 creatures, +8 equipment/auras, +2 protection

### Color Identity Modifiers
- **Mono-color:** Standard baselines (best consistency)
- **2-color:** -1 land (tight mana base)
- **3-color:** +0 lands, need stronger dual lands
- **4-5 color:** +1-2 lands, require optimal fixing

### Budget Impact on Ratios
- **Budget decks:** More basic lands (-2 duals), fewer optimal rocks (-2 rocks), fewer tutors (-2 tutors)
- **cEDH decks:** Fewer lands (-8 lands), MORE zero-mana rocks (+4), faster average CMC (-0.5 CMC)

### Data Source Priority (for training)
1. **EDHREC statistics** (15.7 2-CMC average is ground truth)
2. **cEDH Decklist Database** (competitive ratios)
3. **MTGGoldfish metagame** (Standard/meta-specific data)
4. **TCGPlayer guides** (expert advice)
5. **Draftsim articles** (educational breakdowns)

---

---

## FRANK KARSTEN MANA BASE MATHEMATICS

### Overview
Frank Karsten's hypergeometric probability model is the gold standard for determining colored mana sources in Magic decks. Instead of guessing, you can calculate exactly how many colored sources you need for a specific probability of casting your spells on curve.

### The Model
**Question:** "What's the minimum number of colored sources I need to cast spell X with 90% certainty by turn T?"

**Answer:** Use hypergeometric probability to account for:
- Deck size (60 or 100 cards)
- Number of lands in opening hand
- Draw steps by turn T
- Color requirements of spell X

### Quick Reference: Colored Mana Sources Needed

#### For a "Double Color" Spell (e.g., UU, GG, WW)
- **90% certainty by turn 3:** 24–26 colored sources
- **90% certainty by turn 4:** 20–22 colored sources
- **90% certainty by turn 5:** 16–18 colored sources

#### For Casting on Turn 2 (Double-color spell)
- **60-card deck:** 24–26 sources minimum
- **100-card deck:** 28–30 sources minimum
  - Lands alone: ~12 in opening hand (3-land hand size prob) = 8–10 lands by turn 2
  - Need 16–18 more colored sources = rocks + dorks = 8–10 mana rocks/dorks

#### Color Identity Adjustments
- **Mono-color:** 16–18 sources (very easy)
- **2-color:** 24–26 colored sources (mixed or split across colors)
- **3-color:** 28–32 colored sources (high fixing required)
- **4-color:** 32–36 colored sources (maximum fixing)
- **5-color:** 36+ colored sources (heavily dependent on ramp quality)

### Practical Application for Deck Building

#### Example 1: 2-Color Deck (24-land baseline)
**Suppose:** Lands = 24, Ramp rocks = 6, Dorks = 2
- Total colored sources: 24 lands + 6 rocks + 2 dorks = 32 colored sources
- Breakdown: 12–13 per color for a balanced 2-color deck
- **Outcome:** Excellent mana fixing; can reliably cast 1-color and double-color spells

#### Example 2: 3-Color Deck (36-land baseline)
**Suppose:** Lands = 36, Rocks = 6, Dorks = 2
- Total colored sources: 36 + 6 + 2 = 44 colored sources
- Distribution needed: 10–12 per color (3 colors)
- **Outcome:** Good coverage if dual lands are optimal; may need more fixing rocks

#### Example 3: 5-Color Deck (38-land baseline)
**Suppose:** Lands = 38, Rocks = 10 (Arcane Signet, 5-color rocks), Dorks = 2
- Total colored sources: 38 + 10 + 2 = 50 colored sources
- Distribution: 8–10 per color (5 colors)
- **Outcome:** Tight but playable; ramp rocks must be generic/5-color

### Tools for Calculating Exact Numbers

**Online Calculators (recommended):**
1. **Scrollvault Mana Base Calculator** — `scrollvault.net/tools/manabase/`
   - Implements Frank Karsten's exact hypergeometric model
   - Input: spell requirements, deck size, turn you want to cast by
   - Output: exact number of colored sources needed

2. **Manabase.gg** — Community-driven, includes sample decklists
3. **Commander.Land** — EDH-specific mana calculations
4. **Salubrious Snail Manabase Tool** — Simple interface for quick checks

**Manual Calculation** (approximate):
- Assume 14 lands in opening hand (3 initial lands + draws over turns)
- For turn T, add T−1 draw steps
- Total mana available by turn T ≈ 14 + (T−1) lands drawn
- Colored sources needed ≈ (total mana available) × (% color in deck)

### Key Insights
1. **Color intensity scales with deck colors:** Mono costs ~18 sources, 5-color costs ~50
2. **Ramp rocks count as colored sources** if they produce the needed color
3. **Generic rocks (Sol Ring, Mana Crypt)** don't count as colored sources
4. **Fetch lands** effectively count as multiple colored sources (they "find" the right land)
5. **Dual lands** provide more consistency than split mana bases
6. **Artifact mana acceleration** frees up land slots for other effects

### Mana Curve Impact
- **Low average CMC (2.0–2.5):** Fewer colored sources needed; can run fewer lands
- **High average CMC (4.0+):** More colored sources needed; may need extra lands
- **Diverse color requirements:** More fixing rocks needed (Arcane Signet, etc.)

### Common Mistakes
1. **Assuming basic lands are sufficient** → Not true for multi-color; dual lands essential
2. **Counting colorless rocks as colored sources** → Sol Ring doesn't fix mana
3. **Not accounting for ramp in total source count** → Mana dorks are colored sources
4. **Underestimating 3+ color mana bases** → Need 32+ sources minimum
5. **Ignoring fetch lands** → Fetch lands improve consistency beyond raw source count

---

## REFERENCES

**Data Sources Used (2026-03-22):**
- [EDHREC - Superior Numbers: Land Counts](https://edhrec.com/articles/superior-numbers-land-counts)
- [EDHREC - Commander Mana Curves for Beginners](https://edhrec.com/articles/commander-mana-curves-for-beginners)
- [EDHREC - A Statistical Look at Commander 2025](https://edhrec.com/articles/a-statistical-look-at-almost-a-year-in-commander-2025)
- [Draftsim - How Many Lands in Commander](https://draftsim.com/mtg-edh-deck-number-of-lands/)
- [Draftsim - How Many Mana Rocks in EDH](https://draftsim.com/how-many-mana-rocks-edh/)
- [Draftsim - How Many Board Wipes in EDH](https://draftsim.com/edh-how-many-board-wipes/)
- [Draftsim - How Many Counterspells in Commander](https://draftsim.com/edh-how-many-counterspells/)
- [Draftsim - MTG Mana Curve Guide](https://draftsim.com/mtg-mana-curve/)
- [Draftsim - Budget cEDH Decks](https://draftsim.com/budget-cedh/)
- [Draftsim - EDH vs cEDH Differences](https://draftsim.com/cedh-vs-edh/)
- [Draftsim - MTG Standard Guide 2025-2026](https://draftsim.com/mtg-standard/)
- [MTGDecks - Standard Format Metagame](https://mtgdecks.net/Standard)
- [TCGPlayer - Optimal Mana Curve for Commander](https://www.tcgplayer.com/content/article/What-s-an-Optimal-Mana-Curve-and-Land-Count-for-Commander/)
- [TCGPlayer - Optimal Mana Curve for 60-card](https://www.tcgplayer.com/content/article/Must-Know-Ratios-for-Key-Standard-MTG-Cards/)
- [CoolStuffInc - How Much Ramp in EDH](https://www.coolstuffinc.com/a/markwischkaemper-06222023-how-much-ramp-is-right-for-your-commander-deck)
- [CoolStuffInc - Top 15 Mana Rocks 2025](https://www.coolstuffinc.com/a/abesargent-10242025-the-top-15-mana-rocks-of-all-time)
- [CardKingdom - Board Wipes in Commander](https://blog.cardkingdom.com/you-should-be-playing-more-board-wipes/)
- [cEDH Decklist Database](https://cedh-decklist-database.com/)
- [Magic.gg - Standard Metagame](https://magic.gg/)
- [MTG Wiki - Archetype](https://mtg.fandom.com/wiki/Archetype)
- [MTGSalvation Forums - Deck Ratios](https://www.mtgsalvation.com/forums/the-game/commander-edh/195692-deck-ratio)
- [TappedOut Forums - General EDH Ratios](https://tappedout.net/mtg-forum/commander/general-edh-ratios/)
- [AetherHub - Brawl Format Guide](https://aetherhub.com/Article/MTG-Brawl---Format-Guide-Rules-And-Deck-Building-Explained)
- [MTGArenaZone - Brawl Format Guide](https://mtgazone.com/brawl-format-guide/)

---

---

## SOURCES ADDED IN MARCH 2026 UPDATE

**Brawl Format Research:**
- [The 8x8 Theory](https://the8x8theory.tumblr.com/what-is-the-8x8-theory)
- [8 by 8 EDH (Interactive)](https://8by8edh.xyz/)
- [EDH Wiki - SevenByNine](http://wiki.edhrec.com/wiki/SevenByNine)
- [EDH Fandom - 7 by 9](https://edh.fandom.com/wiki/7_by_9)
- [Command Zone Template](https://edh.fandom.com/wiki/Command_Zone_Template)
- [Command Zone Podcast - Deckbuilding Checklist](https://www.mtggoldfish.com/articles/the-power-of-a-deckbuilding-checklist-commander-quickie)
- [MTGArena Zone - Historic Brawl Deck Building Guide](https://mtgazone.com/historic-brawl-deck-building-guide/)
- [Draftsim - Ultimate Guide to Standard Brawl](https://draftsim.com/mtg-arena-brawl-guide/)
- [Draftsim - Ultimate Guide to Historic Brawl](https://draftsim.com/mtg-arena-historic-brawl/)
- [MTG Salvation - Brawl Hands on Deck](https://www.mtgsalvation.com/articles/49711-brawl-hands-on-deck)
- [CoolStuffInc - Building Brawl by Bruce Richard](https://www.coolstuffinc.com/a/brucerichard-03232020-fixing-your-brawl-deck-by-adding-40-cards)
- [CoolStuffInc - The Rules of Brawl](https://www.coolstuffinc.com/a/covertgoblue-03172020-the-rules-of-brawl)
- [MTGRocks - Don't Make These Mistakes in Historic Brawl](https://mtgrocks.com/dont-make-these-mistakes-when-building-your-historic-brawl-decks)
- [MTGArena Zone - Historic Brawl Event Guide](https://mtgazone.com/100-card-historic-brawl-fnm-at-home-event-guide-and-decklists/)
- [Quora - How many lands in Brawl?](https://www.quora.com/In-Magic-the-Gathering-how-many-lands-should-be-in-a-Brawl-deck)
- [Magic.gg - Building Brawl](https://magic.wizards.com/en/news/feature/building-brawl-2018-05-01)
- [CardGameBase - Ultimate Guide to MTG Brawl](https://cardgamebase.com/mtg-brawl-guide/)

**Frank Karsten Mana Math:**
- [Scrollvault Mana Base Calculator](https://scrollvault.net/tools/manabase/)
- [Manabase.gg - Community Mana Tool](https://manabase.gg/)
- [Salubrious Snail Manabase Tool](https://www.salubrioussnail.com/manabase-tool/)
- [Commander.Land - Mana Calculations](https://commander.land/about.html)
- [Canadian Highlander - Manabase Building Guide](https://canadianhighlander.ca/2023/07/17/how-to-build-a-manabase-for-singleton-formats/)
- [GitHub - RainbowCalculator (Mana Analysis)](https://github.com/LazarQt/RainbowCalculator)
- [GitHub - Updated Manabase Guide](https://gist.github.com/teryror/881d60e08480a56043895d3bbb83c374)
- [Medium - The Math of Manabases in MTG Commander](https://medium.com/@schulze.mtg/the-math-of-landbases-in-magic-the-gathering-commander-3f03aadac92c)

---

**Document Created:** February 5, 2026
**Last Updated:** March 22, 2026 (Major Brawl expansion + Frank Karsten mana section)
**Prepared for:** MTG Deck Builder AI Training & Optimization
**Version:** 2.0
