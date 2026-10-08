# Tam, the Possibility — sleeved-deck review (2026-10-09)

Base: `../tam-the-possibility.sleeved.txt` (= `decks/paper/decks/tam-the-possibility.txt`, 34 lands, 21 walkers, 7 Ways).
Verdict: **7 free swaps, model-neutral (−0.09, Deck Score flat 63.6), judgment upgrade.** The sleeved list still lacks the tutors and the cheap finisher from the 10-03 review (`tam-fallback-final.txt` was never sleeved), so the chosen primary line (Jace lock) has one copy of its key card and no way to find it.

## Scores
| List | Objective | Deck Score | Win comp | Penalty | Source |
|---|---|---|---|---|---|
| Sleeved | **43.17** | **63.6** | 55 | 16 (ramp 16, draw 20, wipes 7) | `score-sleeved.txt` (300 games) |
| Model climb (2 passes) | 71.91 | 64 | 55 | 2 | `climb/results-0.jsonl` |
| Sleeved + 7 swaps | 43.08 (−0.09) | 63.6 | 55 | 16 | `swap-lab.txt` (300 games) |

The climb's +28.7 is the role-window penalty (16 → 2) and +4 lands; Deck Score moved 63.6 → 64. Not quality.

## Model climb
| Out | In | Verdict |
|---|---|---|
| Way of the Pyromancer, Way of the Paradox | Conduit Pylons, Lazotep Quarry | ❌ Paradox is half the engine; Pyromancer empowers Jace 2 |
| Vraska, Betrayal's Sting, Jace, Memory Adept | Hidden Grotto, Baeloth Barrityl | ❌ poison closer and lock finisher; filler land + off-plan creature |
| Faeburrow Elder, Sylvan Library | Opal Palace, The Reaper, King No More | ❌ 5-colour ramp + draw out for a land and filler |
| Ob Nixilis, the Hate-Twisted | Body Double | ❌ pairs with Windfall / Jace MA −7 |
| **Fumigate, Settle the Wreckage, Chandra, Awakened Inferno** | Blossoming Bogbeast, Armored Skyhunter, Bismuth Mindrender | ✅ cuts taken, adds replaced (below) |
Operator lock: 34 lands, so the 4 land adds are rejected outright.

## Swaps (all FREE: in `collection.txt`, in no other `decks/paper/decks/*.txt`, not in the ban file)
| # | Out → In | Why (oracle, q.py) | Δ alone |
|---|---|---|---|
| 1 | Fumigate → **Windfall** | Same-turn finisher after JRS 0: "Each player discards their hand, then draws cards equal to the greatest number of cards a player discarded" — 1-card libraries draw ≥2 → lose (CR 704.5b). Fumigate "Destroy all creatures" kills Tam, Tender, Guide | +0.02 |
| 2 | Thrummingbird → **Loyal Tutor** | {W} instant: "Search your library for a planeswalker card … put that card on top" = JRS or Jace MA at end of turn. Thrummingbird needs combat damage | −0.02 |
| 3 | Ral Zarek → **Diabolic Tutor** | "Search your library for a card, put that card into your hand" — JRS, Windfall, Paradox or Mentor | −0.03 |
| 4 | Tezzeret, Master of the Bridge → **Way of the Cryomancer** | "empower Jace 5" (8th Way, 39 empower total) + walkers get "[−3]: … copy that spell" (copies Windfall/Algorithm; −3 also triggers Mind Sculptor). Legendary Enchantment → Pia fetches it. Tezzeret's X ≈ 7 artifacts at 6 mana | −2.01 (window) |
| 5 | Nissa, Steward of Elements → **Jace, Multiverse Architect** | A 3rd Jace: its loyalty counts "among Jaces you control"; "creatures they control can't attack Jaces you control" unless they pay {2}; "+1: Draw two cards" | −1.99 (window) |
| 6 | Chandra, Awakened Inferno → **Expansion Algorithm** | "Proliferate X times": +X on every Jace (lock), every walker, and poison after Vraska −9. Chandra AI's −3 kills our own dorks and Tam | +1.98 (window) |
| 7 | Settle the Wreckage → **Tomik, Orzhov Lawmage** | {1}{W}: "Planeswalkers you control have 'No more than one creature can attack this planeswalker each combat.'" Permanent answer to walkers being attacked down (10-03 REFUTE S1) vs a 4-mana one-shot | +1.98 (window) |
| ALL | | 100 cards, singleton, WUBRG identity ✅ | **−0.09**, DS flat |
The model is blind to tutors, empower, the lock and walker protection (DS 0.0 on every swap). The ±2 values are the role-window penalty only. **Judgment decides here.**

Rejected alternatives: cutting Sarkhan the Masterless / Ob Nixilis of the Black Oath / Kaito (−5.6 each: the win component counts their tokens as "Token/Food conversion (2 bodies)", 55 → 48); `swaps-v1.txt` / `swap-lab-v1.txt` (ALL −16.65). They are the weakest walkers on judgment (Sarkhan: "each planeswalker you control becomes a 4/4 red Dragon creature", so Tam's X = 0), but the model punishes them. They can go if the operator overrides the score rule.

## Plan + win lines (after swaps)
- **Primary: the Jace lock.** JRS "0: Exile all but the bottom card of each opponent's library. Activate only if there are twenty-five or more loyalty counters among Jaces you control." Counter sources: 8 Ways (39 empower), Avatar landfall "empower Jace 2", JRS +1, Mentor "put a loyalty counter on each planeswalker", Algorithm, Tam's proliferate. Jaces: JRS 5, MA 4, MuA 4 + the token. Finish the same turn: **Windfall** (3 mana, hold ≥ 2 cards) or Jace MA "−7: Any number of target players each draw twenty cards" (+ Ob Nixilis HT: "Whenever an opponent draws a card … 1 damage"). JRS access: 1 copy + Entrust the Spark + Diabolic Tutor + Loyal Tutor (4 ways, was 2).
- **Backup: walker drain.** Kaya IS "+2: Each opponent loses 3 life", Warlord "[−4]: … 2 damage to target player", Dellian −6 emblem. The Chain Veil + Teferi backup from 10-03 needs buys and stays out.
- Vraska −9 poison remains a third, opportunistic line (Algorithm/Tam proliferate finish it).

## Risks
- Walker count 21 → 18 (Ral, Tezzeret, Nissa, Chandra AI out, Jace MuA in): fewer Tam discounts and Mentor targets.
- Diabolic Tutor is {2}{B}{B} in a 5-colour base; Great Hall's mana cannot pay it (legendary only).
- Windfall is symmetric: only fire it after JRS 0, or when your hand is empty.
- Loyal Tutor and Expansion Algorithm were registered in commit 16ebd62 ("register Strixhaven precons + new cards"): confirm both are in hand before sleeving.
- Wipes 7 → 5 (Fumigate, Settle out). Toxic Deluge, Final Act, Elspeth −3, Chandra ToD and Ajani U remain.
- No refuter pass yet; the model cannot score any of the 7 adds.

## Pilot-guide errors (`reference/decks/tam-the-possibility.md`)
1. §5 Final Act: "it strips opponents' walkers, +1/+1 counters and poison". Oracle: "Each opponent loses all counters". That removes counters on the *players* (poison, energy, experience), not on their permanents. It also **wipes the poison Vraska −9 gives**, so never combine it with the poison line.
2. §5 Elspeth "−3 … is your one-sided wipe". Oracle: "Destroy all creatures with power 4 or greater". It also kills our Wildspeaker 4/4 Beasts, Kiora 8/8 Leviathans and Sarkhan's Dragons.
3. §1 ranks "walker burn grind" #1 and the Jace lock #2, and lists six lines. The 10-03 review set **one primary (Jace lock)** plus one backup, and the guide was not updated.
4. §2 #2: "With Ajani U + Liliana F, each activation is 2 Mentor triggers". That holds only with Way of the Paradox also out (Cadet → Liliana = 1 gain; Paradox = the 2nd).
5. §5 lists The Prismatic Bridge under "Tutors". It reveals the first creature or planeswalker card. It does not search, so it is not a tutor.
6. After the swaps, the guide's references to Fumigate, Settle, Ral (rank-6 extra turns), Tezzeret and Chandra AI (rank-1 burn) and Thrummingbird (proliferate list) go stale.
