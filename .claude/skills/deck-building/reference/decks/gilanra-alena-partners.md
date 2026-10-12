# Gilanra, Caller of Wirewood + Alena, Kessig Trapper — paper Commander, big and stompy

Review 2026-10-09: proposed swaps in verify-2026-10-09/color-best/eval/gilanra-alena-partners/REVIEW.md (refuted: REFUTE.md), not yet applied. This guide describes the unsleeved draft `verify-2026-10-08/gilanra-stompy/final.txt`; the sleeved deck `decks/paper/decks/gilanra-alena-partners.txt` differs and has no guide of its own.

Pilot guide for `verify-2026-10-08/gilanra-stompy/final.txt` (2026-10-08 rebuild; the sleeved list is `decks/paper/decks/gilanra-alena-partners.txt` until the operator confirms the swaps). Base = the 2026-10-07 engine-first build (`verify-2026-10-07/gilanra-engine/`, 39 lands, goldfish-verified), patched for the cards Beledros took, the unfound Three Visits, and the operator's brief: Hexhaven Invigorator plus more Reality Fracture cards, "fun, big and stompy". No Opus refuter pass (agents barred this session) — the 10-07 refuter verdicts that still apply are kept.

## 1. Plan

**One plan: ramp on turns 1–3, Gilanra on 3, Alena on 5, then one fatty per turn — each fatty is a card (Gilanra, Selvala, Packleader, Primordial Sage, Soul of the Harvest), a burst of red mana (Alena) and damage on entry (Warstorm Surge, Terror of the Peaks) — until Moraug, Shriekwood or Ghalta ends it.** Backup: cascade value (Apex Devastator, Boarding Party, Trumpeting Carnosaur's discover, Monstrous Vortex) that keeps the fatties coming through a wipe.

```
T1 Llanowar  =>  T2 Frog / Florahedron / Signet / Talisman / Ruby / Caryatid  =>  T3 Gilanra (or Selvala, Loot, Shaper)  =>  T4 Surrak / Invigorator / Kyoshi  =>  T5 Alena  =>  T6+ a 6+ drop every turn: Gilanra's mana draws, Alena taps for its power next turn
```

## 2. Engine map

| # | Card | Oracle (verbatim) | Role |
|---|---|---|---|
| 1 | [[Gilanra, Caller of Wirewood]] | "{T}: Add {G}. When you spend this mana to cast a spell with mana value 6 or greater, draw a card." | 37 spells of MV 6+ in the 98: every big drop paid with her {G} is a card. ⚠️ Her mana must be spent on the 6+ spell itself. |
| 2 | [[Alena, Kessig Trapper]] | "{T}: Add an amount of {R} equal to the greatest power among creatures you control that entered this turn." | Cast a fatty precombat, tap Alena for its power in main phase 2: a 6-drop refunds six red. ⚠️ Only creatures that entered *this turn* count; she cannot tap the turn she enters (summoning sickness, {T} ability). |
| 3 | [[Selvala, Heart of the Wilds]] | "{G}, {T}: Add X mana in any combination of colors, where X is the greatest power among creatures you control." / "Whenever another creature enters, its controller may draw a card if its power is greater than each other creature's power." | Nets X − 1 every turn from T4 with any 4-power body; the draw is symmetric — opponents' biggest ETBs draw too. |
| 4 | [[Loot, the Nexus]] | "{T}: Choose a color. Add one mana of that color for each different power among creatures you control." | Powers 1, 2, 4, 6, 7 on board = 5 mana. Gilanra's draw does not apply (it is Loot's mana), but it pays for the 10-drops. |
| 5 | [[The Legend of Kyoshi]] | "I — Draw cards equal to the greatest power among creatures you control. / II — Earthbend X, where X is the number of cards in your hand. … / III — Exile this Saga, then return it to the battlefield transformed" → Avatar Kyoshi "{T}: Add X mana of any one color, where X is the greatest power among creatures you control." | A 6-MV draw-6 that becomes a Selvala. Earthbend makes a land a creature — it dies to a wipe. |
| 6 | [[Moraug, Fury of Akoum]] | "Landfall — Whenever a land you control enters, if it's your main phase, there's an additional combat phase after this phase. At the beginning of that combat, untap all creatures you control." / "Each creature you control gets +1/+0 for each time it has attacked this turn." | Land drop in main 1 = two combats; Fabled Passage, Riveteers Overlook, Gruul Turf (bounce, replay) and Traverse the Outlands are extra combats. ⚠️ Fetch in a main phase, never at instant speed. |
| 7 | [[Shriekwood Devourer]] | "Whenever you attack with one or more creatures, untap up to X lands, where X is the greatest power among those creatures." | Attack with a 7-power creature = seven lands untapped for main phase 2: a second fatty every turn. |
| 8 | [[Sakiko, Mother of Summer]] | "Whenever a creature you control deals combat damage to a player, add that much {G}. Until end of turn, you don't lose this mana as steps and phases end." | Combat damage is green mana for main phase 2 — with Gilanra's draw on the 6+ spell it buys. |
| 9 | [[Hexhaven Invigorator]] | "Vigilance / Whenever this creature is dealt damage, you may search your library for up to that many land cards, put them onto the battlefield tapped, then shuffle." | 6/6 for {G}{G}{G}{G}. [[Gruul Ragebeast]] ("Whenever this creature or another creature you control enters, that creature fights target creature an opponent controls") makes it fight on entry: the damage it takes is lands. Block with it for lands; only lands fetched in your main phase (Ragebeast's fight, a Warstorm/Terror trigger on it) give Moraug combats — lands from blocks or combat damage do not. |
| 10 | [[Warstorm Surge]] / [[Terror of the Peaks]] | "Whenever a creature you control enters, it deals damage equal to its power to any target." / "Whenever another creature you control enters, this creature deals damage equal to that creature's power to any target." | Every fatty is 6–12 to the face or a removal spell. Both out = double. |
| 11 | [[Identity Echo]] | "{3}{R}: Exile target creature or planeswalker you control. Reveal cards from the top of your library until you reveal a creature or planeswalker card. Put that card onto the battlefield … Activate only as a sorcery." | Turn a Llanowar Elves, Frog, Caryatid, Florahedron or a Beast token into the next creature in the library (32 of 47 creatures print 5+ power, plus Ulvenwald Hydra). ⚠️ The exiled creature does not come back. Cascade/discover do not trigger (not cast); Warstorm, Terror, Packleader, Soul, Selvala do. |
| 12 | [[Apex Devastator]] / [[Ghalta, Primal Hunger]] / [[Earthshaker Dreadmaw]] | "Cascade, cascade, cascade, cascade" / "This spell costs {X} less to cast, where X is the total power of creatures you control. / Trample" / "Trample / When this creature enters, draw a card for each other Dinosaur you control." | The top end: Apex is five spells for ten mana (Gilanra draws, Alena taps 10); Ghalta costs {G}{G} with 10 power on board; Dreadmaw draws for Ghalta, Etali, Burning Sun's Avatar, Trumpeting Carnosaur and Regal Behemoth. |
| 13 | [[Spinerock Knoll]] | "{R}, {T}: You may play the exiled card without paying its mana cost if an opponent was dealt 7 or more damage this turn." | One Warstorm/Terror trigger or one fatty's combat damage unlocks it — exile a 6+ drop. |

## 3. Mana (39 lands + 12 ramp pieces)

| Group | Cards |
|---|---|
| Lands 39 | 16 Forest, 16 Mountain, Command Tower, Sheltered Thicket ("Mountain Forest", cycling), Gruul Turf, Konstrari Annex ("enters tapped unless you control a planeswalker" — Garruk only; it is a tapped dual), Fabled Passage, Riveteers Overlook, Spinerock Knoll |
| Dorks / rocks (T1–2) | Llanowar Elves, Poison Dart Frog ("{T}: Add one mana of any color"), Tangled Florahedron (a land when you need the drop), Ilysian Caryatid ("add two mana of any one color" with a 4-power creature), Ruby, Daring Tracker, Sol Ring, Arcane Signet, Talisman of Impulse |
| T3 engines | Gilanra, Selvala, Loot, Simulacrum Shaper, Outcaster Trailblazer ("add one mana of any color" on entry; draws on every 4-power entry) |
| Big ramp | Elvish Aberration ("{T}: Add {G}{G}{G}", forestcycling {2}), Traverse the Outlands ("up to X basic land cards, where X is the greatest power" — 6–10 lands, and a Moraug combat), Regal Behemoth, Savage Ventmaw, Shriekwood Devourer, Sakiko, Avatar Kyoshi |

Why 39: the 10-07 engine build measured the sleeved 36-land list at keep-7 .60 and 4th land on T4 .84 against .73 / .90 at 39 (`verify-2026-10-07/gilanra-engine/build-report.md`); this list keeps the 39 and the same ramp count. `verify-2026-10-08/gilanra-stompy/metrics.log` has the goldfish (this list, two variants, the engine build; 1,500 games): keep-7 .71 (sleeved .58), 4th land on T4 .92 (.86), Alena by T5 .97 (.93), screwed .008 (.036); 6+ casts by T8 10.6 (sleeved 8.8, engine 12.4 — the five FRA spells are cheaper than the bodies they replaced).

## 4. Turn plan

```
T1  Forest, Llanowar (a tapped dual if no 1-drop)
T2  Frog / Florahedron / Signet / Talisman / Ruby / Caryatid; hold Konstrari Charm mana later, not now
T3  Gilanra (she is the card engine) — or Selvala / Loot / Shaper if Gilanra's G is not there
T4  Surrak (haste for everything from T5), Hexhaven Invigorator, Kyoshi, or Garruk's Packleader
T5  Alena, or a 6-drop off Gilanra + rocks (draw a card); Warstorm Surge / Terror if the board is empty of fatties
T6+ Fatty precombat (Gilanra draws, Terror/Warstorm hit), attack (Shriekwood untaps, Sakiko adds), main 2: Alena taps for its power → second fatty. Land drop in main 1 with Moraug out.
```

## 5. Keep / mulligan (London)

Keep: 3–5 lands + a T1–2 ramp piece, or 2 lands + two ramp pieces with a green source.

| Hand | Verdict |
|---|---|
| 3 lands (G), Llanowar, Signet, Surrak, Terror of the Peaks | ✅ Keep — T1 dork, T2 rock, T3 Gilanra from the zone, T4 Surrak/Terror. |
| 4 lands, Caryatid, Traverse the Outlands, Ghalta | ✅ Keep — Traverse on T5 for 4+ lands, Ghalta cheap after. |
| 2 lands, Sol Ring, Ruby, Etali, Apex Devastator | ⚠️ Keep only with a G source for Gilanra; mull on the draw with two Mountains. |
| 5 lands + Apex + Ghalta | ❌ Mull — nothing before T6; bottom Apex. |
| 1 land + Llanowar + Frog + fatties | ❌ Mull — one Beast Within and you are dead. |
| 3 lands + Violent Echoes + Konstrari Charm + Identity Echo + Beast Within | ❌ Mull — no threats, no ramp. |

## 6. Misplays and traps

- ⚠️ **Gilanra draws only when her mana pays for a 6+ MV spell.** Float her {G} into a 5-drop and the draw is lost; tap her last.
- ⚠️ **Alena counts creatures that entered this turn** — cast the fatty, then tap Alena, not the other way round; she does nothing the turn she herself enters.
- ⚠️ **Moraug's landfall must happen in a main phase.** Cracking Fabled Passage at end of turn or in combat gives no combat. Gruul Turf returns a land: replay it for a second trigger next turn.
- ⚠️ **Selvala's draw is for every player** — with an opponent's Craterhoof it draws them a card. Keep her off the table against bigger creatures when the draw is theirs.
- ⚠️ **Identity Echo exiles** (no return) and is sorcery-speed; never aim it at Gilanra or Alena.
- ⚠️ **Hexhaven Invigorator's lands enter tapped** and "up to that many" is optional — fetch Spinerock Knoll and the duals; do not thin basics you need for Traverse.
- ⚠️ **Gruul Ragebeast fights with every creature you control that enters** — a Llanowar Elves enters and fights (and dies). Hold dorks until the fight target is worth it, or let the Ragebeast fight itself first.
- ⚠️ **Terror of the Peaks' tax ("cost an additional 3 life")** does not stop a wipe; Beast Within in response to a wipe saves nothing — use it on the wipe's caster's best permanent beforehand or hold Konstrari Charm for the flyer.
- ⚠️ **Konstrari Annex enters tapped** unless Garruk is out; count it as a tapped dual on the curve.
- ⚠️ **Cleanup Crew / Beast Within are the only answers to an enchantment**; Violent Echoes and Konstrari Charm are creature answers. Save Cleanup Crew's trigger for a Rhystic Study / Propaganda, not for value.

## 7. What changed and why

Against the sleeved list this is the 10-07 engine build (20 changes: 7 big drops for better big drops, 6 non-engine cards for cheap ramp/fixing/interaction, 3 weak drops + Diamond City + 3 Forests for 7 lands — refuter-backed, never applied) plus ten 2026-10-08 patches:

| Out (engine build) | In | Why |
|---|---|---|
| Three Visits | Simulacrum Shaper (FRA) | not found → deregistered 2026-10-08; Shaper fetches a basic and draws when it dies |
| Thunderfoot Baloth | Hexhaven Invigorator (FRA) | Baloth is in Beledros; the operator's must-have |
| Horizon of Progress | Forest | in Beledros; Invigorator wants GGGG |
| Evolving Wilds | Gruul Turf | in Beledros |
| Rorix Bladewing | Loot, the Nexus (FRA) | vanilla 6/5 for RRR → a mana engine |
| Ulvenwald Observer | Violent Echoes (FRA) | 6-MV slow draw → instant 6 damage |
| Shamanic Revelation | Konstrari Charm (FRA) | Kyoshi I is the draw-6; the Charm is a 2-MV flyer answer / trample / CCC |
| Aurora Phoenix | Identity Echo (FRA) | 5/3 → repeatable polymorph of a dork into a fatty |
| Hideous Taskmaster | Moraug, Fury of Akoum | 7/2 for 7 → extra combats on landfall |
| Planetarium of Wan Shi Tong | Earthshaker Dreadmaw | the Urza draft needs the Planetarium; a 6/6 trample at MV 6 that draws per Dinosaur. Goldfish (`metrics.log`, 1,500 games): Dreadmaw beats Gigantosaurus on every metric (6+ casts by T8 10.6 vs 10.0, Gilanra draws 3.44 vs 3.36) — the 10/10 for five does not draw off Gilanra |

Reality Fracture cards in the list: Hexhaven Invigorator, Loot, the Nexus, Simulacrum Shaper, Identity Echo, Violent Echoes, Konstrari Charm, Konstrari Annex (7).

## 8. Maybeboard (owned, free)

| Card | Swap for | When |
|---|---|---|
| Gigantosaurus | Earthshaker Dreadmaw | 10/10 for {G}{G}{G}{G}{G} — bigger, but MV 5 draws nothing off Gilanra; goldfish −0.6 six-plus casts |
| Rorix Bladewing | Konstrari Charm | the sleeved 6/5 flying haste; goldfish +0.07 Alena chains, within noise — the operator's call if the Charm feels small |
| Edgar, Moonlit Sovereign (FRA) | Simulacrum Shaper | if the operator wants an 8th FRA card: flash 4/4 that grows when you skip a spell — not stompy |
| Ruric Thar, the Unbowed / Slinza / Spearbreaker Behemoth / Calamity / Foe-Razer Regent / Nessian Wilds Ravager / Emergent Woodwurm | any 6-drop | the sleeved fatties the engine build cut for consistency (Ruric hits you for your 12 noncreature spells; Spearbreaker needs held mana); Slinza's fights feed Invigorator |
| Kozilek, the Great Distortion / Terastodon / Avenger of Zendikar / Cityscape Leveler | Oblivion Sower / Emissary of Grudges | bigger top end if the games show mana to spare |
| Skyshroud Claim / Rampant Growth / Harrow | a 6-drop | if the goldfish keep-7 drops under .70 after sleeving |
| Vastlands Scavenger | Outcaster Trailblazer | the 10-07 refuter's pick; cheats the best fatty for 5 |
