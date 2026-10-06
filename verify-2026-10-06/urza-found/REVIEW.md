# Urza pilot guide: rules review (Opus, fresh context, 2026-10-07)

**Verdict: the old guide had 12 errors. 1 is HIGH: Line A's 43 damage counted summoning-sick copies. All 12 are fixed in the rewritten guide (`.claude/skills/deck-building/reference/decks/urza-lord-high-artificer.md`, 116 lines, 70 chips, 10 flows).** The rebuilt lines are A = 40 unblockable to one opponent, B = 21 to every opponent per hit, and C = 10 to each opponent plus 30 unblockable (40 to one). Every card in final-3 now has a role. No list change is needed.

Sources:
- DB oracle text: `review/oracle.md`.
- CR 2026-09-25: `review/cr.txt`, from media.wizards.com.
- Scryfall rulings: `review/rulings.md`.
- Hypergeometric maths: `review/mull.py`.
- Chip/flow lint: `review/chips.py`. All 70 chip names match `cards.name`, every list card is named, and every flow step has ≤ 12 words.

## 1. Errors

| # | Old claim | What is true | Source | Sev |
|---|---|---|---|---|
| 1 | Line A: Helm copy + Ember Island copy made on the kill turn attack: "13/13 + 13/13 + a 17/17 … 43 unblockable" | Both copies entered this turn, so they can't attack; the old line dealt 13 + Urza 1 = 14. Rebuilt: Ember the turn before, Helm at an opponent's end step (its ability is instant speed), kill-turn Helm only adds N. N = 12 gives 12 + 12 + 16 = 40 | CR 302.6 | HIGH |
| 2 | Line A: "Ember Island Production on a Construct → 13 artifacts" | With Helm out, Ember's token is an artifact token, so a Map comes with it: +2, not +1 | Helm oracle; Helm ruling 2024-04-12 ("all kinds of artifact tokens") | MED |
| 3 | "Sun Quan cast the turn before (no haste)", plus the pilot rule | "Creatures you control have horsemanship" is static, so it applies the moment he enters; only Sun Quan himself can't attack. Cast him precombat on the kill turn: this saves a turn and gives sorcery-speed removal no window | Sun Quan oracle + ruling 2009-10-01; CR 702.31b | MED |
| 4 | Line C listed as a kill: "10 Thopters enter → 10 damage to each opponent" | 10 burn kills nobody at 40. The real kill: the 15 new artifacts (10 Thopters + 5 Maps) pay 6 Whirler activations, which makes 30 power unblockable; 30 + 10 = 40 to one opponent. The Fleshraker count of 10 itself is right: Whirler copies are blue (CR 707.2a), Thopters are colourless | Whirler ruling 2015-06-22 (sick artifacts may pay) | MED |
| 5 | Mulligan: "Keep 2–4 lands plus a 2–3 MV rock" + "Mulligan a hand with no rock and no 2-drop" | The two rules contradict, and rule 1 keeps only 38 % of 7s. New rule: 3–4 lands, or 2 lands + one of 10 rocks/reducers = 62 % keep | `review/mull.py` | MED |
| 6 | "12 % of 7-card hands hold 2+" cards of 6+ MV | 8 such cards in 99: 2+ in 9.8 % of hands, 3+ in 1.1 % | `review/mull.py` | LOW |
| 7 | "35 lands incl. 30 Islands + Sink into Stupor" | 35 = 30 Islands + 5 utility lands; Sink is a 36th source (MDFC) | final-3.txt, gate | LOW |
| 8 | Karn +1: "Planetarium 6/6, Thran Dynamo 4/4 as extra alpha attackers" | One target per +1, and it lasts "until your next turn", so only one is animated at a time. It attacks only if you have controlled it since the turn began | Karn oracle + ruling 2019-05-03 | LOW |
| 9 | "6 counters" | 7 counters: Bane's Contingency, Counterspell, Negate, Flare of Denial, Strix Serenade, Katara's Reversal, Villains' Lair. Sink also bounces a spell | final-3.txt | LOW |
| 10 | Urza copies "die to the legend rule after making their Construct" | The order is reversed: the legend rule (an SBA) removes them first, then the ETB triggers go on the stack and still resolve. The outcome is the same | CR 704.5j, 603.3 | LOW |
| 11 | Gardens "avoid" list misses "as enters" / "enters with" cards | Gardens "becomes" a copy and never enters, so a copy of Cloud Key has no chosen type and a copy of Noble's Purse has no coin counters | CR 614.1c, 603.6a | LOW |
| 12 | Omissions | The guide never mentioned 4 rules points; all are now added. (a) Urza's "{5}: … play that card without paying its mana cost" (X = 0 per ruling). (b) Exhaust means "Activate only once" (CR 702.177a). (c) The saga flips two turns after it is cast. (d) Attack before waterbending, because attackers are tapped and can't pay {20} | oracle; CR 702.177a, 701.67a | LOW |

**Verified correct (kept):**
- **Super State.** Base 9/9 in layer 7b plus the Construct's +N in 7c (CR 613.4b/c). It has haste, hits "each other opponent", and N = 11 makes 20.
- **Worldwalker Helm.** It adds one Map per creation event (CR 614.5).
- **Rite of Replication.** Kicked on Urza it gives N +10 (5 Constructs + 5 Maps); kicked on the Construct, N +6.
- **Legend rule.** Constructs from Urza copies still arrive.
- **Summoning-sick artifacts.** They can be tapped for Urza's and Whirler's costs (rulings).
- **Mycosynth Gardens.** It gets no ETB. MVs: Helm 3, Dynamo 4, Medallion 2.
- **Waterbend {20}.** Any artifact or creature, including sick ones, can pay (CR 701.67a).
- **Ghostly Flicker.** The guide's targets are legal, and tokens don't return.
- **Bident.** It draws on combat damage only.
- **Untap effects.** Traxos untaps on each historic spell; Unstoppable Plan and Katara's Reversal untap as the guide says.
- **Padeem.** Hexproof covers the Constructs, and the upkeep draw is conditional.
- **Soul + Fulcrum.** The wipe is one-sided and costs 10 mana.

## 2. Cards with no role

None. All 69 non-Island cards have a role line or appear in a line in the guide (lint: `never named = []`). The three cards with the fewest links are still live:
- **Soul-Guide Lantern** (MV 1): +1 N, {U} via Urza, graveyard hate, a cantrip.
- **Cloud Key**: an artifact cost reducer, +1 N.
- **River's Rebuke**: an operator lock; a one-sided bounce of a player's whole board, e.g. clearing flying blockers before Line B.

## 3. Possible list changes (recommendation only)

- **No change recommended.** Every kill line runs on cards in final-3. The 35-land base, River's Rebuke, Traxos and the Fulcrum are operator decisions and stay.
- **Known gaps (information only):**
  - No haste source except Super State, so Line A needs its copies made a turn early.
  - Sun Quan and Super State have no tutor: Scour for Scrap finds artifacts only. Urza's {5} and Planetarium are the only ways to dig.
  - The gate still shows the known `plan` FAIL, plus the land WARN (35 vs Karsten 39 ± 2).
