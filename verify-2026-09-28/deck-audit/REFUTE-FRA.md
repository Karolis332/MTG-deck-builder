# REFUTE-FRA — round 2: Reality Fracture swaps (2026-09-28, refuter)

Baseline: `REFUTE.md` round-1 verdicts. Oracle text quoted from `<slug>-deck.md`, `<slug>-pool.md` and
`<slug>-fra-assumed.md`. Per swap I checked three things: (1) the IN text says what the auditor claims, (2) the OUT is
in the deck, is not a lock and is not a round-1 KEEP OUT, (3) the IN clearly beats the OUT.
**Result: 7 KEEP (one moved to a new slot) / 16 REJECT.** Final lists: Section 2. Every OUT was found in its deck,
no IN is already in any paper deck (`decks/paper/decks/*.txt`, ramos included), and every final list comes to 100.
The gate was NOT run: ASSUMED cards are not in the collection table, so the ownership check would fail by construction.

## 1. Per-swap verdicts

| # | Deck | IN ← OUT | Verdict | Evidence (quoted) | Conflict ruling |
|---|---|---|---|---|---|
| 1 | Tam | Kiora of Salt and Sand ← Pia, Aether Ascetic | **REJECT** | Kiora's text is correct: "Planeswalkers you control have '[−8]: Create an 8/8 blue Leviathan creature token with hexproof.'" The OUT claim is false. Pia says "search your library for an enchantment card, reveal it, put it into your hand": you choose the card, so it is not "RNG-gated". Its targets are the 7 Ways, including Mentor + Paradox (the 2-card engine), plus Kaya's Ghostform. Pia is the deck's only enchantment tutor. Kiora is a payoff; Pia assembles the engine. | — |
| 2 | Tam | Niv-Mizzet, Ghost Counsel [IF-OWNED] ← Quintorius Kand | **REJECT** | Quintorius is a "Legendary Planeswalker — Quintorius", the only one of that type, so cutting it lowers Tam's X by 1 (round-1 unique-type rule). Niv's "Whenever you gain life, you may pay that much life. If you do, draw that many cards" is real with Paradox, but it costs {2}{W}{W}{B}{B}, is IF-OWNED, and takes a walker type away. | — |
| 3 | Tazri | Springleaf Parade ← Solemn Doomguide | **KEEP** | Springleaf Parade: "Creature tokens you control have '{T}: Add one mana of any color.'" Najeela (in the deck): "{W}{U}{B}{R}{G}: Untap all attacking creatures. They gain … haste … additional combat phase". Her attacking Warrior tokens pay for the next activation, so combats are infinite. Doomguide only grants "unearth {1}{B}". | Wins the Doomguide slot over #6 |
| 4 | Tazri | Realmwalker ← Archpriest of Iona | **KEEP** | "Changeling (This card is every creature type.)" fills all four party roles. "You may cast creature spells of the chosen type from the top of your library" is card advantage. Archpriest is a 1-drop whose "power is equal to the number of creatures in your party". | Wins the Archpriest slot over #8 |
| 5 | Tazri | Chomping Changeling ← You Find a Cursed Idol | **KEEP** | "Changeling … When this creature enters, destroy up to one target artifact or enchantment." That is the Idol's removal modes on a body that fills any party role. The Idol's third mode ("Treasure … venture") is the only value lost. | Wins the Idol slot over #9 |
| 6 | Tazri | Traxos, Scourge Eternal ← Solemn Doomguide | **REJECT** | "Legendary Artifact Creature — Dragon Construct" fills no party role (Cleric/Rogue/Warrior/Wizard). "doesn't untap during your untap step" makes it a beater with no Tazri text. Loses the Doomguide slot to #3, and no weaker slot is worth giving it. | Loses the slot to #3 |
| 7 | Tazri | Samut, Hazoret's Champion ← Feywild Caretaker | **KEEP** | Samut is a "Human Warrior Cleric" (two roles) for {1}{R}: "Creatures you control have haste." The auditor omitted Caretaker's "you take the initiative". It is still 5 mana for one Wizard, and Wizards stay at 6 plus the changelings. | — |
| 8 | Tazri | Rescue Girl, First Responder ← Archpriest of Iona | **KEEP, moved** → OUT **Yuan-Ti Malison** | Rescue Girl: "Flying … {T}: Return another target permanent you control to its owner's hand. Activate only during your turn." It re-buys the initiative/venture ETBs of Seasoned Dungeoneer, White Plume Adventurer and Ravenloft Adventurer. Yuan-Ti is the next-weakest slot: "can't be blocked as long as it's attacking alone" and ventures only on combat damage. Rogues stay at 9. | Archpriest slot went to #4, so this takes the next-weakest slot |
| 9 | Tazri | Enlightened Confidant [IF-OWNED] ← You Find a Cursed Idol | **REJECT** | The draw is gated: "if you gained life this turn, surveil 1. If you put a card with MV ≤ life gained … into your hand". Tazri has no steady lifegain (only Najeela's lifelink turns). The card is IF-OWNED. | Loses the Idol slot to #5 |
| 10 | Cabbage | Keeper of the Quiet Hour ← Greenhouse Propagator | **REJECT** | Judged without the false [−3] claim: "empower Jace 2" gives a 2-loyalty token. Propagator was protected in round 1 as a loop piece: "Whenever another creature you control enters, you gain 1 life" (so each Trudge Garden 4/4 retriggers) and "{T}: Add {G}". | — |
| 11 | Cabbage | Traxos, Scourge Eternal ← Jiang Yanggu, Never Alone | **REJECT** | Traxos has no Food, token or lifegain text. Jiang's "At the beginning of your end step, untap all tokens you control" doubles Jaheira mana ("Tokens you control have '{T}: Add {G}.'") and makes Mowu. Seedborn Muse untaps on opponents' turns only, so it does not cover your end step. | Traxos: neither deck |
| 12 | Cabbage | Restore with Empathy ← Titanbones, Towering Heart | **REJECT** | The IN text is correct ("Return target permanent card … You gain 4 life"), but it is one rebuy plus one Trudge Garden trigger. Titanbones' "Whenever you gain life, put two +1/+1 counters" scales with every Food sac and Wurmlet trigger, and grows without bound off the round-1 loop. Not a clear upgrade. | Restore: neither deck |
| 13 | Cabbage | Puppet Crafting [IF-OWNED] ← Ribtruss Roaster | **REJECT** | An aura making one permanent a 5/5 is a two-card threat that dies to one removal spell. The card is IF-OWNED, and Ribtruss is an operator-sleeved pick. The auditor's "0 counters" is true only without creature tokens, but Trudge Garden and Halsin make them. | — |
| 14 | Meren | Avacyn, Angel of Horror [IF-OWNED] ← The Gitrog, Ravenous Ride | **REJECT** | The text is strong ("return that card to the battlefield … at the beginning of the next end step"). But Gitrog is an operator keep (HISTORY: "The Gitrog, Ravenous Ride stays"). At MV 8 Meren rarely returns Avacyn to the battlefield (only to hand), and the card is IF-OWNED. | — |
| 15 | Meren | Massacre Girl, Most Wanted ← Golgari Charm | **REJECT** | The auditor claims the Charm's sweep is "covered by … Culling Ritual". HISTORY:169 says the reverse: "Golgari Charm's regenerate mode makes [Culling Ritual] a one-sided creature wipe". Massacre Girl drains one opponent ("1 damage to target opponent"). Blood Artist, Zulaport, Cauldron, Konrad and Vito already drain in the 100. | Massacre Girl: neither deck |
| 16 | Meren | Silence the Echo ← Veil of Summer | **REJECT** | The auditor misquotes Veil: only the draw is conditional. "Spells you control can't be countered … hexproof from blue and from black" is unconditional. With Greaves out (#18), Veil is Meren's last protection (report: "Protection … (2)"). Removal is already dense. | Resolves the #16/#18 contradiction: Veil stays |
| 17 | Meren | Restore with Empathy ← Accursed Marauder | **REJECT** | Marauder is {1}{B}: "each player sacrifices a nontoken creature". Meren returns it every end step, so it is a repeating edict (astra-review: "two-mana, recurrable nontoken edict"). Restore duplicates Meren's own recursion. | Restore: neither deck |
| 18 | Meren | Vraska, the Cutting Glare ← Lightning Greaves | **KEEP** | "Deathtouch" … "When Vraska enters, if you control six or more lands, destroy target permanent an opponent controls." At MV 3 it is a Meren loop, so this is repeatable any-permanent removal. The auditor's premise "Veil of Summer (kept)" holds only because #16 is REJECTed. | Freed Greaves: astra-review proposed it for Imotekh (not evaluated) |
| 19 | Imotekh | Liliana the Repentant ← Marionette Apprentice | **REJECT** | Liliana's text is correct ("mill two cards", plus a one-time "Exhaust"). The OUT claim "one-point trickle" misreads Apprentice's "each opponent loses 1 life", which is 3 per death in a 4-player pod and fires on artifact tokens too. It is one of three each-opponent drain payoffs (Konrad, Marionette Master) in a sac deck. | — |
| 20 | Imotekh | Massacre Girl, Most Wanted ← Umbral Collar Zealot | **REJECT** | Zealot is a free outlet: "Sacrifice another creature or artifact: Surveil 1". The same auditor's §6 says "Umbral Collar Zealot's sac-for-surveil is still the better graveyard-feeding 1-drop". Massacre Girl is a 5-MV single-target drain that needs an outlet. | Massacre Girl: neither deck |
| 21 | Imotekh | Winter, Tormented Loner ← Plasmancer | **KEEP** | Winter: "you may sacrifice a creature or planeswalker. When you do, each opponent sacrifices a creature" (paid with a Necron token), and it gets "+1/+0 for each creature and planeswalker card in your graveyard". Plasmancer is a 4-MV "search … for a basic Swamp card" in a 35-land deck. Minor cost: Winter is not an artifact card unless Biotransference is out. | — |
| 22 | Imotekh | Theoretical Necromancer ← Wayfarer's Bauble | **REJECT** | The claim "repeatable, on-demand" is false: the cost is "Exile this card from your graveyard", so it works once. Bauble is ramp ("put that card onto the battlefield"), and the auditor's own report says "ramp was already thin on redundancy so it stays". | — |
| 23 | Imotekh | Break Under Pressure ← Wishclaw Talisman | **REJECT** | Break's text is correct: it hits the "greatest mana value" creature, and targeting the player gets past creature hexproof. But it is a role swap, not an upgrade. Wishclaw is one of two library tutors (Insatiable Avarice only puts a card on top; Buried Alive is graveyard-only). Spot removal is already Archenemy's Charm, Bitter Triumph, Black Sun's Twilight, Dismember, Feed the Swarm, plus round-1 Noxious Gearhulk. | — |

### Conflict rulings
- **Tazri, duplicate OUTs.** Each slot goes to the better IN. Doomguide → Springleaf Parade (Traxos REJECT). Archpriest →
  Realmwalker; Rescue Girl moves to Yuan-Ti Malison. Cursed Idol → Chomping Changeling (Enlightened Confidant REJECT).
- **Massacre Girl, Most Wanted: neither deck.** Both OUTs are role-critical: Golgari Charm is the operator's Culling Ritual
  pairing, and Zealot is Imotekh's free sac outlet. If the operator wants the card anyway, Imotekh gains more: it has
  3 each-opponent drain payoffs against Meren's 6+. It would still need a different OUT, and I found none that clears the bar.
- **Restore with Empathy: neither deck.** Meren's OUT is a recurring edict, and Cabbage's OUT is a scaling lifegain payoff.
- **Traxos, Scourge Eternal: neither deck.** It fills no Tazri party role and has no Cabbage Food/token/lifegain text.
- **Night's Whisper:** the deck is singleton, so Imotekh takes 1 copy (round-1 KEEP). The 2nd copy stays in the binder.
  Meren's round-1 Night's Whisper was already REJECTed.

## 2. Final swap lists (round-1 KEEPs + round-2 KEEPs)

Tags: **registered** = in `collection.txt`; **ASSUMED** = unregistered FRA common/uncommon or echo pair, so confirm it is
in hand before sleeving. No IF-OWNED card survived. Verified with a scratch script that applies every swap to
`decks/paper/decks/<slug>.txt`: each OUT is present, no IN is a duplicate, and each final count is 100. Also checked
that no IN appears in two decks or in any other paper deck.

**Tam the Possibility** (100 → 100)
1. + Well of Lost Dreams [registered] − Chandra, Fire Artisan (round 1)
2. + Domri, Anarch of Bolas [registered] − Rewrite Regrets (round-1 coverage miss #1, adopted in the §6 baseline)

**Meren of Clan Nel Toth** (101 → 100)
1. + Vito, Thorn of the Dusk Rose [registered] − Grim Servant (round 1)
2. + Grave Titan [registered] − Rune-Scarred Demon (round 1)
3. + Jungle Hollow [registered] − High Market (round 1)
4. + Vraska, the Cutting Glare [ASSUMED] − Lightning Greaves (round 2)
5. − Creakwood Liege (round-1 fix: the 101st card)

**Tazri, Beacon of Unity** (100 → 100)
1. + Generous Gift [registered] − Concerted Defense (round 1)
2. + Putrefy [registered] − Bar the Gate (round 1)
3. + Infernal Grasp [registered] − Multiclass Baldric (round 1)
4. + Syphon Mind [registered] − Thwart the Grave (round 1)
5. + Springleaf Parade [registered] − Solemn Doomguide (round 2)
6. + Realmwalker [registered] − Archpriest of Iona (round 2)
7. + Chomping Changeling [registered] − You Find a Cursed Idol (round 2)
8. + Samut, Hazoret's Champion [ASSUMED] − Feywild Caretaker (round 2)
9. + Rescue Girl, First Responder [ASSUMED] − Yuan-Ti Malison (round 2, moved slot)
- **HELD, not in the count:** both reverse an operator decision in the brief's known facts, so each needs an explicit
  operator yes before it is applied.
  - + Grand Abolisher [registered] − Stick Together. The operator cut Abolisher in v4.
  - + Growth Spiral [registered] − Explore the Underdark. The operator added Explore in v6.

**Imotekh the Stormlord** (100 → 100)
1. + Necrotic Ooze [registered] − Flayed One (round 1)
2. + Noxious Gearhulk [registered] − Canoptek Wraith (round 1)
3. + Dread Presence [registered] − Cryptek (round 1)
4. + Puppeteer Clique [registered] − Lychguard (round 1)
5. + Night's Whisper [registered, 1 of 2 copies] − Ominous Harvest (round 1)
6. + Winter, Tormented Loner [ASSUMED] − Plasmancer (round 2)

**The Cabbage Merchant** (99 → 100)
1. + Elvish Spirit Guide [registered] − Hungering Puppetbeast (round 1)
2. + Alhammarret's Archive [registered] − Ginger, Queen of Sweets (round 1)
3. + Tendershoot Dryad [registered] − Emil, Vastlands Roamer (round 1)
4. + Hunter's Insight [registered] − Spry and Mighty (round 1)
5. + Elvish Archdruid [registered] (round-1 fix: the 100th card)

### Recurring auditor errors (for the next brief)
- Cutting engine or loop pieces already protected in round 1: Greenhouse Propagator (again), Pia (the Ways tutor),
  Accursed Marauder, and Golgari Charm as the Culling Ritual pairing.
- Misreading OUT text: Veil of Summer's conditional clause, Apprentice's "each opponent", Theoretical Necromancer's
  self-exile, and Feywild Caretaker's initiative.
- Contradicting their own documents: Meren #18 relies on Veil staying while #16 cuts it; Imotekh cuts Zealot after its
  §6 defended Zealot and cuts Bauble after the report kept it.
