# Tazri, Beacon of Unity — refute (2026-10-09)

**Verdict: PASS (8/8 swaps).** The model is blind to all eight (Deck Score 77.5 flat in every line), so judgment decides. Each swap moves a non-party body or a redundant draw piece out for a party creature; that is what Tazri's dig needs.

## 1. Swap lab (my own run, 300 games, deterministic seed)
The `swaps.txt` named in the brief is a **stale draft**. Its pairings differ from the review JSON (for example Return => Squad Commander, Channeler => Paragon), it still has the rejected Gearhulk => Samut, and it has no Toski line. Neither file runs on the sleeved base: all 8 "out" cards exist only in `verify-2026-10-09/tazri/tazri-final.txt`. So I ran `swaps-final.txt` on tazri-final, the reviewer's stated base.

| # | Out => In | Reviewer Δ | My Δ | Match |
|---|---|---|---|---|
| 1 | Toski => Squad Commander | −2.01 | −2.01 (pen 1: draw 10→9) | ✅ |
| 2 | Return of the Wildspeaker => Harper Recruiter | +0.01 | +0.01 | ✅ |
| 3 | Varis => Tajuru Paragon | +0.02 | +0.02 | ✅ |
| 4 | Acererak => Linvala, Shield of Sea Gate | −0.01 | −0.01 | ✅ |
| 5 | Caves of Chaos Adv. => Undermountain Adv. | +0.08 | +0.08 | ✅ |
| 6 | Triumphant Adv. => Nimble Trapfinder | +0.02 | +0.02 | ✅ |
| 7 | Bident of Thassa => Mindblade Render | −0.01 | −0.01 | ✅ |
| 8 | Channeler Initiate => Samut | −0.12 | −0.12 (curve 96→94) | ✅ |
| ALL | | −0.02 | **−0.01** (88.94 → 88.92, DS 77.5) | ✅ |

- BASE has pen 0 with ramp 11 / draw 10 / removal 11 / wipes 3 / protection 6. ALL keeps pen 0 with ramp 11, draw 11, removal 10. All windows hold.
- Swap 1's −2.01 is the draw-window penalty on its own. In the set, Trapfinder and Render lift draw to 11, so **swap 1 depends on swaps 6 and 7**. Do not apply it alone.
- No swap reaches the 0.25 bar, so none is an upgrade on the score. All are judgment calls, as the reviewer said.

## 2. Oracle and rules checks (q.py)
- ✅ Every swap quote matches oracle: Squad Commander, Harper Recruiter, Tajuru Paragon, Linvala, Undermountain, Trapfinder, Render, Samut, Acererak's bounce, Return's "non-Human", Bident = Recon Mission's first ability, Varis = Ranger, Caves = Barbarian, Triumphant = Knight, Channeler = Druid.
- ✅ Tazri is {4}{W} and "costs {1} less … for each creature in your party". Party 2 → {2}{W}, party 3 → {1}{W}. Guide errors 1 and 2 are confirmed. Wayfarer is a "Human Nomad Cleric" and Torens a "Human Cleric".
- ✅ Mirror Entity sets "base power and toughness X/X", so each creature deals X. Guide error 3 is confirmed.
- ⚠️ Guide error 4: the Coveted Prize free cast of Najeela (MV 3) works **only with a full party** ("If you have a full party, you may cast…"). It is correct with that condition.
- ✅ Destined Warrior (+3/+0 full party), Karlach (once, "if it's the first combat phase"), Najeela WUBRG, Hama Pashar, Nadaar (others +1/+1 after a completed dungeon) and the combat triggers repeating each combat all match oracle.
- ✅ Najeela + Springleaf Parade: Parade tokens "{T}: Add one mana of any color", and Najeela untaps attackers and gives them haste. The line is valid, but Parade is not in the list (the reviewer flagged this).
- ⚠️ Not raised by the reviewer: Tazri's dig also takes **Ally** cards ("Cleric, Rogue, Warrior, Wizard, and/or Ally"). The 23→30 hit count leaves Allies out. This does not change any verdict.

## 3. Ownership, singleton, identity
- ✅ All 8 "in" cards are in `collection.txt`. Six are in Tazri's own sleeved file, and Mindblade Render and Samut are loose. None is sleeved in another deck.
- ✅ Toski and Return go back to Cabbage, so the Cabbage raids drop to 0.
- ✅ `tazri-proposed.txt` is exactly tazri-final plus these 8 swaps: 100 cards, no duplicates. Samut's identity is G/R/W, inside WUBRG.
- ✅ 26 Mountains are owned and all 26 sit in deck files (8+15+2+1), so the reviewer's backfill note is correct.
- ✅ Locks: none of the 8 "out" cards is named in the pilot guide (they were tazri-final additions). No lock is cut.

## 4. Merits
| # | Verdict | Reason |
|---|---|---|
| 1 | PASS | Toski is a Squirrel. Squad makes party-count Warrior tokens (Najeela, Terror, Panharmonicon) plus full-party indestructible. Valid only together with 6/7 (draw window). |
| 2 | PASS | Return scales on non-Humans. Harper is a flying Warrior that digs party cards every attack. |
| 3 | PASS | Varis (Ranger) is a dead dig hit. Paragon fills any party slot for 2 mana. |
| 4 | PASS | Acererak bounces itself until Tomb is complete, so it never holds a party slot. Linvala holds one, adds a lock, and gives a sac-for-protection mode. |
| 5 | PASS | Same initiative, but a Warrior with {G}{G} ramp instead of a non-party Barbarian. Ramp stays 11. |
| 6 | PASS | Knight → Rogue 2-drop. The full-party draw trigger suits the alpha plan. |
| 7 | PASS | Bident duplicates Recon Mission at UU. Render is a 2-mana Warrior with Warrior draw. Life loss is minor. |
| 8 | PASS | −0.12 is noise-level (curve). Haste plus double strike serves the alpha plan. Ramp stays 11 through Undermountain. |

## 5. Risks carried forward
- The score is flat, so these are judgment calls. The bigger issue is the base (tazri-final), not these swaps: it raids 11 cards from Tam (a top-priority deck), 5 from Inspirit and 2 from Gilanra. Back those slots before sleeving.
- The guide is stale against tazri-final. Rewrite it once a list is chosen.
