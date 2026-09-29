# Meren of Clan Nel Toth — Fable review (2026-09-28)

Reviewed: `meren-of-clan-nel-toth-final.txt` (100) vs the current 101-card deck. Gate on the final list
(read-only, `/tmp/meren-final-gate.txt`): size/singleton/legality/identity/lands/curve/wincons/locks PASS,
35 lands (35.4 eff.), avg MV 2.95, 12 wincons; ownership FAIL = Vraska (ASSUMED, expected); plan FAIL known.

## 1. Verdict

The final 100 is better than the current deck and plays well: the five kept swaps are all correct (two cut
tutor bodies for a drain doubler and a fodder engine, one fixes the 101st card, two fix a colourless land and a
low-value equipment). Two things the passes missed: Dina, Soul Steeper (rejected in coverage as "redundant with
Vito" — it is not, it stacks with Vito) and Avacyn, Angel of Horror, which was rejected only because its OUT
was an operator keep; if owned she is the strongest card in the file and belongs over Moldervine Reclamation.

## 2. Health — current (101) vs final (100)

| Category | Current | Final | Note |
|---|---|---|---|
| Lands | 35 + MDFC (Old-Growth Grove); 2 colourless-only (Grim Backwoods, High Market); 7 always-tapped | 35 + MDFC; 1 colourless-only; 8 always-tapped (Jungle Hollow) | B sources 27, G sources 22 + Orchard; 11 Swamp / 6 Forest fits BBB (Mikaeus, Wurm) over GG (Witness, Jarad) |
| Ramp | 8 (Sol Ring, Signet, Talisman, Mystic, Llanowar, Sakura-Tribe Elder, Springbloom Druid, Solemn) + Wight's land tutor | same | Springbloom/Elder/Solemn are Meren-recurrable ramp |
| Draw | 12 (Dispute, Rites, Haruspex, Reaper, Opportunist, Moldervine, Liliana, Solemn, Sylvan Library, Priest, Grim Backwoods, Braids AN) + 3 tutors (Emeritus, Grim Servant, RSD) | 12 + 1 tutor (Emeritus) | draw is death-gated but deep; the two tutor bodies were the right cuts |
| Removal | spot 6 (Trophy, Grasp, Saw in Half, Chupacabra, Haywire Mite, Charm-enchantment) + 6 edicts (Plaguecrafter, Marauder, Butcher, Braids CM, Priest, Liliana −4) | spot 7 (+Vraska, any permanent, repeatable at 3 exp) + 6 edicts | Chupacabra/Plaguecrafter/Marauder/Vraska all loop under Meren |
| Wipes | 3 (Toxic Deluge, Massacre Wurm, Culling Ritual + Charm regenerate) | 3 | unchanged |
| Protection | Greaves (shroud), Veil of Summer, Revitalizing Repast, Golgari Charm regen, Yahenni self | Veil, Repast, Charm regen, Yahenni self | experience counters are the player's, so a killed Meren re-enters with full recursion range; Greaves only bought tempo |
| Win lines | (1) Basking Broodscale + Long Feng or Mazirek = infinite Spawn deaths → Blood Artist / Zulaport / Cauldron / Syr Konrad; (2) Gray Merchant recursion + Jarad sac + Saw in Half; (3) edict grind (Braids CM, Butcher, Liliana); (4) Mikaeus undying board | same + Vito doubles every drain (loop = instant kill), Grave Titan as a 6-MV Meren target | curve 2.88 → 2.95; 7-drops 2 → 1, 6-drops 3 → 4 |

Loop check from oracle text: Broodscale "Whenever one or more +1/+1 counters are put on this creature, you may
create a 0/1 colorless Eldrazi Spawn" with "Sacrifice this token: Add {C}"; Long Feng "Whenever another creature
you control … is put into a graveyard from the battlefield, put a +1/+1 counter on target creature you control";
Mazirek "Whenever a player sacrifices another permanent, put a +1/+1 counter on each creature you control". Either
partner closes the loop; Meren's "Whenever another creature you control dies" counts tokens.

## 3. Swap review

| IN | OUT | Verdict | Reason (oracle) |
|---|---|---|---|
| — | Creakwood Liege | agree | 101st card. "At the beginning of your upkeep, you may create a 1/1 … Worm" is the 6th token engine (Ophiomancer, Jadar, Woe Strider's Goat, Grave Titan, Liliana +1). The operator's own 100-card powerhouse proposal already dropped it (HISTORY 09-09: −Creakwood Liege). |
| Vraska, the Cutting Glare | Lightning Greaves | agree (ASSUMED — confirm owned; if not, Greaves stays) | "When Vraska enters, if you control six or more lands, destroy target permanent an opponent controls. They create a Treasure token." MV 3 deathtouch; Meren at 3 exp returns her every end step = a Vindicate a turn. Greaves' "shroud" protects Meren's tempo only (experience is the player's) and blanks own targeting (Repast, Long Feng's counter). Costs: the target opponent gets a Treasure per trigger; 6 lands lands turn 5–6 with 8 ramp. |
| Vito, Thorn of the Dusk Rose | Grim Servant | agree | "Whenever you gain life, target opponent loses that much life." Every 1-life gain from Blood Artist, Zulaport, Cauldron, Moldervine, Haywire Mite ("When this creature dies, you gain 2 life"), Gray Merchant and Jungle Hollow becomes a second loss; inside the Spawn loop it doubles the kill. Grim Servant's "search … mana value less than or equal to your devotion to black … You lose 3 life" is a recurrable tutor, but Emeritus of Woe // Demonic Tutor ("if two or more creatures died this turn, this creature becomes prepared") covers it without the life. |
| Grave Titan | Rune-Scarred Demon | agree | "Whenever this creature enters or attacks, create two 2/2 black Zombie creature tokens." MV 6 sits inside Meren's reach one counter earlier than the Demon (MV 7), makes two bodies per ETB (Jarad: "Each opponent loses life equal to the sacrificed creature's power" = 6 off the Titan itself), deathtouch blocker. The Demon's tutor duplicates Emeritus. |
| Jungle Hollow | High Market | agree | "{T}: Add {B} or {G}" plus "you gain 1 life" (a Vito trigger) over "{T}: Add {C}". Four free outlets stay (Viscera Seer, Carrion Feeder, Woe Strider, Yahenni) plus Wight and Priest. Hollow enters tapped (8th always-tapped land); a 12th Swamp would be the untapped choice, but only 6 Forests carry GG, so the dual is right. |

REJECTs scanned — all stand except one re-slot (§4): Night's Whisper ← Butcher (Butcher's "each opponent sacrifices a
creature" repeats off every free outlet and is a Reanimate/Victimize/Junji target; the operator cut Night's Whisper
in v6); −Swamp (34 lands = new WARN); Massacre Girl ← Golgari Charm (Charm is the Culling Ritual lock, HISTORY line
169); Silence the Echo ← Veil (Veil's hexproof and "can't be countered" are unconditional); Restore with Empathy ←
Marauder (Marauder's "each player sacrifices a nontoken creature" loops at MV 2).

## 4. Overturned rejects

**Avacyn, Angel of Horror (IF-OWNED) — re-slot, do not reject.** The REJECT is right that The Gitrog is an operator
keep, but its second reason ("at MV 8 Meren mostly returns Avacyn to hand") ignores that this deck has five direct
routes onto the battlefield that ignore Meren's threshold: Reanimate ("Put target creature card from a graveyard
onto the battlefield"), Cauldron of Essence ("Return target creature card from your graveyard to the battlefield"),
Junji ("Put target non-Dragon creature card from a graveyard onto the battlefield"), Grave Researcher's prepared
Reanimate copy, and Victimize — with Buried Alive to put her there. Once in play, "Whenever Avacyn or another
nontoken creature you control dies, return that card to the battlefield under your control at the beginning of the
next end step" turns every free sac into a re-buy of Chupacabra, Plaguecrafter, Marauder, Gray Merchant, Solemn,
Eternal Witness and Grave Titan every turn, with all death triggers on the way. Not a game changer, bracket-3 legal.
OUT: **Moldervine Reclamation** (5-MV enchantment whose "you gain 1 life and draw a card" is the deck's 12th draw
effect). Only if the operator confirms ownership.

## 5. Misses

1. **Dina, Soul Steeper → OUT Ramunap Excavator.** Coverage rejected Dina as "redundant with Vito"; it is not.
   Vito converts an *amount* into one target's loss; Dina — "Whenever you gain life, each opponent loses 1 life" —
   converts each *event* into a loss for every opponent. A single death with Blood Artist, Zulaport and Cauldron out
   is three lifegain events: Dina drains each opponent 3, Vito drains one opponent 3 more, on top of the 3
   aristocrat drains. She is also a paid instant-speed outlet ("{1}, Sacrifice another creature: Dina gets +X/+0")
   and a 2-exp Meren target. Excavator's "You may play lands from your graveyard" has three feeders here (Fabled
   Passage, Myriad Landscape, Springbloom Druid's sacrificed land) and is a 3-mana 2/3 otherwise. Dina is open
   (Tam REJECT, in no final list, not sleeved). Operator note: Excavator was an operator pick over Rampant Growth
   (HISTORY 09-09); this is a stronger card in the same slot, not a reversal of that reasoning.
2. Considered, not clear enough to call misses: **Arnyn, Deathbloom Botanist** ("Whenever a creature you control
   with power or toughness 1 or less dies, target opponent loses 2 life and you gain 2 life" — a fourth aristocrat,
   equal to Zulaport+Vito in a 4-pod, only for small bodies); **Blight Mound** (a Pest per nontoken death — good
   with Dina/Vito, but a 3-MV enchantment that does nothing alone); **Witch of the Moors** (end-step edict +
   regrowth if you gained life — strong at 5 but no slot beats it); **Liliana the Repentant** (fra ASSUMED) — do
   NOT add: "Whenever another creature … you control enters, mill two cards" is mandatory and the Spawn loop
   creates a token per iteration, so the deck's own combo decks you.

## 6. Weakest 5 in the final list

1. **The Gitrog, Ravenous Ride** — needs combat damage *and* a saddled creature in a deck that rarely attacks; operator keep, stays.
2. **Long Feng, Grand Secretariat** — outside the Broodscale pairing it is a slow +1/+1 dripper; Mazirek closes the same loop and does more alone. Stays as combo redundancy.
3. **Ramunap Excavator** — three feeders only; the Dina slot.
4. **Moldervine Reclamation** — 5 mana, no board on entry, the 12th draw effect; the Avacyn slot if she is owned.
5. **Golgari Charm** — three narrow modes; kept for the Culling Ritual regenerate line (operator lock), stays.

## 7. Final change list vs the CURRENT deck (IN → OUT), ranked

| # | IN | OUT | Status |
|---|---|---|---|
| 1 | Vito, Thorn of the Dusk Rose | Grim Servant | apply |
| 2 | Grave Titan | Rune-Scarred Demon | apply |
| 3 | — | Creakwood Liege | apply (101 → 100) |
| 4 | Dina, Soul Steeper | Ramunap Excavator | apply (new; registered, open) |
| 5 | Jungle Hollow | High Market | apply |
| 6 | Vraska, the Cutting Glare | Lightning Greaves | apply only if Vraska is owned (ASSUMED); otherwise no change |
| 7 | Avacyn, Angel of Horror | Moldervine Reclamation | apply only if Avacyn is owned (IF-OWNED) |

Rows 1–5 give 100 cards, 35 lands + MDFC, 1 game changer (Braids, Cabal Minion), all locks intact. Rows 6–7 keep the
count at 100 and the land count unchanged.
