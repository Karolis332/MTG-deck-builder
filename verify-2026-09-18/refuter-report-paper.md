# Refuter report — The Cabbage Merchant, PAPER Commander (4-player pod, 40 life)

Every command below was re-run by me. No design file was edited.

## (a) PASS/FAIL per criterion

| # | Criterion | Design A | Design B |
|---|---|---|---|
| 1 | Validator clean, exactly 100, no dup non-basics, all non-basics in pool | **PASS** | **PASS** |
| 2 | Dropped-card scan (nothing good omitted; cuts justified) | **PASS** | **PASS** |
| 3 | Disputed slots defensible | **PARTIAL** (Rogue's Passage wrong) | **PARTIAL** (Flare + Shamanic Revelation wrong) |
| 4 | Multiplayer fit (fogs, removal, draw, wrath recovery) | **FAIL** — one real protection spell | **PASS** |
| 5 | Mana (lands, green sources vs GGG, ramp) | **PASS** | **PASS** (one land light) |
| 6 | Win-condition reality, no missed combo | **PASS** after A's 11:03 rewrite (see H2); both miss H4 | **PARTIAL** — Halsin mana math wrong |
| 7 | Rules-check of sections 10-12 | **FAIL** — 2 wrong claims, 4 overstated | **PARTIAL** — 1 wrong, 3 overstated |
| 8 | Opening-hand criteria consistent | **PARTIAL** — accelerant list wrong | **PARTIAL** — accelerant list wrong |

    node verify-2026-09-18/check-deck-paper.cjs verify-2026-09-18/design-A-paper.txt --ci G
    total cards : 100   lands: 36   nonland: 64   avg MV 2.86   errors: 0
    node verify-2026-09-18/check-deck-paper.cjs verify-2026-09-18/design-B-paper.txt --ci G
    total cards : 100   lands: 35   nonland: 65   avg MV 2.82   errors: 0

Criterion 1: the three names that fail a naive pool string match (Invasion of Ikoria, Bridgeworks
Battle, Disciple of Freyalise) are present as double-faced rows at pool lines 27, 30 and 34. No genuine
out-of-pool card in either list.

Criterion 2, both halves clean for both designs. Pool cards with inc% >= 20 **or** lift >= 2.5 used by
neither design and absent from the current deck: **none** (highest unused lift in the whole pool is
Shortcut to Mushrooms, 1.64 / inc 0.3). Cards cut from the current deck with inc% >= 20: **none** —
highest-inc shared cut is Explore 8.6 / -0.84; only-A cuts Flare 1.4 and Shamanic Revelation 8.2;
only-B cut Kodama's Reach 10.6. **No pool card with inc% >= 30 is unused by both designs.**

## (b) Findings by severity

### CRITICAL

**C1 — Design B's primary win condition cannot pay for itself.** `design-B-paper.md:234` — "Mana: 4 for
Halsin, then {1} per token, which Jaheira pays for out of the same token pile." Jaheira grants
"{T}: Add {G}", and a token tapped for mana **cannot be declared as an attacker**. Funding k animations
from the pile costs k attackers, so with N tokens you attack with at most N/2. B's "ten animated tokens
is 40 trampling power" (`:235`) needs ten mana from **lands**: turn 10-11, not 9-10. The plan works, the
mana line does not.

### HIGH

**H1 — Both designs claim Walking Ballista answers a hexproof creature. It cannot.**
`design-A-paper.md:186`, `design-B-paper.md:265`. Oracle: "Remove a +1/+1 counter from this creature: It
deals 1 damage to **any target**." Hexproof stops opponents targeting it, and damage does not destroy an
indestructible one either. **The list has no answer to a hexproof creature at all** — Wicked Wolf,
Bridgeworks Battle, Archdruid's Charm mode 2 and Kenrith's Transformation all target too. A deck
weakness, not just a doc error.

**H2 — WITHDRAWN against the current file; design A rewrote section 10 mid-review.** The 10:58 version
I reviewed claimed "36 trample damage. **One-shots a single opponent**" for the Night of the Sweets'
Revenge line — false at 40 life, and Night grants no trample. The 11:03 file replaced section 10 with
an honest table: turn 9-11 to threaten **one** opponent and "No" in the kills-the-table column of every
row. Nothing else in design A changed; sections 8, 9, 11 and 12 are identical, only shifted +10 lines.
The arithmetic is retained in (e) in case that line is rebuilt.

**H3 — Design A: Wicked Wolf's tap is an effect, not a cost.** `design-A-paper.md:232` — "The ability
**taps** Wicked Wolf, so it cannot be used repeatedly." Oracle: "...It gains indestructible until end of
turn. **Tap it.**" The tap happens on resolution, so the ability may be activated any number of times
including while already tapped, and a tapped blocker still deals damage. B is right at `:300`.

**H4 — Both designs missed a two-mana haste finisher already in both lists.** Bumi's Feast Lecture
({1}{G}, inc 32.8, lift 3.65): "Create a Food token. Then **earthbend X, where X is twice the number of
Foods you control**." Earthbend makes a land a 0/0 **with haste** carrying X +1/+1 counters — five Foods
is a 10/10 attacker for two mana, eight a 16/16. Took adds +2 to X, Garruk's Uprising gives it trample,
and if it dies it returns tapped. Neither win-condition section mentions it (grep "bumi": one hit in A's
role table, zero in B). Fastest single-target kill in the deck, and the threat is a land, so wraths miss.

### MEDIUM

**M1 — Rogue's Passage (A) is the wrong land here.** {4} and a tap to make **one** creature unblockable,
in a deck whose kills all come from going wide, and colourless under three {G}{G}{G} costs. Cut for a Forest.

**M2 — Design B keeps Shamanic Revelation and Flare of Cultivation; both are wrong keeps.** Shamanic
Revelation draws "a card for each **creature** you control" and this board is noncreature artifact
tokens — A's cut reason at `design-A-paper.md:133` is correct. Flare is Kodama's Reach at a harder cost
({1}{G}{G} vs {2}{G}) whose free mode demands sacrificing a nontoken green creature; in this list those
are all engine pieces (Goose, Provisioner, Took, Jaheira, Steelseeker).

**M3 — Design B overstates the Bogbeast double-kill.** `design-B-paper.md:242` — "can kill two in the
same combat if you split five animated bodies". Five 4/4 tokens at +14/+14 are 18/18 each; a 3/2 split
is 54 and 36, leaving the second opponent at 4. It works only if the Bogbeast itself (3/3 base, 17/17
pumped) attacks as a sixth body and you split 3/3.

**M4 — Design A's cut/add accounting is wrong.** `design-A-paper.md:116` — "Four cuts are lands, matched
by four Forest, so card-quality swaps are 21." Measured diff vs the current deck: 25 named out, 21 named
in, Forest +4. The four land cuts are matched by four **non-basic land adds**; the +4 Forest comes from
21 nonland cuts against only 17 nonland adds. B's accounting at `:152` matches my diff exactly.

**M5 — Both accelerant lists are wrong on timing.** `design-B-paper.md:324` and `design-A-paper.md:243`
both call Gilded Goose a one-mana turn-one accelerant; on turn one it is summoning sick, makes a Food on
entry and taps from turn two. B's `:325` also says a Food only taps for green with Jaheira or Night out,
omitting the commander's own "Tap two untapped Foods you control: Add one mana of any color".

**M6 — Both designs under-provide protection; A badly.** Counted from the lists, A has exactly one card
that protects an engine piece from removal (Autumn's Veil, blue and black only); B has two (plus
Snakeskin Veil). Three opponents means three removal spells aimed at Manufactor, Jaheira or Took.

### LOW

- **L1** `design-A-paper.md:159` — Endurance is not a "free flash 3/4". Evoke **sacrifices** it: you get
  the body or you get it free, never both. B's `:193` splits the modes but also omits the sacrifice.
- **L2** `design-A-paper.md:168` — Tendershoot Dryad's "four Foods per round" holds only with Peregrin
  Took out. A's rewritten section 10 pairs the two correctly; the section 8 add table still does not.
- **L3** `design-A-paper.md:213` — the Jaheira line lists "Saprolings, Spiders, Pests and Clues all tap
  for green". The first three are creature tokens and cannot tap the turn they arrive. B is right at `:279`.
- **L4** `design-A-paper.md:236` — Unlucky Cabbage Merchant's search is optional ("you **may** search").
  Declining keeps the body for later triggers.
- **L5** `design-A-paper.md:249` — Sarinth Steelseeker does not recover flood. It looks at the top card
  only when an artifact enters, and its flood help is binning a land you decline; it draws no nonlands.
- **L6** `design-B-paper.md:317` — "the other 27 nontoken creatures here are green". B's 99 holds 31
  creatures, 3 colourless (Academy Manufactor, Syr Ginger, Walking Ballista), so **28** are green.
- **L7** Helix Pinnacle is the one defensible unused pool card: inc 7.5, lift 0.96, shroud, "{X}: put X
  tower counters; at your upkeep with 100 or more, you win the game". Uninteractable, and it wins through
  the deck's real failure mode of repeated wipes, but blank on turns 1-8. Not merged; swap it for Nissa,
  Who Shakes the World if the pod wraths three times a game.

### Verified as correct (no finding)

No infinite or near-infinite line exists **anywhere in the pool**, not only in the two lists. I checked
every untapper (Seedborn Muse, Guac & Marshmallow Pizza, Nissa, Ba Sing Se earthbend), every free sac
outlet (Wicked Wolf, Peregrin Took, Gilded Goose, Tough Cookie, Syr Ginger, Sakura-Tribe Elder, Spore
Frog) and every token multiplier (Took, Manufactor, Second Harvest) against Jaheira and Night as mana:
no token maker is both free and repeatable, so nothing loops. B's claim at `:269` stands. Also correct
in both docs: Took-before-Manufactor ordering and the 12-vs-10 counts; Second Harvest giving **one**
extra Food under Took; convoke tapping summoning-sick creatures while Foods cannot convoke; Garruk's
Uprising not firing off animation; Arachnogenesis preventing damage table-wide; Displaced Dinosaurs
being a 7/7 (DB query); Bogbeast sequencing (B `:290`); tapping a Food not reducing Night's X (B
`:261`). Mirage Mirror is not in the paper pool and neither doc claims it.

## (c) Verdict on the base

**Base = Design B.** Its rules section is materially more accurate — it gets Wicked Wolf, Jaheira
summoning sickness, the commander's tap-not-sacrifice clause and Bogbeast sequencing right where A does
not; its cut/add accounting reconciles exactly against the measured diff; and it alone carries a second
protection spell and a second recursion spell into a three-opponent pod. A's edge is card selection in
four slots, a three-swap fix. B's edge is that its reasoning can be trusted, which is not.

| Disputed slot | Ruling | Reason |
|---|---|---|
| Flare of Cultivation | OUT | Free mode costs an engine creature; {1}{G}{G} harder than {2}{G} |
| Shamanic Revelation | OUT | Counts creatures; this board is noncreature artifact tokens |
| Kodama's Reach | IN | Same effect as Flare, one green pip, inc 10.6 vs 1.4 |
| Snakeskin Veil | IN | Only protection not restricted to blue and black (M6) |
| Regrowth | IN | Third wrath answer with Eternal Witness and Invasion of Ikoria |
| Sapseep Forest | IN | Forest subtype so Nissa doubles it; repeatable lifegain trigger for Well of Lost Dreams and Trudge Garden |
| Rogue's Passage | OUT | Unblockable-one in a go-wide deck; colourless under three GGG costs |
| Orchard Strider | OUT | Six mana for two Foods and a 6/4; the curve already carries a 7-drop |
| Spider-Ham, Peter Porker | IN | +1/+1 on every Halsin-animated Bear, plus Spiders, Bosco, Earth King's Bear, Toski, Goose, Spore Frog, Wicked Wolf; closes the damage gaps in H2 and M3 |
| Forest count | 31 | With Sapseep Forest that lands on 36 lands / 35 green sources |

## (d) Merged list — `verify-2026-09-18/merged-paper.txt`

Exact swap set **relative to design B**. Three swaps, nothing else changes:

    -1 Flare of Cultivation   +1 Kodama's Reach             one green pip, inc 10.6 vs 1.4, free mode eats an engine creature
    -1 Shamanic Revelation    +1 Sapseep Forest             Revelation counts creatures, not Foods; slot becomes the 36th land
    -1 Mishra's Bauble        +1 Spider-Ham, Peter Porker   anthem closes the 36-vs-40 and 3/2-split gaps; still an artifact on entry

Validator, re-run by me:

    node verify-2026-09-18/check-deck-paper.cjs verify-2026-09-18/merged-paper.txt --ci G
    total cards     : 100   lands: 36   nonland: 64
    avg MV (nonland): 2.81
    curve           : 0:1 1:12 2:15 3:18 4:9 5:7 6:1 7:1
    errors          : 0     exit=0

Power level, report only: **7.09 / 10**, efficiency 7.47, avg nonland cost 2.65 (A 7.08, B 7.13, current 7.06).

**Mana**, measured: 36 lands, 35 green land sources, plus two double-faced land backs (Tanglespan
Bridgeworks, Garden of Freyalise) = 38 effective lands, 37 green sources; 33 Forest-subtype so Nissa
doubles 33. Far above requirement for the three {G}{G}{G} costs. Ramp 17 pieces. **36 lands is right**
at this curve: a 7-drop, the {5}{G}{G} Night activation, two X-spells, a commander that gets recast.

**Multiplayer counts**, measured: 4 fogs, 5 spot removal, 3 artifact/enchantment removal, 13 draw
sources, 2 protection, 3 wrath answers. Wrath survival is structural, not spell-based — Food, Clue and
Treasure tokens are noncreature artifacts that live through creature wipes, and Halsin plus Tough Cookie
rebuild an attack from them for one and three mana. Under-provided: no answer to hexproof (H1); three
artifact/enchantment answers against three opponents; almost nothing against fliers.

**Honest clock** vs three opponents at 40 life: nothing kills the table in one turn. Fastest single kill
is Bumi's Feast Lecture on a full Food board (H4) or a Halsin wide attack with Garruk's Uprising, both
turn 9-10 with lands paying the animations; the table falls over three combats, turn 11-13. B's turn
estimates are honest, A's are one to two turns optimistic.

## (e) Corrected text, paste-ready

- **Walking Ballista.** Repeatable colourless damage at instant speed and the deck's only reach to a
  player's last points. It cannot touch a hexproof or indestructible creature: the ability targets and
  damage does not destroy. The list has no answer to hexproof.
- **Wicked Wolf.** Sacrifice a Food: +1/+1 counter, indestructible until end of turn, then it taps. The
  tap is an effect, not a cost, so activate it as often as you like even while tapped, and a tapped
  blocker still deals combat damage. The only cost is giving up a later attack or block.
- **Night of the Sweets' Revenge, standing arithmetic.** Eight Foods, {5}{G}{G}, sacrifice it: every
  creature gets +8/+8. Three Halsin-animated Foods are 12/12 each — 36 damage, four short of a kill from
  40, with no trample unless Garruk's Uprising or Bogbeast is out. Pay from lands; tapped Foods cannot attack.
- **Halsin wide attack (B, win condition 1).** Pay {1} per animation from lands. Every token tapped for
  Jaheira mana is a token that cannot attack, so token-funded animation caps the attack at half the pile.
- **Bumi's Feast Lecture (add to win conditions).** {1}{G}: make a Food, then earthbend twice your Food
  count. Five Foods is a 10/10 haste land, eight a 16/16. Took adds two to X, Garruk's Uprising gives it
  trample, and it dodges creature wraths because the threat is a land; if it dies it returns tapped.
- **Endurance.** Either {1}{G}{G} for a flash 3/4 with reach, or free by exiling a green card, in which
  case evoke sacrifices it on arrival. Never both.
- **Jaheira.** Tokens you control have "{T}: Add {G}". Food, Clue and Treasure tokens tap the turn they
  arrive; Saproling, Pest, Spider and Insect tokens are creatures and must wait a turn.
- **Tendershoot Dryad.** A Saproling at each upkeep, four per round in a pod. Each is also a Food only
  while Peregrin Took is on the battlefield.
- **Unlucky Cabbage Merchant.** Whenever you sacrifice a Food you may search for a basic land; searching
  bottoms the Merchant. Decline when you do not need the land and keep the body.
- **Sarinth Steelseeker.** On each artifact entering, look at the top card: take it if it is a land, or
  bin it. It smooths draws and finds land drops; it does not draw you out of flood.
- **Accelerants (B, opening hands).** Three turn-one accelerants: Llanowar Elves, Elvish Mystic, Elvish
  Spirit Guide. Gilded Goose is a turn-two accelerant — it makes a Food on entry and taps from your next
  turn. Foods tap for mana with Jaheira, Night of the Sweets' Revenge, or the commander's own ability
  (tap two Foods for one mana of any colour).
- **Green nontoken creature count (B).** 28 of the 99, not 27; the three colourless creatures are
  Academy Manufactor, Syr Ginger and Walking Ballista.
