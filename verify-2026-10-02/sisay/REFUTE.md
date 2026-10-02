# Captain Sisay: refuter pass on `final.txt` (2026-10-02)

Scope: the 10 swaps quick-v1 → final (diff verified: 10 OUT, 10 IN incl. +1 Forest), an adversarial scan of every
screen line for each role, and a rules sanity check. All quotes are from `pool-0*.md`.

## 1. Swap verdicts

| # | IN | OUT | Verdict | Note |
|---|---|---|---|---|
| 1 | Bloombrute | Anthem of Champions | KEEP | "Whenever you gain life, draw a card. This ability triggers only once each turn." beats a plain "+1/+1" |
| 2 | Germinate Recruits | Monastery Mentor | KEEP | X = "the amount of life you gained this turn". On an engine turn X ≥ 10. Mentor is the better engine, Recruits the better finisher; fine either way |
| 3 | Karn, the Great Creator | Arlinn, Voice of the Pack | KEEP (marginal) | Karn's −2 is dead in Arena Brawl. His value is 4 MV, +1 = a free Paradox trigger, and "Activated abilities of artifacts your opponents control can't be activated" (shuts off opposing Signets, Talismans, Treasures, equip, The One Ring). The report undersells Arlinn: her "−2: Create a 2/2 green Wolf" makes a token every turn that feeds 7 ETB lifegain sources, Caretaker and Belladonna. Defensible at 2 MV less |
| 4 | Caretaker's Talent | Mirari's Wake | KEEP | "Whenever one or more tokens you control enter, draw a card" for 3 MV; also an enchantment (Archon, Pia, Enlightened) |
| 5 | Hinterland Sanctifier | Authority of the Consuls | KEEP | Our tokens vs "a creature an opponent controls" in 1v1 |
| 6 | Kutzil, Malamet Exemplar | Tomik, Orzhov Lawmage | KEEP | "Your opponents can't cast spells during your turn". Legendary (Sisay target) |
| 7 | Virulent Emissary | Ajani's Pridemate | KEEP | Pridemate creates no events. Emissary creates one per creature |
| 8 | Ossification | Beza, the Bounding Spring | KEEP | Beza's clauses are mostly off in a lifegain-ramp deck. Ossification is "exile target creature or planeswalker" for 2 |
| 9 | Vigorbloom Annex | Temple of Plenty | KEEP | "enters tapped unless you control a planeswalker" vs always tapped |
| 10 | Forest | Ba Sing Se | KEEP (marginal) | With 18 basics, Ba Sing Se is nearly always untapped, so the report's "enters tapped" reason is weak. Forest still wins because of Nissa, Utopia Sprawl, the Ossification basic count and basic-only fetches |

All quoted oracle text in the swap table checks out against the pools.

## 2. Missed improving swaps (ranked)

| Rank | IN | OUT | Reason (quoted) |
|---|---|---|---|
| 1 | **Emergency Eject** {2}{W} instant [coll] | Beast Within | Same reach and speed: "Destroy target nonland permanent." The difference is the leftover. Beast Within gives a 1v1 superfriends opponent "a 3/3 green Beast creature token" that attacks walkers next turn. Eject gives "a Lander token" ("{2}, {T}, Sacrifice: Search ... basic land ... tapped"), a slow ramp with no pressure on walkers. Beast Within's only extra is hitting lands, which is almost never relevant. The report compared Beast Within only to Reduce to Memory; Eject was never evaluated |
| 2 | **Inspiring Commander** {4}{W}{W} [coll] | The Great Henge | "Whenever another creature you control with power 2 or less enters, you gain 1 life and draw a card." No once-per-turn cap. Every Cadet, Kithkin, Samurai, Wall, Pegasus and Cat (doubled by Doubling Season or Sunborn) is a card plus a Mentor event, so it doubles as the 9th lifegain source. Henge "Whenever a **nontoken** creature you control enters ... draw a card" misses the deck's main output (tokens). It costs 9 minus a usual max power of 2–4, so 5–7 in practice. Caveat: Elesh Norn and Talent L3 (+2/+2) push tokens above power 2, so don't level Talent to 3 while Commander is out. Henge's legendary status costs Sisay 1 of her 28 targets, which is acceptable. Alternative OUT if Henge stays: Leonin Warleader. Not evaluated in any stop proof |
| 3 | **Flare of Fortitude** {2}{W}{W} instant [LIST] | Dawn's Truce | The report dismissed Flare as "costs 4". But "You may sacrifice a nontoken white creature rather than pay this spell's mana cost", and the deck has 13 nontoken white creatures (Sisay, Liliana, Aunt May, Haliya, Dazzling Angel, Sanctifier, Belladonna, Sunborn, Archon, Bloombrute, Warleader, Elesh, Kutzil). That makes it 0 mana, castable while tapped out after an engine turn. Effect: "permanents you control gain hexproof and indestructible" with no gift to the opponent, plus "your life total can't change". Truce needs {1}{W} plus a gifted card to reach the same indestructible |

Considered and rejected (no strict gain):
- **Aang's Iceberg / Web Up for Kenrith's Transformation.** Both answer any nonland permanent (the deck's only flexible answer is Beast Within, or Eject after swap 1). Kenrith's is better against commanders, which stay as a 3/3 instead of returning to the command zone, and it cantrips. Lateral.
- **Impassioned Orator for Dazzling Angel.** Same clause, 1 MV cheaper, but no flying to block fliers at walkers. A tie, as the builder says.
- **Clachan Festival, Kinbinding or Hexhaven Battalion for Leonin Warleader.** Each is close (enchantment tokens without attacking). None is strict.
- **Gandalf the White for Archon of Sun's Grace.** Gandalf doubles legendary/artifact ETB triggers, but tokens are not legendary. Narrow.
- **Paradise Druid or Ilysian Caryatid for Talisman of Unity.** Creature dorks feed 7 ETB lifegain sources but die to our own Sunfall. Lateral.
- **Little Bear, Vow to Erebor, Stony Strength (Sisay untaps).** All one-shot; they lose to Formidable Speaker's repeatable "{1}, {T}: Untap another target permanent".
- **Lands.** Every owned land not in the deck was checked. Radiant Grove ties Arctic Treeline, Etched Cornfield and Thornglint Bridge are worse tapped duals, Multiversal Passage is worse than a basic, and the rest are colourless or restricted. Converged.
- **Walkers.** 13 owned, 12 in. Ways: 4/4. Converged.

## 3. Rules flags

1. **Karn, the Great Creator.** The "−2: ... from outside the game" finds nothing in Arena Brawl (no sideboard). The report acknowledges this. Karn is a static + "+1 that does nothing" walker unless Way of the Healer or Way of the Wildspeaker is out.
2. **Belladonna Took is not a per-creature lifegain source.** "you gain 1 life if this is the first time this ability has resolved this turn" means one event per turn at most. The health table's "8 creature-ETB lifegain sources" is really 7 + Belladonna.
3. **Panharmonicon stop proof is wrong on rules.** It says Panharmonicon "does nothing on its own" and is "redundant with Doubling Season and Exalted Sunborn". In fact it doubles every creature-ETB trigger: the 7 lifegain sources, Haliya on artifacts, the Pia and Formidable Speaker tutors. That multiplies with token doublers rather than duplicating them. The conclusion (loses to Archon; Mentor events are already plentiful) can stand; the stated reason cannot.
4. **Flare of Fortitude stop proof misstates its cost** (see swap 3 above).
5. **Urza's Ruinous Blast play note is incomplete.** It also exiles our Ossification and Kenrith's Transformation, which returns or restores the opponent's answered permanents. It exiles Doubling Season, Caretaker's Talent, Sylvan Library, Greaves/Boots, rocks, dorks, all tokens, and the Jace token unless that token is legendary (the empower reminder text does not say it is).
6. **Kutzil.** The report says Sisay turns "can't be countered or answered at instant speed". It stops only spells; activated abilities and triggered answers still work.
7. **Health table "Every 1-drop ramp piece ... and Emissary".** Virulent Emissary is not ramp. Cosmetic.
8. **Germinate Recruits** is an instant. "Main 2" is fine, but it can also be cast after combat lifelink on an opponent's attack step if more life was gained. No error.

No card in `final.txt` is dead in Arena Brawl apart from Karn's −2 clause. Dungeons (Ellywick), perpetual (Fuel Tank Feaster) and Warp (Haliya, Sunborn) all work on Arena. Every claimed interaction was checked and holds: Doubling Season on loyalty, Mentor × Paradox, Tezzeret 0 and Speaker untapping Sisay, Kutzil's draw on anthem-pumped creatures, Archon's 10 enchantments, and the 28 legendary targets (27 nonland + Eiganjo).

VERDICT: NOT CONVERGED (3 improving swaps)
