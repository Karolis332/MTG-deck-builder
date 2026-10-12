# REFUTE — Anti-Venom `final.txt` (Arena Competitive Brawl, 1v1)

## Verdict
❌ **NOT CONVERGED.** There is one swap: **−Mesmeric Orb, +Panharmonicon**. Panharmonicon is an owned engine doubler that the builder never verdicted.
- The report also misses four infinite lines. Three of them are 3-card loops that use neither Gyatso nor Greaves.
- Errors found: **HIGH 1 · MED 5 · LOW 8**. Combo A / A′ / A″ are correct as written. The gate shows only the known FAILs.

| Check | Result | Evidence |
|---|---|---|
| 1 Oracle exactness | ⚠️ | §2 quotes are verbatim. Errors 5, 7, 9 and 11 are misreads elsewhere. |
| 2 Combo lines | ⚠️ | A / A′ / A″ PASS. Line C is not castable on T4 (error 4). Liliana as X gives nothing (error 7). Four lines are missing (errors 2–3). |
| 3 Dead cards | ⚠️ | Mesmeric Orb is the weakest card (table below). Krang, One Ring, Arkenstone and Tune Up each have a case. |
| 4 Convergence | ❌ | Panharmonicon was never tested. Hound, Patriot and Lavaspur were dismissed for the wrong reasons. The 8 operator cuts hold (table below). |
| 5 Mana | ✅ / ⚠️ | WWWWW sources are fine. AV ≤T5 on the play is .75, under the 0.80 Brawl flag (error 13). The goldfish reproduces. |
| 6 Gate | ✅ | FAIL legality (Chrome Mox, Flawless — known), FAIL ownership (Echoverse — known), FAIL plan (known). WARN arenaNames and lands. All else PASS. |

## Errors
1. **HIGH — Panharmonicon is never verdicted** (pool l.801, owned, {4}).
   - Oracle: "If an artifact or creature entering causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time."
   - Every Anti-Venom cast then reanimates **two** creatures. That is Gandalf's doubling without needing Gandalf to survive.
   - It also doubles Aang AM / Appa SG / Appa LSB / Teyo ETBs, Meteor Golem (2 destroys), Alabaster (2 exiles), Battlesphere (8 Myr), Moonshaker (two pumps), Airlift Chaplain (mill 6), Synthoids (surveil 4), Witch Enchanter and Liliana's lifegain.
   - It turns every loop in errors 2–3 into a kill with Perilous Myr. It is an artifact, so Enlightened Tutor and Tune Up reach it.
   - The report also has no line for Roaming Throne ("If a triggered ability of another creature you control of the chosen type triggers, it triggers an additional time"). Named Hero, it doubles only Anti-Venom. It is a near-tie behind Panharmonicon.
   - **Fix:** the swap below.
2. **MED — Three Gyatso-free 3-card infinite loops are missing.** Each airbends Anti-Venom with its own ETB:
   - Aang, Airbending Master: "When Aang enters, airbend another target creature."
   - Appa, Steadfast Guardian: "airbend any number of other target nonland permanents you control"
   - Appa, Loyal Sky Bison: "Whenever Appa enters … Airbend another target nonland permanent you control"
   - Anti-Venom + Ashnod's Altar + any one of them = a loop (§ walk-through E–G). With Gyatso, Teyo is a fourth ("target permanent you control gains hexproof" → Gyatso airbends Anti-Venom).
   - The report lists Aang only as "X" inside the Gyatso + Greaves loop and never notes that Aang replaces both.
   - **Fix:** add the lines to §4. State that Ashnod's Altar is the single point of failure: no other free sac outlet is owned, so recovery is Tune Up / Restoration Seminar / Enlightened Tutor.
3. **MED — The Myr Battlesphere kill is missing; it needs no commander.**
   - Pieces: Gyatso + Greaves (or Éowyn-Swiftfoot) + Altar + Battlesphere.
   - Equip {0} → airbend Battlesphere → cast it for {2} → "create four 1/1 colorless Myr" → sacrifice four for {C}×8 → **+6 per loop**. That is infinite mana and infinite Myr.
   - To finish, equip Greaves for real (decline Gyatso) and attack: "tap X untapped Myr … deals X damage to the player". Tapping the Myr is not their own {T} cost, so summoning-sick tokens can pay it.
   - **Fix:** add as line I. Rank Battlesphere above the "4/7 + four 1/1s" read in §5.
4. **MED — Line C is not castable on T4.**
   - "T2 Coldsteel Heart. T3 Seriema → Krang to hand; Map/Terminal loot Krang away. T4 Anti-Venom ({W}×5 = 4 lands + Heart)."
   - On T4 that needs Map {2} + loot {2} (or Terminal {3} + {1}) on top of Anti-Venom's 5, with only 5 mana available. Even Chrome Mox + T1 Map leaves T4 at 6 of the 7 needed.
   - **Fix:** the Seriema route gives Krang on T5. A T4 Krang needs it already binned (mill, cycling draw, Mountain-king I, Echoverse ETB).
5. **MED — Avatar's Wrath's lock is quoted without its duration.**
   - The report says "theirs are locked out by 'your opponents can't cast spells from anywhere other than their hands'".
   - The oracle continues: "**Until your next turn**, …". From their second turn on, the opponent recasts every airbended creature for {2}. This is a one-turn tempo wipe, not a clear.
   - **Fix:** state the duration in the plan and close sections.
6. **MED — Stop-proof misreads in the targeter and engine roles.**
   - Patriot ("{2}, {T}: Another target creature you control … gains hexproof") and Prehistoric Pet ("{1}{W}, {T}: Return another target creature") are filed as "one-shots". Both are repeatable.
   - Flickering Hound was dismissed because it "fires while Anti-Venom is still the spell on the stack". But it triggers on **every** creature spell and can target the creature Anti-Venom reanimated last time. Gyatso then airbends it, the fatty recasts for {2}, and that cast triggers Hound on Anti-Venom.
   - Lavaspur Boots was tested against Swiftfoot, not against the weakest targeter (Teyo). That is the 10-06 learning again.
   - **Verdicts after re-testing:** Teyo stays, because it is a 2-MV loop piece (error 2) and protects Gyatso. Patriot and Lavaspur are near-ties. Hound vs Airbender Ascension is a near-tie. None of them clears the bar.
7. **LOW — Liliana as the looped card X gains nothing.**
   - Her trigger is "Whenever **another** creature or planeswalker you control enters". If she is the reanimated card, nothing enters while she is out.
   - She must already be on the battlefield. Then she gives +2 life per loop (Anti-Venom + X).
8. **LOW — Ephemerate under Gyatso loses rebound.**
   - Gyatso's trigger resolves first. Ephemerate's only target is then gone, so the spell does not resolve (CR 608.2b), and rebound only works "as it resolves". It goes to the graveyard.
   - So "Ephemerate (rebound) already does Cloudshift's job" holds only for off-Gyatso flickers (Appa SG / Aang / fatty ETBs). There the claim is right.
9. **LOW — Restoration Magic is "the only one that saves Gyatso himself from targeted exile": false.** Teyo ("target permanent you control gains hexproof") and Liliana ("Another target creature … gains hexproof") also do it. The verdict stands.
10. **LOW — A phantom Emergency Eject.**
    - Emergency Eject is in neither `quick-v1.txt` nor `original.txt`.
    - §5 says it was "cut for Flawless Maneuver (§2 row 5)" and §7 says "Eject replaces Flawless". Both contradict §2 row 5, where Sheltered by Ghosts is cut.
    - The Eye of Jace and Celebrate goldfish rows are also measured against that intermediate list.
11. **LOW — Sunstar Expansionist "before the land drop".**
    - It needs 2 mana from N−1 lands, so it works from T3 on the draw (T2 only with Chrome Mox).
    - On the play it never fires unless you miss a drop or the opponent ramps.
12. **LOW — Timing caveats are omitted.**
    - Éowyn's trigger airbends at the beginning of combat. Anti-Venom is then recast in main 2, so he and his reanimated target miss that combat.
    - Liliana's "{1}, {T}, Discard" needs her held since the turn began.
13. **LOW — The mana flag is not raised.**
    - Anti-Venom ≤T5 on the play is .75 (reproduced), under the 0.80 Brawl flag in principles §6.
    - Without the 9 never-cast fatties, avg MV is 2.89 → regression ≈ 37.7 lands vs 35.8 effective. +1 land ≈ +.02.
    - This is the operator's call; it needs stating once.
14. **LOW — "Mono-W has no other draw engine"** ignores The Arkenstone's "At the beginning of your end step, draw a card". Also missing: The One Ring's upkeep loss grows 1, 2, 3… at 25 life, so stop tapping it at about 3 burden counters unless Liliana is gaining life.

## Swap
| Out | In | Why |
|---|---|---|
| **Mesmeric Orb** | **Panharmonicon** | **Orb:** the builder's own add (the operator never ran it). It is symmetric in 1v1, so every opposing graveyard commander gains about 4 cards a turn. It mills our Ashnod's Altar, the loops' single sac outlet. Its measured value is small: the builder's goldfish with Panharmonicon dead in Orb's slot gives fatty-in-yard ≤T6 .45 → .41 (play) and .51 → .48 (draw); AV ≤T4/T5 is unchanged. **Panharmonicon:** doubles every reanimation from the turn it lands, and makes Perilous Myr a kill on loops E–H (A already kills). **Alternative if the operator wants Orb's mill:** cut Airbender Ascension instead (goldfish cost 0; loses a 2-MV airbend and the slow quest blink). |

## Combo walk-through (main phase, empty stack between steps; "−" = mana spent)
- **A — Gyatso + Greaves + Altar + Perilous Myr in the yard: ✅ correct.**
  - Equip {0} targets Anti-Venom. Gyatso's trigger goes on the stack above the equip and resolves first ("you may airbend").
  - Decline the command zone (CR 903.9a, "may"). The equip has no legal target and does nothing.
  - Cast Anti-Venom for {2} from exile: no tax, because CR 903.8 taxes only casts from the command zone. The cast resolves and returns Myr.
  - Altar gives {C}{C}; generic costs accept {C}. Myr deals 2. Equip only as a sorcery, so wait for the stack to empty.
  - **Net 0 per loop after the first {2}.** 13 loops at 25 life.
  - With Gandalf: Anti-Venom (legendary entering) and Myr (artifact leaving) both trigger twice → 4 damage per loop, plus a second target.
- **A′ — Swiftfoot + Éowyn: ✅** "Equip {1}" −1 = {0}.
- **A″ — Swiftfoot + Oltec, no Éowyn: ✅** pay 1 + 2, gain Myr 2 + Gnome 2 → +1 per loop.
- **E — Anti-Venom + Aang AM + Altar:**
  - Aang's ETB targets Anti-Venom (mandatory "another target creature") → exiled.
  - "Whenever one or more creatures you control leave the battlefield without dying" → 1 experience counter.
  - Sacrifice Aang (+2). Recast Anti-Venom (−2) → he returns Aang.
  - **Net 0. Infinite experience = infinite 1/1 Allies at the next upkeep.** With Liliana out: +2 life per loop. With Oltec: +2 mana per loop.
- **F — Anti-Venom + Appa SG + Altar:**
  - Appa's ETB airbends Anti-Venom. Recast him for {2} while Appa is out → "Whenever you cast a spell from exile" makes an Ally.
  - While Anti-Venom is on the stack, sacrifice Appa (+2) and the Ally (+2). Anti-Venom returns Appa.
  - **+2 mana per loop: infinite colourless mana**, or keep the Allies at net 0. Appa has flash, so the line also starts from a cast Appa.
- **G — Anti-Venom + Appa LSB + Altar:** ETB mode "Airbend another target nonland permanent you control" → Anti-Venom. Sacrifice Appa (+2), recast (−2) → **net 0, infinite ETBs.**
- **H — Gyatso + Altar + Teyo:**
  - Teyo's ETB targets Anti-Venom. Gyatso airbends him; Teyo's ability does nothing.
  - Sacrifice Teyo (+2), recast (−2) → **net 0.**
- **I — Battlesphere** (error 3): **+6 per loop.** No commander needed.
- **Kill with E–H:** Panharmonicon or Gandalf → Anti-Venom's ETB triggers twice → return the loop piece **and** Perilous Myr. Sacrifice both (+4), recast (−2) → **+2 mana and 2 damage per loop.**
- **Limits:** creature casts are sorcery-speed unless Gandalf ("legendary spells and artifact spells as though they had flash"). Equip only as a sorcery. Teleportation Circle's end-step airbend means the recast waits for the next main phase. No piece needs to untap or be held since the turn began, except Liliana's {T} and Battlesphere's attack (haste from Greaves or Krang).

## Dead-card check (only cards with a question)
| Card | How often live | Verdict |
|---|---|---|
| Mesmeric Orb | From T2: mills about 2–5 a turn on both sides | ❌ weakest card; the swap above |
| Krang (9 to cast) | Never cast. Live once binned (4 repeatable outlets: Map, Volume, Terminal, Liliana; 3 one-shots: Mountain-king I, Echoverse ETB, Restoration II) or via Tune Up. Seriema / Seek fetch it. A 9/9 that gives the artifact bodies haste (Myr tokens, Gnomes, Ornithopter) | ✅ keep |
| The One Ring | Live from T4 cast. Protection on the cast turn; the only repeatable draw besides The Arkenstone | ✅ keep; cap burden (error 14) |
| The Arkenstone | T3 Seek the Heart (Gyatso / Aang / Appa / Gandalf, or Krang to discard); later anthem + end-step draw | ✅ keep |
| Tune Up | Targets: Krang, Battlesphere, Meteor Golem, Myr, Greaves, Altar, Panharmonicon | ✅ keep; the Altar recovery |
| Sunstar Expansionist | Mostly on the draw from T3 (error 11). Removing it costs AV ≤T4 on the draw .47 → .42 | ⚠️ keep (operator's catch-up ask) |
| Eldrazi Ravager | {5}{C}: never cast; cycles itself into the yard | ✅ keep (weakest target, Breaker near-tie) |

## Convergence — the 8 operator cards (vs the weakest kept card of their role; goldfish = `%TEMP%/av_tools.py`)
| Card | Tested against | Result |
|---|---|---|
| Mox Amber | Coldsteel Heart | AV ≤T4 .31/.44 vs .34/.47 (play/draw) → ✅ stays out |
| Mox Opal | Coldsteel Heart / Network Terminal | .30/.43 and .31/.43 vs .34/.47 → ✅ stays out |
| Day of Judgment | Divine Reckoning | Symmetric; kills Gyatso and Oltec; sends Anti-Venom to the command zone. Reckoning keeps one creature → ✅ stays out |
| Urza's Ruinous Blast | — | "Exile all nonland permanents that aren't legendary" hits Altar, Greaves, Myr, Battlesphere, Panharmonicon → ✅ stays out |
| Helping Hand | Phoenix Down | Phoenix Down reaches Gyatso (MV 4, "mana value 4 or less") at instant speed → ✅ stays out |
| Lavaspur Boots | Teyo (weakest targeter) | Repeatable "Equip {1}", {0} with Éowyn. Teyo is a loop piece and a Gyatso shield → ⚠️ near-tie, Teyo stays |
| Cloudshift | Ephemerate | Equal under Gyatso (both fizzle). Off Gyatso, rebound wins → ✅ stays out |
| Sheltered by Ghosts | Aang's Iceberg | "until this Aura leaves", and every airbend of the enchanted creature returns their card (LEARNINGS 10-02) → ✅ stays out |

**Further candidates tested here:** Panharmonicon ❌→IN. Roaming Throne, Flickering Hound, Patriot and Mirage Mirror ({2}: target creature — 4 mana per reanimation, behind Swiftfoot) are near-ties or lose. Inventors' Fair would tutor Altar, but it is a colourless land, which the builder's land rule rejects; consistent.

## Mana and goldfish
- **W sources:** all 37 land slots make W for Anti-Venom (Cavern named Hero), plus 8 W/any-colour rocks. The only non-W sources are Cavern on non-Hero spells and Altar → ✅ for {W}{W}{W}{W}{W}.
- **Goldfish reproduced** (20k games, `sim final.txt`): AV ≤T4 .34/.47 · ≤T5 .75/.85 · fatty ≤T6 .45/.51. The report says .34/.46 · .75/.85 · .44/.51 → ✅ plausible.
- **Model biases:**
  - The first Brawl mulligan is modelled as London to 6, not free → understates.
  - Orb mills every land and rock, not only tapped ones → overstates.
  - Volume and Terminal give mana and loot in the same turn → overstates.

## Open
- ❓ **Competitive Brawl legality.** `getLegalityKey` maps competitivebrawl to brawl (Historic), so `pool.txt` and the gate never check Competitive Brawl's own ban list. Confirm Panharmonicon, The One Ring, Ashnod's Altar and Cavern of Souls in Arena's deck builder before importing.
- ⚠️ **Operator's calls:**
  - Orb vs Ascension as the Panharmonicon cut.
  - 35 lands vs the 0.80 flag.
  - Lavaspur / Patriot vs Teyo.
