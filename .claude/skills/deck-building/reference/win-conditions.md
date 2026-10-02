# Win conditions: taxonomy, counts, speed, closing checklist (researched 2026-10-02)

**[calc]** = my own arithmetic, with the working shown. **[Sx]** ids resolve in `sources.md`.

---

## 1. Taxonomy

Life maths used in the table **[calc]**:
- 4-pod: three opponents × 40 = **120 life** to remove.
- Brawl: **25 life** (CR 103.4d) [S1].

| Type | How it kills a 4-pod | Brawl 1v1 note | Typical pieces | Beaten by | Needs |
|---|---|---|---|---|---|
| Combat, go-wide | Overrun on a wide board; hits all three at once | strong at 25 life | Craterhoof, Overrun, anthems, token makers | wipes, fogs, Propaganda | protection on the alpha turn; a backup if wiped [S29] |
| Combat, go-tall / voltron | Kills one opponent per turn cycle; 21 commander damage = 52.5 % of 40 life **[calc 21/40]** | **no commander damage** [S3]; needs a full 25 | auras, equipment, evasion, hexproof | edicts, chump blockers, bounce | 5+ protection pieces; reach to finish the last 2 players |
| Drain / aristocrats | Each trigger hits *each* opponent, so it scales with pod size | one opponent: drain is "only" burn | sac outlet + death payoff + fodder (e.g. Blood Artist) | graveyard exile, Rest in Peace effects, wipes that exile | outlet redundancy |
| X-spell drain / burn | One spell, all opponents | fine | Torment of Hailfire, Exsanguinate | counterspells | 10+ mana actually reachable [S24] |
| Combo (deterministic loop) | Wins on the spot | same | two-card or three-card loops | stack interaction, Silence effects, graveyard hate | tutors + protection; bracket disclosure (B3 rules: principles.md §2.3) |
| Alternate win | "You win the game" | same | Thassa's Oracle (GC), Approach of the Second Sun | counters; the specific condition | protect the fragile ones [S24]; only build-around alt-wins in a deck built for them [S24] |
| Mill | Must empty three libraries, ~85 cards each at turn 7 ≈ 255 cards **[calc: 99 − 7 − 7]** | one library ≈ 85 cards: three times easier than a pod | Maddening Cacophony, Traumatize [S26] | graveyard recursion, shuffles, Eldrazi titans | a finisher once libraries are low (Rise of the Dark Realms-type [S26]) |
| Poison / infect | 30 counters in total vs 120 life, so each infect point ≈ 4 life **[calc: 40/10]** | 10 vs 25 life, so each point ≈ 2.5 life **[calc]** | infect creatures, proliferate | creature removal; table focus (it is obvious) | evasion + pump |
| Lock / value inevitability | Stax or engines grind the table out | weaker: fewer opponents to share the lock's cost | Smothering Tithe-type engines, Propaganda, stax | wipes, enchantment removal | **a real finisher**: "if you lock the table and can't win, that's a hostage situation" [S27] |
| Superfriends ultimates | Ultimates or loyalty-scaled damage; many walkers making blockers | strong: one opponent attacks walkers | Doubling Season, Deepglow Skate, The Chain Veil, proliferate [S13][S59] | combat on walkers, Pithing Needle effects | defence first ("build the fort") [S13] |

Apply: label each list's **primary** and **backup** win type from this table. A backup must use a different resource:
- board vs life vs no-board;
- e.g. combat primary → drain, burn or alt-win backup [S25][S29].

---

## 2. How many closers

What the sources say:

| Source (date) | Recommendation |
|---|---|
| TurnZero (undated) [S25] | 2–3 real win conditions on different resources; a single plan gets solved by game 3 |
| Culture of Gaming (2026-01) [S27] | 2–4 for combat decks; 2–3 + backup for midrange; control needs "a real one"; combo 1–2 lines + 1 backup |
| MTGEDH (2026-02) [S28] | "Closing package": 2 finishers + 2 enablers + 2 protection/disruption |
| Mythras (2026-07) [S24] | 2–4 finishers; **count tutors as extra copies** |
| Cardsphere (2021-02) [S26] | 3–5 finishers |

My synthesis by bracket (judgement):

| Bracket | Closers (distinct cards) | Access (closers + tutors that find them) | Backup axis | Protection for the win turn |
|---|---|---|---|---|
| B1–2 | 3–5 | 4–6 | required | 2–3 |
| B3 | 2–4 | 5–8 | required | 3–4 |
| B4 | 1–2 lines + 1 backup | 8+ | yes | 4–6, cheap |
| B5 | compact combos | 10+ | yes | stack interaction + Silence-type |
| Brawl | 2–3 | 4–6 | yes (no commander damage) | 2–4 |

Why "access" matters **[calc]**: with 5 access cards, P(≥ 1 seen by turn 6) in a pod = 0.51. With 8 it is 0.69. One finisher with no tutors is 0.13.

Apply: count closers and access. Flag any of these:
- access below the bracket row;
- primary and backup on the same axis;
- a closer whose mana value the deck cannot reach by turn 7–8 (an X-drain needs 10+ mana [S24]).

---

## 3. Protecting the win turn

| Tool | What it does | Source |
|---|---|---|
| Silence, Orim's Chant | Opponents can't cast spells this turn: shields the whole win | EDHREC cEDH interaction guide (2026-01) [S33] |
| Veil of Summer | Your spells can't be countered this turn | [S33] |
| Grand Abolisher-type | No opponent spells or abilities on your turn; pair with Teferi's Protection to survive the turn cycle | PlayEDH 2024 [S36] |
| Defensive counters (Flusterstorm, Pyroblast) | Win counter-wars on your own win | [S33] |
| Teferi's Protection (Game Changer), Heroic Intervention | Survive wipes and removal on the crack-back | [S36][S49] |
| Sandbagging | Hold interaction so one spell denies ≥ 3 opposing resources; let others act first | learncedh [S34] |
| Hide the plan | Don't telegraph combo pieces two turns early; sequence so the danger is invisible until too late | TurnZero [S55] |
| Hold combat finishers | Cast when you can win on the spot, not the turn before a wrath | [S24] |

Pre-win-turn checks (my method, built on the sources above):
1. **Count disruption.** Total opponents' untapped mana and cards in hand. Add known free interaction: Force of Will and Fierce Guardianship are Game Changers.
2. **Cover the likeliest answer.** Lead with the protection piece (Silence, Abolisher, Veil) or a bait spell, then the real threat.
3. **Kill everyone.** In a pod, can the line kill all remaining players this turn cycle? If not, who kills you on the crack-back?
4. **Wait if the odds improve.** If P(win resolves) is low and nobody else wins next cycle, wait a turn. Sandbagging is often correct [S34].

Apply: a list passes "protects its win" when its protection count meets §2's bracket row *and* it has at least one effect that shields the win from both stack interaction and a wipe on the crack-back.

---

## 4. Speed benchmarks

| Context | Benchmark | Source |
|---|---|---|
| Bracket 1 | expect ≥ 9 turns before anyone wins or loses | Wizards 2025-10-21 [S10] |
| Bracket 2 | ≥ 8 turns | [S10] |
| Bracket 3 | ≥ 6 turns (an average: aggro may knock out one player earlier) | [S10][S15] |
| Bracket 4 | ≥ 4 turns | [S10] |
| Bracket 5 | "any turn" | [S10] |
| cEDH (community) | average game ≈ 4 turns, highly interactive | EDH Wiki (undated) [S31] |
| Casual tracked games | median 9 rounds, ~58 min; 521,747 games (computed 2026-08-24) | playgroup.gg [S30] |
| Game Knights sample (2022) | first player lost by turn 8–9 | Karsten [S8] |
| Brawl (Arena) | no game-length dataset found; "unless your deck can reliably win on turn 4, which it probably can't" (2023) | [S3] |
| Brawl ramp example | Etali decks "consistently" cast Etali on turn 5, even turn 4 | [S4] |

Game-length distribution, 4-player single-winner games [S30]. Shares are mine **[calc]**: bucket ÷ 254,615, the sum of the four buckets.

| Rounds | Games | Share |
|---|---|---|
| ≤ 6 | 38,961 | 15.3 % |
| 7–9 | 111,949 | 44.0 % |
| 10–13 | 87,911 | 34.5 % |
| ≥ 14 | 15,794 | 6.2 % |

Seat advantage, wins by seat:

| Data | Seat 1 | Seat 4 | Fair share | Source |
|---|---|---|---|---|
| Casual pods | 29.2 % | 21.5 % | 25 % | [S30] |
| cEDH Swiss, 648 pods (2023) | 31.5 % | 20.2 % | 25 % | TopDeck [S32] |

Apply: goldfish the list (or estimate the turn by which access ≥ 1 closer is likely and castable).
- **Too fast for the bracket:** if the typical kill turn is ≥ 2 turns faster than the bracket minimum, flag it.
- **Too slow:** if it is slower than turn 9 in B3–4, flag "too slow to close".

---

## 5. Does this list actually close games? (checklist)

Run in order; each line is a pass/fail the orchestrator can check from the decklist.

| # | Check | Pass when |
|---|---|---|
| 1 | Named primary win | one sentence names the type from §1 and its 2–3 key cards |
| 2 | Backup on a different axis | ≥ 1 closer that wins through a wiped board or a removed commander [S25][S29] |
| 3 | Access | closers + tutors ≥ the §2 bracket row; P(≥ 1 by turn 6) ≥ 0.5 **[calc]** |
| 4 | Converts advantage | the deck has a card whose job is ending the game, not "a board of 3/3s" [S29] |
| 5 | Reach in a pod | the line kills all opponents, or the deck can win the 1-v-2 after the first kill (drain, X-spell, evasion) |
| 6 | Reachable mana | each closer's MV (or the X needed) ≤ the mana the deck reliably has by turn 7–8 (principles.md §6) |
| 7 | Protection | win-turn protection count ≥ the §2 row; at least one wipe-proofing or Silence-type effect |
| 8 | Brawl-specific | no reliance on commander damage; ≥ 2 closers that work at 25 life vs one opponent |
| 9 | Bracket honesty | combo speed and Game Changers match the declared bracket ([S10]; principles.md §2.3) |
| 10 | Not win-more | closers do something when behind (block, remove, draw); stays under ~5 pure finishers [S24][S25] |

Apply: a list that fails #1–#4 "does not close". If it fails #5–#7, it "closes slowly or fragilely". Report the failing rows with the cards that would fix them.
