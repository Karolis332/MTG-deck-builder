# Pilot guide fact-check — 2026-10-02

Checked every quoted oracle string against the live card DB (`q.py`), every named card against
its deck's `decks/paper/decks/*.txt`, the flagged Jace MA −7 / Ob Nixilis HT math, and the
rules-interaction claims (Paradox×Mentor, proliferate, party, undying, unearth, historic,
initiative, Spelunking). Only problems are listed in each guide's table; everything else quoted
matched the DB verbatim or as a meaning-preserving paraphrase.

## tam-the-possibility.md

| line | claim | DB says | verdict | fix text |
|---|---|---|---|---|
| 16 | "each card drawn is its own draw, CR 121.2" | CR 121 is **Counters**, not drawing cards. The "multiple cards drawn one at a time" rule is CR 120.3 | WRONG | cite CR 120.3, not 121.2 |

**Math re-check (the known suspect):** Jace, Memory Adept −7 = "Any number of target players each draw twenty cards" (DB exact). Ob Nixilis, the Hate-Twisted = "Whenever an opponent draws a card, Ob Nixilis deals 1 damage to that player" (DB exact). 20 draws × 1 damage = **20 damage per targeted opponent** — the guide's "20 dmg" is correct; an older "40 damage" draft version (per the deck-building skill's LEARNINGS note) would have been wrong.

Spot-checked and confirmed correct: Tam's cost reduction + proliferate text, all 7 Ways' ETB-empower and granted ability text, Jace RS 0/+1, Vraska −9/0, Kiora −8, Elspeth +1/−3/−7, Chandra AI +2/−3, Tezzeret +2, Ral Zarek −7, Professor Dellian Fel −6, Sorin lifelink, Liliana the Faultless, Ajani Resolute/Unrelenting, Interplanar Beacon, Nexus Mentality (both modes, "may choose both" with a commander), Sarkhan the Masterless (loses planeswalker type — correct, no "in addition to its other types" clause), Fumigate, all 6 Annex/Commons lands' "enters tapped unless you control a planeswalker" text, and every cited mana cost (Counterspell {U}{U}, Dovin's Veto {W}{U}, Settle the Wreckage {2}{W}{W}, Vigorbloom Charm {G}{W}, Tam {1}{G}{U}, Way of Paradox {2}{G}, Way of Mentor {2}{W}). The T3→T4 Jace-token loyalty math (5 → 4 after a −1 → 9 after Mentor's empower-5) is internally consistent and correct. Esika, God of the Tree's DB entry is the MDFC "Esika, God of the Tree // The Prismatic Bridge"; the guide's back-face quote matches.

**46 quotes/claims checked, 45 OK.**

## tazri-beacon-of-unity.md

| line | claim | DB says | verdict | fix text |
|---|---|---|---|---|
| 29 | Spelunking lets Farseek/Kodama's Reach/Explore/Courtyards/Mutavault-token lands "always enter untapped" despite being put onto the battlefield tapped by a spell | Spelunking's own text is only "Lands you control enter untapped" (DB exact); whether this overrides a *spell's* "put it onto the battlefield tapped" instruction (vs. a land's own static "~ enters tapped" ability) is a genuinely contested replacement-effect interaction not resolvable from oracle text alone | UNSURE | confirm the exact Spelunking ruling before relying on "skip the shock's life" / "Farseek lands untapped" at the table — if wrong, those lands stay tapped |

Spot-checked and confirmed correct: party-count (highest-type-count ruling, zone-independence), all 6 changelings (Outcast, Chomping, Vandal, Mirror Entity, Mutable Explorer, Unsettled Mariner) actually have Changeling, Burakos/Stonework Packbeast/Tajuru Paragon's "also a Cleric, Rogue, Warrior, and Wizard" text, Destined Warrior/Blade Historian/Squad Commander/Nalia alpha text, Karlach/Najeela extra-combat text, Mardu Siegebreaker × Squad Commander math (3 copies × 4-party ETB = up to 12 Kor Warriors), the legend-rule cite (CR 704.5j), initiative-package card list (all 5 named cards do say "you take the initiative"), Grand Abolisher/Heroic Intervention/Selfless Spirit/Linvala text, Coveted Prize's free-cast clause, and Zagras's planeswalker-destroy text.

**37 quotes/claims checked, 36 OK.**

## meren-of-clan-nel-toth.md

| line | claim | DB says | verdict | fix text |
|---|---|---|---|---|
| 24 | Saw in Half: "its controller creates two tokens that are copies of that creature" (quote ends there, no ellipsis) | Full text: "...except their power is half that creature's power and their toughness is half that creature's toughness. Round up each time." | WRONG | add "…except half power/toughness (round up)" — the drain/devotion logic the guide draws from it is still correct, but the token stats as quoted look like full copies |

Math re-check: Blood Artist is "target player" (single-target) vs. Zulaport/Cauldron/Konrad's "each opponent" (all-target) — the guide's "120 deaths" (40 life × 3 opponents, one at a time) vs. "40 deaths" (hits all three at once) split is correct for a 4-player/40-life pod. The Mikaeus "no undying to Humans" exclusion list is fully correct — Meren, Plaguecrafter, Priest of Forgotten Gods, Zulaport Cutthroat, Eternal Witness, Ophiomancer, Grim Haruspex, Morbid Opportunist, Syr Konrad, Jadar, Long Feng, and Braids CM are all typed Human in the DB. The paired "loops through Mikaeus" list (Chupacabra, Gray Merchant, Accursed Marauder, Woe Strider, Solemn Simulacrum, Butcher of Malakir, Blood Artist, Viscera Seer) are all confirmed non-Human. Emeritus of Woe/Demonic Tutor and Grave Researcher/Reanimate "becomes prepared" text matches exactly. CR 603.3d→601.2c (targets locked when a triggered ability goes on the stack) and CR 707.2 (copiable values) citations check out.

**31 quotes/claims checked, 30 OK.**

## imotekh-the-stormlord.md

| line | claim | DB says | verdict | fix text |
|---|---|---|---|---|
| 27 | "Umbral Collar Zealot replaces Altar only at a cost of {0}" | Zealot's ability is "Sacrifice another creature or artifact: Surveil 1" (DB exact) — it produces **no mana**, unlike Ashnod's Altar's "Add {C}{C}" | UNSURE | the loop's mana-neutrality math assumes Altar's 2 colorless mana; Zealot can stand in as a free *sacrifice outlet* but does not replace the mana Altar generates — reword so the pilot doesn't expect mana from Zealot |

Spot-checked and confirmed correct: Imotekh's Phaeron trigger and Grand Strategist text, Biotransference's full text, Marionette Apprentice/Master/Mirkwood Bats/Psychomancer/Necron Overlord drain text, all 5 unearth costs quoted in the engine map (Chronomancer {2}{B}, Skorpekh Lord {2}{B}, Royal Warden {3}{B}, Triarch Praetorian {4}{B}, Lokhust {5}{B}{B}{B}) match the DB exactly, the "one trigger per multi-card return" ruling holds for Lively Dirge/War in Heaven/Technomancer/Lychguard (each returns its cards as a single event), Metalwork Colossus's cost-reduction/return text, Ghost Ark's crew-grant text, Cryptek's recursion text, The Darkness Crystal and Phyrexian Scriptures III exile text, Liliana the Repentant's mandatory mill, Wishclaw Talisman's opponent-control clause, and Walking Ballista's X=0-on-nonpaid-entry ruling (not in this deck, but used analogously — see Cabbage below).

**41 quotes/claims checked, 40 OK.**

## the-cabbage-merchant.md

No WRONG or UNSURE findings. Every checked quote matched the DB verbatim or as a safe paraphrase, including: Peregrin Took × Academy Manufactor ordering (CR 616.1, controller's choice), Displaced Dinosaurs' exact "becomes a 7/7 Dinosaur creature in addition to its other types" wording, the commander's drain/Food-tax/no-{T}-symbol mana ability, Teething Wurmlet's unconditional artifact-ETB lifegain (3 triggers per Trudge-loop pass, matching Food+Clue+Treasure all being artifacts while the Beast token is not), Walking Ballista's X=0 ruling when fetched by Chord/Invasion/Font, Return of the Wildspeaker's non-Human restriction (Toski = Squirrel, Took = Halfling both qualify; Jaheira = Human Elf Druid, The Earth King = Human Noble Ally both correctly excluded), Invasion of Ikoria's actual "non-Human creature card" text, Halsin's base-P/T-4/4 timestamp overriding a 7/7 Dinosaur, and Autumn's Veil/Force of Vigor's narrow ("blue or black" / "not your turn") wording.

**35 quotes/claims checked, 35 OK.**

## Total

**190 quotes/claims checked across 5 guides: 186 OK, 2 WRONG (CR 121.2 cite in Tam; Saw in Half's truncated quote in Meren), 2 UNSURE (Spelunking vs. spell-tapped lands in Tazri; Umbral Collar Zealot "replaces Altar" in Imotekh).** No card named in any guide was missing from its deck list; no example hand used a card outside its own list.

## Orchestrator re-check (2026-10-02)
- Tam CR cite: **verifier wrong.** CR 2026-09-25: "121. Drawing a Card … 121.2. Cards may only be drawn one at a time"; 122 is Counters. Guide unchanged. The 20-damage maths is right: DB and live Scryfall give Ob Nixilis, the Hate-Twisted "deals 1 damage".
- Tazri Spelunking: **guide right.** Scryfall ruling 2023-11-10: "If a land you control is simply put onto the battlefield tapped without a replacement effect being applied, it always enters untapped"; for "enters tapped" lands (shocks) you choose the order. Guide unchanged.
- Meren Saw in Half: quote completed. Imotekh Zealot: reworded (sacrifice outlet only, no mana).
