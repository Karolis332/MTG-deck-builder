# REFUTE: Tam + Tazri precon pass (2026-10-02)

**Verdict.** All 27 swaps hold: 8 for Tam, 19 for Tazri. Neither deck is a fixed point yet:
- **Tam** is missing 1 swap, which uses a new card: Uro.
- **Tazri** is missing 2 swaps. One is a precon Wizard (Zimone, Quandrix Prodigy), because the stop proof left the precon Wizards unscored. The other uses a new card: Ingris Stingerquill. Allocation is clean: 0 cards are over-allocated across Tam, Tazri, Meren, Imotekh, Cabbage, Ramos and both precons.
Sources: oracle text from `precon-oracle.md` and the live card DB (`q.py`). Ownership comes from `collection.txt`, `open-cards.txt`, `decks/*.txt` and both `*_SOC.txt` lists.

## 1. Tam swaps (8)

| # | IN | OUT | Verdict | Reason (oracle) |
|---|---|---|---|---|
| 1 | Nexus Mentality | Entrust the Spark | ✅ KEEP | Tam is a creature commander, so "If you control a commander … choose both" holds while Tam is on the battlefield. Instant speed: "Move all counters …" onto a walker gives an ultimate now, and "Remove all counters … Draw a card for each" cashes in a Jace token. Entrust is a sorcery that needs a walker to "sacrifice". Close call. |
| 2 | Caves of Koilos | Meticulous Commons | ✅ KEEP | Caves is an untapped W/B source. Commons "enters tapped unless you control a planeswalker" (sim: 0.06 untapped on T3). |
| 3 | Path of Ancestry | Nomad Outpost | ✅ KEEP | Both always enter tapped. Path makes any of WUBRG, Outpost only R/W/B. The open copy works as well as a precon copy. |
| 4 | Anguished Unmaking | Vraska's Final Mercy | ✅ KEEP | Instant "Exile target nonland permanent" (Paradox refunds the 3 life) beats a {B}{B} sorcery limited to creatures and walkers. The "Empower Jace 6" mode is surplus. |
| 5 | Sylvan Library | The Wanderer | ✅ KEEP | The Wanderer was Tam's weakest kept card at the 09-30 fixed point: no walker type and no plus ability. Library adds "draw two additional cards" each turn from T2, paid with the life Paradox and Mentor generate. Cost: the Wanderer's "Prevent all noncombat damage" no longer blanks Tam's 4 painlands and 3 Talismans. Donor side in §6. |
| 6 | Yavimaya Coast | Transformative Commons | ✅ KEEP | Untapped G/U from T1, against a walker-gated tapped land. |
| 7 | Llanowar Wastes | Formidable Commons | ✅ KEEP | Same logic as #6, for B/G. |
| 8 | Turbulent Moor | Isolated Chapel | ✅ KEEP | Before the swap Chapel's only enabler was the one Plains. Moor is typed Plains Swamp, so it also turns on Clifftop Retreat, Woodland Cemetery and Bleachbone Verge's {W}. |

## 2. Tazri swaps (19)

| # | IN | OUT | Verdict | Reason (oracle) |
|---|---|---|---|---|
| 1 | Blade Historian | Concerted Defense | ✅ | Human Cleric: "Attacking creatures you control have double strike". |
| 2 | Springleaf Parade | Bar the Gate | ✅ | Tokens with "{T}: Add one mana of any color" plus Najeela's untap and haste make infinite combats. |
| 3 | Generous Gift | Solemn Doomguide | ✅ | Instant answer to any permanent. Doomguide is a 5-MV Cleric. |
| 4 | Infernal Grasp | Acererak | ✅ | Acererak is a Zombie Wizard but never stays: "return Acererak to its owner's hand". |
| 5 | Grand Abolisher | Multiclass Baldric | ✅ | Cleric that protects the alpha turn. |
| 6 | Land Tax | Yuan-Ti Malison | ✅ | 10 basics. Kodama's Reach and Explore the Underdark compete for the same basics, so 7.0 is generous, but it still beats a 2/1 Rogue. |
| 7 | Twilight Prophet | You Find a Cursed Idol | ✅ | Vampire Cleric with ascend draw. Chomping Changeling (#15) takes over the Idol's job. |
| 8 | The Destined Thief | Thwart the Grave | ✅ | Thwart has no self-mill to work with. |
| 9 | Putrefy | Shadowheart | ✅ | Loses a Cleric. The removal is worth it. |
| 10 | Kamiz | Safana | ✅ | Rogue for Rogue. "It connives" on every attack. |
| 11 | Mangara | Hama Pashar | ✅ | Correction: Hama is a Human **Wizard**, and "Room abilities … trigger an additional time" is real text. It still loses: the pass removes 7 venture/initiative cards. |
| 12 | Keen Duelist | Feywild Caretaker | ✅ (marginal) | The draw is symmetric: "each put the card you revealed into your hand" also feeds the targeted opponent. It wins on curve, Wizard for Wizard (Caretaker is an Orc Wizard). |
| 13 | Weathered Wayfarer | Varis | ✅ | Varis is an Elf Ranger, not a party type. |
| 14 | Ingenious Prodigy | Sefris | ✅ | Wizard for Wizard (Sefris is a Human Wizard). |
| 15 | Chomping Changeling | Triumphant Adventurer | ✅ | Triumphant is a Human Knight, not a party type. |
| 16 | Realmwalker | Archpriest of Iona | ✅ | Holds, but it is now the weakest kept card (5.0). See §5. |
| 17 | Torens | Nadaar | ✅ | Nadaar is a Dragon Knight, not a party type. |
| L1 | Eclipsed Steppe | Bojuka Bog | ✅ | Typed Plains Swamp, so the fetches can find it. Untapped with ≥ 2 basics. |
| L2 | Sodden Verdure | Ash Barrens | ✅ | Typed Forest Island and adds U, the tight colour. |

Nothing to reject. The 12 unapplied 09-28 swaps were re-judged correctly: Samut and Rescue Girl are not owned, Syphon Mind sits at 5.0, Growth Spiral stays dropped.

## 3. Allocation (one physical copy per card)

Script check: supply = `collection.txt` + Q + S. Demand = the Tam, Tazri and Meren proposals plus Imotekh, Cabbage and Ramos as registered. **0 over-allocated, 0 missing.**
- **Tam INs:** Nexus Mentality, Yavimaya Coast [Q]; Turbulent Moor, Anguished Unmaking, Caves of Koilos [S] (the collection's only Caves is in Tazri); Path of Ancestry (5 copies, 3 in use); Sylvan Library and Llanowar Wastes (from Meren). The five 09-30 walker swaps (Ral, Tezzeret, Chandra AI, Nissa, Kiora) are each open ×1.
- **Tazri INs:** 13 open-pool cards at 1 copy each. Infernal Grasp has 2 copies, one sleeved in Meren. Land Tax, Mangara, Keen Duelist, Eclipsed Steppe [S]; Ingenious Prodigy, Sodden Verdure [Q].
- **Meren INs:** Greed and Haunted Mire, both open ×1.
- **Names shared between decks are separate copies:** Sol Ring and Arcane Signet (4 + 2 each), Command Tower and Exotic Orchard (3 + 2 each), Farseek, Assassin's Trophy, Toxic Deluge, Woodland Cemetery and Infernal Grasp (2 each).
- **No precon card is used by both decks.** Precon cards still free: everything else in Q and S, including the second Isolated Chapel, Fellwar Stone, Bojuka Bog and Fabled Passage.

## 4. Contested rulings

- **Tomik, Wielder of Law (2/4 flying vigilance, affinity for planeswalkers): REJECT for Tam. The outcome is right, the reason was wrong.** It is not protection, so the Vigorbloom Charm comparison does not apply. It is a conditional draw body. Its trigger needs "two or more of those creatures … attacking you and/or planeswalkers you control", and the 3-life tax deters exactly those attacks, so it rarely draws. It loses to Tam's weakest kept cards: Evolution Sage ("Landfall — … proliferate" puts +1 loyalty on every walker every turn), Settle the Wreckage (it actually stops the attack) and Quintorius (a walker with a plus ability and a new type). Tomik is a Human Advisor, so it has no party value for Tazri. It stays out. (Tomik, Orzhov Lawmage is a different card, already cut 09-28.)
- **Mangara: stays in Tazri.** In Tam, "Lifelink" plus "Whenever an opponent casts their second spell each turn, draw a card" roughly ties Evolution Sage. That is not a clear gain. For Tazri it is a Human Cleric that its dig and its cost reduction both count, worth 5.5 against Rankle at 5.0.
- **Expansion Algorithm: REJECT for both.** "Proliferate X times" for {X}{U}{U} repeats what Tam's own "{W}{U}{B}{R}{G}, {T}: Proliferate X times" does every turn. At 5+ mana it is a one-shot copy of an ability Tam already has. Tazri has no counters plan.
- **Sylvan Library: stays in Tam.** Tazri scores it 6.0 against Realmwalker at 5.0, but the operator named this exact move for Tam. Tam's draw also depends on walkers surviving, while Tazri gets 9 new draw sources this pass.
- **Uro (new): goes to Tam** (§5). In Tazri it is an Elder Giant, not a party type.

## 5. Missed improving swaps (ranked)

| # | IN | OUT | Deck | Reason (oracle) |
|---|---|---|---|---|
| 1 | Uro, Titan of Nature's Wrath (open) | Farseek | Tam | "Whenever Uro enters or attacks, you gain 3 life and draw a card, then you may put a land card from your hand onto the battlefield." The lifegain is a Mentor and Ajani Resolute trigger, the land enters untapped and triggers Evolution Sage, and Escape repeats it later. Farseek ("… onto the battlefield tapped") was the weakest kept card named at the 09-30 fixed point. Tam keeps 7 two-mana accelerants. |
| 2 | Ingris Stingerquill (new) | Keen Duelist | Tazri | "Whenever a creature you control attacks, that creature deals 1 damage to each opponent." In a go-wide deck with Najeela and Karlach extra combats, 5 attackers deal 5 to every opponent per combat. "{4}: Create a 2/2 … Wizard Soldier … Cadet. Then creatures you control gain haste" is a mana sink that makes party Wizards. About 6.5, level with Twilight Prophet. Keen Duelist is the weakest of the 5.5 band: its draw is symmetric ("You each put the card you revealed into your hand"), and Zimone (#3) takes over the cheap-Wizard role. Keen Duelist goes back to precon S. |
| 3 | Zimone, Quandrix Prodigy [Q] | Realmwalker | Tazri | A 2-MV Human **Wizard**, and Wizards drop 7 → 5 this pass. "{1}, {T}: … put a land card from your hand onto the battlefield" turns Land Tax's three basics into ramp. "{4}, {T}: Draw a card. If you control eight or more lands, draw two cards instead." By the builder's own scale this is ≥ Keen Duelist (5.5), above Realmwalker (5.0, which overlaps Vizier's "cast creature spells from the top"). |

Tazri's stop proof was wrong about the precons. It says the unlisted precon cards are "X-spell, Aura or counters text with no party type (≤ 3.5)", but these unlisted cards are Wizards: Zimone ×3, Quandrix Apprentice, Nev, Owlin Spiralmancer, Deekah, Kor Spiritdancer. After #3, the best of those is Zimone, All-Questioning at 5.0 ("create Primo … that many +1/+1 counters"), and it does not beat the 5.5 band.
Precon scan for Tam (3 weakest kept per role, all 171 cards), with no win:
- Ramp: Fellwar Stone ≈ Talisman of Conviction. Nature's Lore and Three Visits have only 2 Forest-typed targets, against Farseek's 7 Plains/Island/Swamp/Mountain-typed lands.
- Removal: Vanishing Verse ≈ Erode.
- Wipes: Promise of Loyalty ≈ Settle (sorcery, kills Tam's own dorks).
- Protection: Nils, Ghostly Prison and Guardian Augmenter all lose to Archangel, the counters and Vigorbloom.
- Lands: Turbulent Wilderness costs B or W sources, and Hinterland Harbor / Vineglimmer Snarl have only 4 enablers.

**Ties left to the operator (not counted):**
- Konstrari Annex vs Rootbound Crag, and Formidable Commons vs Woodland Cemetery. Sim: a checkland with 3 enablers is untapped 0.19 / 0.22 / 0.25 on T2–T4, against 0.00 / 0.06 / 0.28 for a walker-gated land, which is ahead from T5 (0.51 vs 0.28).
- The Echoverse Fulcrum vs Settle; Vernal Fen as Tazri's 35th land.

## 6. Donor integrity: Meren (−Sylvan Library, −Llanowar Wastes; +Greed, +Haunted Mire)

⚠️ **Fair, but weaker than it needs to be.**
- **Draw:** Library is 1 of Meren's 12 draw sources (09-28 fable review: Dispute, Rites, Haruspex, Reaper, Opportunist, Moldervine, Liliana DG …), so the loss is small. But the 09-28 Meren audit rejected Greed ({3}{B}, against Library's {1}{G}) as "weaker or narrower than … the death-trigger draw suite".
- **Lands:** Haunted Mire "enters tapped" where the Wastes entered untapped, so Meren goes from 5 to 6 always-tapped lands (plus the Repast MDFC) out of 35. Colour counts are unchanged, and the typed Swamp Forest adds an enabler for Woodland Cemetery and Necroblossom Snarl. With 17 basics, acceptable.
- **Better backfill:** the unused precon Animate Dead [S] instead of Greed, since it fits Meren's recursion plan. That call belongs to the Meren agent.
- Meren's 101 cards are a pre-existing problem.

## New cards

| Card | Tam | Tazri |
|---|---|---|
| Uro, Titan of Nature's Wrath | **IN for Farseek** (§5 #1) | Not party; Tam gains more |
| Loyal Tutor | No slot. It is −1 card ("put that card on top") in a deck with 21 walkers | No slot: no walkers |
| The Echoverse Fulcrum (×2) | No slot: ties Settle. The Fulcrum's wipe is "Activate only as a sorcery" for {5} more; Settle is an instant that exiles. Second copy: low | No slot: "Destroy all creatures" kills its own 43-creature board. Second copy: low |
| Konstrari Annex | No slot: ties Rootbound Crag (sim in §5) | No slot: no walkers, so always tapped |
| Vernal Fen | No slot: 4 basics, so almost always tapped | No slot: the best 35th land (typed, so Heath, Foothills, Mire, Farseek and Nature's Lore all find it; adds B, the tightest colour) but ties the 5.0 margin |
| Consign to Memory | No slot: "triggered ability or colorless spell" is too narrow next to Counterspell and Veto | No slot |
| Hexhaven Invigorator | No slot: {G}{G}{G}{G} in five colours | No slot: Chimera Horror, not party |
| Liliana the Repentant | Low: "mill two cards" on every walker that enters mills the Ways; exhaust works once | Low: Human Warlock, not party |
| **Batch 2:** Ingris Stingerquill | No slot: Ajani Unrelenting already makes Cadets, and RR is costly | **IN for Keen Duelist** (§5 #2) |
| Solarium Sentry | No slot. Each "you gain 2 life" only feeds walkers through Way of the Mentor (a 1-of) or Ajani Resolute. P(Mentor or Pia seen by T6) ≈ 0.25, against Evolution Sage's unconditional "proliferate" on every land | No slot: Cat Soldier, not party |
| Variable Chaser // Arc of Fortune | No slot: Tam's hand stays full of walkers, so the wheel is mostly symmetric help for opponents | No slot: 3-MV Human Wizard flier, about 5.0–5.5. "Each player may discard their hand and draw seven" refills three opponents too. Ties the band |
| Proctor of Potential | No slot: only ~14 creatures | No slot: 2-MV Human Cleric; "surveil 1" on every token is smoothing, not cards. Clerics are already at 10. Ties the band |
| Flickering Hound | No slot | No slot: re-buying initiative ETBs is real, but it is a Dog (not party) and the pass cut most of the initiative package. About 5.0 |
| Kindred Judgment | No slot: 7 MV in a deck that already has 6 wipes | No slot: naming Human keeps changelings and Humans, but 7 MV does not beat Blasphemous Act |
| Uldaros Theorix | No slot: 6-MV Elder Sphinx; graveyard-dependent and the curve is already 6-heavy | No slot: not party |
| Sphinx of False Conclusions | No slot: a flash 4/2 blocker that returns once, below Archangel and Settle | No slot: Sphinx Illusion |
| Flesh Duplicate | No slot | No slot: Shapeshifter Rebel (not changeling), and vanishing 3 makes it temporary |
| Essence Burn | No slot: "black or green" is narrower than Erode or Path | No slot |
| Cruel Calculations | No slot: draws only after Jace, Memory Adept's "0: Target player mills ten cards" the same turn (2-card dependency) | No slot |
| Shipwreck Marsh (2nd copy) | Tam already runs one | No slot: U/B untapped from T3 ties Base Camp. With Vernal Fen it is one of the two best 35th-land options |

TAM: NOT CONVERGED (1)
TAZRI: NOT CONVERGED (2)
