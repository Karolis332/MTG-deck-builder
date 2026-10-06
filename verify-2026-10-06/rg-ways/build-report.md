# Arena Standard R/G Ways + walkers: converged build (2026-10-06)

Input `input.txt` (60, 21 lands) → `final.txt` (60, 23 lands). Card text = DB (`q.py`); rulings = Scryfall API (fetched today). Every scored alternative is in `alt/*.txt` + `alt/*.model.json` (`score.sh`, `mk.cjs`, `sum.cjs`).

**Verdict.** The operator's new direction holds for Emrakul and the Demon. It fails for Craterclaw: its X counts artifacts, and this deck makes creatures. Craterhoof Behemoth (owned ×4) does the same job with X = creatures and +X/+X.
- Optimizer 60 → **80**; Deck Score 69.68 → **83.44** (rank 47.8 → 75.5).
- Gate: every check PASSes except ownership, which fails only on Curse-Marred Demon and Emrakul (both owned, crafted after the CSV).

## §1 Plan (one primary, one backup)
- **Primary: ramp → walker engine → mass-pump alpha.**
  - Ajani: "Whenever you activate a loyalty ability, create a 2/2 colorless Wizard Soldier creature token named Cadet." So every Jace, Chandra or Garruk activation adds a body.
  - Craterhoof: "creatures you control gain trample and get +X/+X …, where X is the number of creatures you control".
  - Tyvar: "{3}{G}{G}: Creatures you control get +X/+X until end of turn, where X is the greatest power among creatures you control". The pump is the alpha.
  - Terror: "Whenever another creature you control enters, this creature deals damage equal to that creature's power to any target". It turns every Cadet, Beast and finisher into burn.
- **Backup: Emrakul and flyers.** Emrakul is a 12/12 with "Flying, trample / Ward—Sacrifice three permanents". With Ajani +1 ("gain haste") it attacks the turn it lands. Demon and Terror are the other flyers; Burst kicked (4), the Warlord −4 (2 to a player) and the Chandra +1 (2) add reach.
- **T1–3:**
  - Llanowar ("{T}: Add {G}") or Spider ("{T}: Add {R} or {G}"; "Whenever you cast a spell with mana value 4 or greater, untap this creature").
  - Way of the Pyromancer: walkers have "[+1]: Add {R}".
  - Burst / Sear.
  - T3: Tyvar, Paradox, Warlord, Overlord (impending {1}{G}{G}), or a 4-drop off a dork.
  - Emrakul's "{3}, Exile this card from your hand" goes on any turn with 3 spare mana (no timing restriction in the text).
- **T4–6:**
  - Chandra ("+1: Add {R}{R}"), Demon, Leatherhead, Garruk, Terror, Ajani.
  - Garruk draws on "a creature you control with power 4 or greater enters".
- **Close:**
  - Craterhoof (X ≈ 5.8 by T7, §3a).
  - Tyvar's pump, which has no timing restriction and can follow blocks.
  - Emrakul + Ajani +1.
- **Pilot note:** Ajani −3 "deals 4 damage to each creature except for tokens you control". It kills our Demon, Leatherhead, Terror, Tyvar and dorks; it does not target. Fire it only when the trade favours us.

## §2 Verdict on every card in the operator's list

| Card (op count → final) | Verdict | DB text / reason |
|---|---|---|
| Way of the Pyromancer 3 → 3 | keep | "Planeswalkers you control have "[+1]: Add {R}."" Every walker becomes a mana source and an Ajani trigger |
| Way of the Paradox 3 → 2 | count −1 | Legendary; #3 hits the legend rule. Its slot goes to Warlord (different name, both stay) |
| Chandra 2 → 2 | keep | "+1: Add {R}{R}" / "−3: … 4 damage to target creature" (all owned) |
| Ajani Unrelenting 3 → 3 | keep | The engine (Cadet per activation). P(≥1 by T6) is .495 with 3 copies, .363 with 2 |
| Garruk 2 → 2 | keep | "+2: Untap up to two target lands", draw on power ≥ 4, "−3: … 4/4 green Beast … trample" |
| Hungering Puppetbeast 2 → 0 | cut | 5/5 + "create a Heartwood token". Its job was Craterclaw's X; Terror takes the 5-slot (§3b) |
| Craterclaw Colossus 3 → 0 | cut | "+X/+0 …, where X is the number of artifacts you control". X ≈ 3.4 in the operator's list, 1 in the final (§3a) |
| Tenured Tethermage 3 → 0 | cut | 1/1 for {1}{R}{G}: "you may sacrifice a land. If you do, create two tapped Heartwood tokens" = +1 source from T4. Its value was Craterclaw's artifacts |
| Aerid Konstrari 1 → 0 | cut (near-tie) | 5/4 "Flying"; Heartwood on enters/dies. Leatherhead's hexproof counter wins the 4-slot (§3c) |
| Overlord of the Hauntwoods 1 → 1 | keep | Impending {1}{G}{G} makes "a tapped colorless land token named Everywhere"; 6/5 later = Tyvar X 6 |
| Curse-Marred Demon 2 → 2 | keep | 4/4 "Flying, trample"; "search your library for a card …, then discard a card at random" (odds §3e) |
| Emrakul, the Exigent Doom 2 → 1 | count −1 | Legendary. #2 is a second {3} mana mode in a deck with 8 dorks; a 3-drop (Paradox #2) is worth more (§4) |
| Improvisation Capstone 2 → 0 | cut | 7 MV; "After you first resolve a spell with this name" makes #2 redundant. The top end is Hoof/Emrakul |
| Grab the Prize 2 → 0 | cut | "As an additional cost … discard a card. Draw two cards." Card-neutral filtering; removal beats it |
| Bushwhack 2 → 0 | cut | "Target creature you control fights": a sorcery that needs a body. Burst is an unconditional instant |
| Llanowar Elves 3 → 4 | count +1 | Best T1 play; 4th copy owned. P(≥1 in the opening 7) = .399 |
| Spider Manifestation 3 → 4 | count +1 | Untaps on 16 cards with MV ≥ 4 in the final (Chandra 2, Demon 2, Leatherhead, Garruk 2, Terror 2, Overlord, Ajani 3, Hoof 2, Emrakul); "Reach" |
| Multiversal Passage 4 → 0 | cut | "pay 2 life. If you don't, it enters tapped", one colour → Annex / Starting Town (duals) |
| Rockfall Vale 4 → 4 | keep | "enters tapped unless you control two or more other lands"; R or G |
| Stomping Ground 1 → 2 | count +1 | Second owned copy, untapped dual |
| Forest 6 → 7, Mountain 6 → 5 | counts | G for Hoof {5}{G}{G}{G}, Tyvar/Overlord 1GG, T1 Llanowar (§5) |

## §3 Swaps (22 out → 22 in)

| Out → In | Why (DB) |
|---|---|
| 3 Craterclaw → 2 Craterhoof + 1 Tyvar | (a) below. Tyvar is also a 3-drop (only 4 cards at MV 3 now). "Legendary", so 1 copy |
| 2 Puppetbeast → 2 Terror of the Peaks (yesterday's final) | Pings on every Cadet (2), Beast (4), Hoof (5+X) and Emrakul (12). Puppetbeast's two artifacts mattered only for Craterclaw |
| 1 Aerid → 1 Leatherhead (yesterday's final) | (c) below |
| 1 Paradox (#3) → 1 Way of the Warlord (yesterday's final) | Paradox #3 dies to the legend rule. Warlord: "empower Jace 5" plus walkers get "[−4]: … 2 damage to up to one target creature or planeswalker and 2 damage to target player". Removal on every walker beats "you gain 1 life … additional land" |
| 2 Grab the Prize + 2 Bushwhack → 4 Burst Lightning | "deals 2 damage to any target … kicked, … 4". Unconditional instant, can go face. Input interaction was fight-only |
| 2 Capstone → 2 Sear | "4 damage to target creature or planeswalker", instant. Capstone #2 is redundant (§2) |
| 3 Tethermage → 1 Llanowar + 1 Spider + 1 Stomping Ground | Tethermage is a mana card two turns late; T1/T2 dorks and an untapped dual do that job on curve |
| 1 Emrakul (#2) → 1 Forest | 23rd land; Karsten 23.0 (§5) |
| 4 Passage + 1 Mountain → 3 Konstrari Annex + 2 Starting Town | Annex: "enters tapped unless you control a planeswalker" (6 Ways + 7 walkers), R or G. Starting Town: untapped T1–3, "Pay 1 life: Add one mana of any color". Model mana reason: "R has 15/16 timely sources" (Ba Sing Se build) → "G has 18/16" (R no longer flagged) |

**(a) Craterclaw vs Craterhoof**
- Both are haste 5/5s. Craterclaw is {4}{R}{R}{R}, +X/+0, X = artifacts. Craterhoof is {5}{G}{G}{G}, +X/+X, X = creatures. Ruling: "X is calculated only once, as [its] last ability resolves."
- Upper bound: every drawn card cast and alive; on the play; P(a given copy drawn) = 12/60 by T6, 13/60 by T7.
  - **Operator list, Craterclaw:** X = itself 1 + Puppetbeast 2×2 + Tethermage 3×2 + Aerid 1 = 11 artifact units × 13/60 + 1 = **3.38 at T7** (3.20 at T6).
  - **Final list, Craterclaw:** no other artifacts, so X = **1**.
  - **Final list, Craterhoof:** creature cards Llanowar 4 + Spider 4 + Demon 2 + Leatherhead 1 + Terror 2 + Tyvar 1 + Overlord ½ = 14.5 × 13/60 = 3.14. Add Cadets ≈ 1.5 (Ajani, P = .495 by T6, ~3 activations), a Beast ≈ 0.2, and Hoof itself 1 → **X ≈ 5.8 at T7** (5.6 at T6).
- **Alpha at T7:** the operator's board has ≈ 5.8 creatures. Craterclaw adds 3.4 × 5.8 ≈ **+20 power**. Craterhoof in the final adds 5.8 × 5.8 ≈ **+34 power, plus toughness**.
- The cost is one more mana (8 vs 7). Model: no difference (k10 = 83.44 either way).

**(c) Leatherhead vs Aerid.** Same MV and the same 5/4 body.
- Leatherhead: "Trample / Leatherhead enters with a hexproof counter on her", and it keeps the counter unless we choose to spend it ("you may remove a counter").
- DB Standard meta: Burst Lightning (4,247 lists) and Sear (3,170) are the two most-played spells, and both target. Aerid dies to either; Leatherhead can't be targeted. Trample also carries Tyvar's pump, which grants no trample.
- Aerid's edge: flying plus a Heartwood. Model: 80.72 → 83.44.

**(d) Emrakul mana line** (T7 on the play: 7 lands, one given "{T}: Add {C}{C}" by the exile ability, Llanowar, Spider)
- 8 (lands) + 1 + 1 = 10 → cast Emrakul from exile. Ruling: "You may use the mana ability Emrakul grants to the land while casting Emrakul from exile."
- Cast trigger: "untap all lands you control" → 7 lands. The CC ability ended ("until this card is cast from exile"), so they make 7 mana. Spider untaps (MV 10 ≥ 4): 7 + 1 = **8 → Craterhoof the same turn**. Hoof's X counts Emrakul; Emrakul itself is summoning-sick.
- With Ajani already on the battlefield, spend the 8 differently: Ajani +1 "gain haste" → Emrakul attacks as a 13/12 flier with trample.
- Garruk "+2: Untap up to two target lands" untaps the CC land for +3 on a later turn.
- T6 needs a walker's +1 ({R} or {R}{R}) first: 6 lands (one CC) + 2 dorks = 9.

**(e) Curse-Marred Demon's random discard**
- With h other cards in hand when the trigger resolves, P(the tutored card is discarded) = 1/(h+1).
- Typical T4 on the play: 10 cards seen − 4 lands − 3 spells (T1–3) − Demon = h 2 → **1/3**.
- On the draw, or cast T3 off a dork: h 3 → **1/4**.
- Late game: h 1 → 1/2; empty hand → certain. Cast it early, or with a full hand.
- Otherwise it is card-neutral: one random card is swapped for the chosen one (usually Hoof, Ajani or Sear).

## §4 Stop proof per role
Final full pass (`alt/h*`, `alt/k*`, `alt/m*`). The model is capped by synergy (qualityCap), so text decides; DS deltas are given as a signal.

| Role (kept) | Weakest kept | Best left out (DS Δ) | Why the kept card wins (DB) |
|---|---|---|---|
| Lands 23 (2 SG, 4 Rockfall, 3 Annex, 2 Starting Town, 7 F, 5 M) | Mountain #5 / Starting Town #2 | Multiversal Passage (0), Ba Sing Se (0, mana 98.5 → 98.2), Starting Town #3, Cavern of Souls, Fabled Passage, Commercial District, Gruul Guildgate, Rugged Highlands, Temple of Abandon | Passage costs 2 life or is tapped. Ba Sing Se is G-only. Cavern: "Spend this mana only to cast a creature spell of the chosen type". Fabled: "onto the battlefield tapped". The rest "enters tapped" |
| Dorks 8 (Llanowar 4, Spider 4) | Spider #4 | Bloom Tender (−2.8), Gene Pollinator (0), Elvish Archdruid (0), Zookeeper Mechan | Bloom: "For each color among permanents you control" is 1–3 mana, but it needs a red permanent and the Jace token, and is a 1/1. Pollinator: "Tap an untapped permanent you control". Archdruid: "{G} for each Elf" (4 Llanowar only), a 3-MV dork. Zookeeper: R only. Spider fixes R/G on T2, has reach, and makes 2 on big-spell turns. Mana is not short (23 lands + 8 dorks); bodies and fixing are |
| Removal 6 (Burst 4, Sear 2) + Warlord −4, Chandra −3, Ajani −3 | Sear #2 | Bushwhack (0), Grab the Prize (0), Konstrari Charm ("creature with flying" only), Fiery Annihilation (3 MV), Lightning Strike (3 dmg) | Sear is a 2-MV instant for 4 damage that hits walkers. The others are conditional, slower, smaller, or not removal |
| Ways 6 (Pyromancer 3, Paradox 2, Warlord 1) | Paradox #2 / Pyromancer #3 | Emrakul #2 (−2.7), Way of the Wildspeaker (0), Tyvar #2, Tezzeret | Paradox #2 is a 3-drop (only 4 cards at MV 3) whose "empower Jace 5" still resolves before the legend rule. Each loyalty point is a Cadet with Ajani out. Wildspeaker is 5 MV in a full 5-slot. Tyvar #2 is a legend duplicate. Pyromancer ×3 = P(Way by T2) .593 with 6 Ways |
| Walkers 7 (Chandra 2, Garruk 2, Ajani 3) | Ajani #3 | Tezzeret, Cruel Captain (0) | Tezzeret's "−3: Search … an artifact card with mana value 1 or less" finds nothing here; its "0: Untap target artifact or creature" is one more mana. Ajani #3 lifts the engine from .363 to .495 by T6 |
| Threats (Demon 2, Leatherhead, Terror 2, Overlord, Tyvar) | Overlord | Aerid (0 for Overlord, −2.7 for Demon), Leatherhead #2 (+2.8), Puppetbeast (−2.8), Hexhaven (0) | Overlord is the only T3 ramp that isn't a creature while impending, and becomes a 6/5 (Tyvar X 6). Leatherhead is "Legendary": #2 is dead while #1 is hexproof, and the model ignores the legend rule. Hexhaven costs GGGG |
| Finishers (Hoof 2, Emrakul 1, + Tyvar) | Hoof #2 | Overrun (+2.8), Craterclaw (0), Emrakul #2 (−2.7), Capstone (0), Prismabasher, Ghalta, Primal Hunger | Overrun gives a fixed "+3/+3 and … trample", is a sorcery, and fires no Garruk draw or Terror ping. Hoof's X ≈ 5.6–5.8 plus a 5/5 haste body. Craterclaw: §3a. Prismabasher: "up to X target creatures", X = colours (≤ 3). Ghalta is a single body |
| Card flow (Garruk draw, Jace −3, Chandra +1, Ajani −2, Demon tutor) | — | Grab the Prize, Bushwhack (land mode) | Ajani −2 "draw a card for each creature you control" pays off the dorks and Cadets. Grab is card-neutral |

**Stop:** no swap in this table improves the list on text. The model scores four variants higher (+2.8 each): Leatherhead #2 for Overlord or Terror, and Overrun for Hoof or Tyvar. Leatherhead #2 is a legend duplicate. Both cards only raise the model's "% of the library supports midrange" count (synergy U 23 → 24); neither wins a role comparison on text.

## §5 Mana
- **Karsten (`src/lib/land-math.ts`, 60 cards):** 19.59 + 1.90 × 3.43 − 0.28 × 11 = **23.03 → 23 lands**.
  - Inputs: avg MV 3.43 (gate); 11 cheap ramp (Llanowar 4, Spider 4, Pyromancer 3, the model's count).
  - Counting Emrakul at its {3} mode gives 22.7, also 23. Gate: "Karsten wants 23 ±2".
- **Land sources:** G 18 (2 SG, 4 Rockfall, 3 Annex, 2 Starting Town, 7 Forest). R 16 (11 duals + 5 Mountain). Plus Spider ×4 for either colour.
- **Needs** (principles.md §3.2 scaled ×23/41):

| Card | Need | Have |
|---|---|---|
| Pyromancer 1R | 11 R | 16 ✅ |
| Chandra / Demon 2RR | 15 R | 16 ✅ |
| Terror 3RR / Ajani 4RR | 13 / 12 R | 16 ✅ |
| Tyvar / Overlord (impending) 1GG | 16 G | 18 ✅ |
| Leatherhead 2GG / Garruk 3GG | 15 / 13 G | 18 ✅ |
| Hoof 5GGG (3CCC bound) | 16 G | 18 ✅ |

- **T1 untapped G (Llanowar):** 7 Forest + 2 Stomping Ground + 2 Starting Town = 11. P(≥1 in the opening 7) = **.778** (yesterday's 9 sources: .700).
- **Tapped lands:** Rockfall (land 1–2 only), Annex (no walker yet), Starting Town (from T4). Judgement ≈ 3 tapland-equivalents, within Karsten's ≤ 9.

## §6 Synergy density
Distinct partners in the final list, counted once per card (Burst and Sear are judged on efficiency).
- **Garruk 11:** 6 power ≥ 4 creatures; Ajani; Paradox; Pyromancer; Warlord; Spider.
- **Spider 10, Terror 10, Ajani 10, Hoof 10, Tyvar 9.**
- **Demon 6, Emrakul 6.**
- **Pyromancer, Paradox, Warlord, Chandra, Leatherhead, Overlord: 5 each.**
- **Llanowar 4:** Hoof X, Ajani −2/+1, Terror, Tyvar's tap cost.
- **Min 4, median 5.** The five lowest are Llanowar 4, then Pyromancer, Paradox, Warlord and Chandra at 5 (Leatherhead and Overlord also tie at 5).
- **Cut cards:**
  - Grab 0.
  - Bushwhack 1.
  - Tethermage 2: Craterclaw and Puppetbeast's sacrifice.
  - Capstone 2.
  - Craterclaw: many partners, but X = 1.

## §7 Model and Deck Score; gate

| | input | quick-v1 | **final** |
|---|---|---|---|
| Optimizer | 60 | 65 | **80** |
| Deck Score 1.4.0-rc10 (rank) | 69.68 (47.8) | 75.20 (60.2) | **83.44 (75.5)** |
| mana / curve / interaction | 80.2 / 78.2 / 90 | 98.5 / 79.7 / 90 | 98.5 / 86.8 / 95.3 |
| advantage / win / synergy | 94.5 / 85 / 62.1 | 89.6 / 85 / 69 | 82.3 / 85 / 79.3 |

- Leftover optimizer notes are commander quotas: "cutting 6 ramp (14/8)", "protection 1/2" (LEARNINGS 2026-10-05).
- **Gate** (`final.gate.txt`): PASS on size, singleton, legality, rules, identity, arenaNames, lands 23, plan, curve (avg MV 3.43; 1:8 2:9 3:4 4:5 5:5 6:3 7+:3), wincons 8 and locks.
  - Ownership FAILs only on Curse-Marred Demon and Emrakul, the expected crafts.
  - Copies: Llanowar 4, Spider 4, Burst 4, Sear 2, Terror 2 and SG 2 are within the pool counts. Ajani 3, Pyromancer 3 and Paradox 2 are within the operator's in-deck counts. Hoof 2/4, Tyvar 1/2, Annex 3/4, Starting Town 2/4, Warlord 1/1, Leatherhead 1/4.

## §8 Near-ties the operator may prefer
- **Aerid ↔ Leatherhead:** flying + a Heartwood vs hexproof + trample. Model 80.72 vs 83.44.
- **Emrakul #2 ↔ Paradox #2:** a second exile-ramp/finisher vs a 3-drop. Model −2.7 for Emrakul.
- **Craterclaw build (the operator's direction):** −2 Hoof −1 Tyvar −2 Terror +3 Craterclaw +2 Puppetbeast, plus Tethermage for X. It still tops out at X ≈ 3.4 (+X/+0) against Hoof's 5.8 (+X/+X).
- **Overrun ↔ Craterhoof #2:** 5 MV, "+3/+3 and gain trample". It comes earlier but is smaller (model +2.8).
- **Bloom Tender ↔ Spider #4:** more mana but a 1/1 without reach.
- **Wildspeaker ↔ Overlord or Terror #2:** Jace 7 plus a "[−4]" 4/4 Beast on every walker.
- **Mountain ↔ Konstrari Annex #3:** always untapped vs R/G behind the walker condition (model mana 98.8 vs 98.5).
