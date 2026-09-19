# The Cabbage Merchant — paper Commander upgrade (2026-09-18)

List: `cabbage-merchant-upgrade.txt` (100 cards, ManaBox format). Owned cards only: the sleeved deck,
the typed spare pile (`decks/brawl/cabbage-merchant-sidedeck.txt`) and the paper register's open cards.
Validated: 0 errors (`node verify-2026-09-18/check-deck-paper.cjs decks/paper/proposals/cabbage-merchant-upgrade.txt --ci G`).
Corpus numbers below: `inc` = share of 2,001 real Cabbage Merchant decks running the card, `lift` = how
much more the card is played under this commander than in green decks generally (>2 = commander-specific).

| | Current | Upgrade |
|---|---|---|
| Lands | 32 | 36 (31 Forest + Ba Sing Se, Mosswort Bridge, Gingerbread Cabin, Sapseep Forest, Blighted Woodland) |
| Avg MV (nonland) | 3.25 | 2.81 |
| Curve | — | 0:1 1:12 2:15 3:18 4:9 5:7 6:1 7:1 |
| EDHPowerLevel port | 7.06 | 7.09 |
| Turn-one accelerants | 1 | 3 (Llanowar Elves, Elvish Mystic, Elvish Spirit Guide) + Gilded Goose on turn two |
| Protection for the engine | 1 | 3 (Autumn's Veil, Snakeskin Veil, Endurance as a flash blocker) |
| Wrath recovery | 0 | 3 (Eternal Witness, Regrowth, Invasion of Ikoria) |

## 1. Plan

Food engine, four-player pod. Make Foods, multiply them (Peregrin Took, Academy Manufactor, Second
Harvest), turn them into mana (Jaheira, Night of the Sweets' Revenge, the commander), cards (Took,
Well of Lost Dreams, Sarinth Steelseeker, Syr Ginger) and bodies (Halsin, Trudge Garden, Displaced
Dinosaurs), then kill one opponent per combat. The deck has **no infinite loop and no single-turn table
kill**; a win is three attack steps across three of your turns, ordered by who can stop you.

## 2. Roles

| Role | Cards |
|---|---|
| Ramp (11) | Gilded Goose, Llanowar Elves, Elvish Mystic, Elvish Spirit Guide, Rampant Growth, Sakura-Tribe Elder, Emerald Medallion, Cultivate, Kodama's Reach, Blighted Woodland, Many Partings |
| Food makers (14) | Gilded Goose, Guac & Marshmallow Pizza, Party Dude, Unlucky Cabbage Merchant, Tough Cookie, Bumi's Feast Lecture, Lembas, Peregrin Took, Tireless Provisioner, Giant Opportunity, Gingerbread Cabin, Night of the Sweets' Revenge, Bosco, The Earth King |
| Multipliers (3) | Peregrin Took, Academy Manufactor, Second Harvest |
| Token → mana (3) | Jaheira, Night of the Sweets' Revenge, the commander (tap two Foods) |
| Token → damage (6) | Halsin, Tough Cookie, Displaced Dinosaurs, Trudge Garden, Blossoming Bogbeast, Bumi's Feast Lecture |
| Draw (10) | Peregrin Took, Sarinth Steelseeker, Syr Ginger, Lembas, Well of Lost Dreams, Garruk's Uprising, Toski, Return of the Wildspeaker, Ohran Frostfang, Idol of Oblivion |
| Interaction (8) | Wicked Wolf, Bridgeworks Battle, Kenrith's Transformation, Archdruid's Charm, Force of Vigor, Pest Infestation, Walking Ballista, Endurance |
| Fog / defence (6) | Fog, Spore Frog, Tangle, Arachnogenesis, Hornet Nest, Endurance |
| Recursion (3) | Eternal Witness, Regrowth, Invasion of Ikoria |
| Protection (2) | Autumn's Veil (blue/black only), Snakeskin Veil |
| Untap / mana doubling (3) | Seedborn Muse, Nissa, Guac & Marshmallow Pizza |
| Anthem / finish (4) | Spider-Ham, Garruk's Uprising, Forgotten Ancient, Chord of Calling |

## 3. Win conditions against three opponents, ranked

Starting life 40 each, 120 across the table. Turn numbers are for a real pod with blockers and removal.

**1. Bumi's Feast Lecture, the fastest single kill.** {1}{G}: make a Food, then earthbend twice your Food
count. Five Foods is a 10/10 **haste** land, eight is a 16/16. Took adds +2 to X, Garruk's Uprising or
Blossoming Bogbeast gives trample, Spider-Ham +1/+1. The threat is a land, so creature wraths miss it,
and if it dies it comes back tapped. Two mana, any turn from about turn 6.

**2. Halsin wide attack.** Halsin ({4}) then {1} per token: a 4/4 Bear until end of turn, Spider-Ham makes
it 5/5. Pay the {1}s from **lands**: a token tapped for Jaheira mana cannot attack, so token-funded
animation caps the attack at half the pile. Only animate tokens that were under your control since your
turn began. Ten animated tokens with Uprising is 40 trample, one opponent, turn 10–11.

**3. Blossoming Bogbeast alpha.** Sacrifice Foods in your **first** main phase (3 life each, Trudge
Garden turns each into a 4/4), then attack with the Bogbeast: gain 2, everything gets trample and
+X/+X for all life gained this turn. Four Foods cracked = +14/+14. Five 4/4 tokens at 18/18 kill one
opponent with room; a two-player split only works with the Bogbeast itself attacking as the sixth body.
Repeats every combat, the Bogbeast is not sacrificed. Turn 9–10 for one kill.

**4. Displaced Dinosaurs + Academy Manufactor.** Every Food, Clue or Treasure entering after the
Dinosaurs is a 7/7 (artifacts are historic). One Food event = three 7/7s = 21 power, each entering
draws off Garruk's Uprising. Seven mana, then three, then a maker: two or three turns of setup, the
tokens are summoning sick, and it is the easiest plan to wrath. Turn 10–11 for one kill. Payoff, not a race.

**5. Night of the Sweets' Revenge.** {5}{G}{G}, sacrifice it, sorcery speed: creatures get +X/+X for
your Food count. Eight Foods and three animated bodies is 36, **four short of 40**, and it grants no
trample on its own. Pay from lands (tapped Foods cannot attack), pair with Uprising or Bogbeast, and
treat it as a finisher for a player already below 30.

**6. Walking Ballista.** Reach for the last points at instant speed and the only damage that ignores
blockers. It targets, so it does nothing to a hexproof creature; **the deck has no answer to hexproof**.

## 4. Engine lines (oracle-checked)

- **Took before Manufactor.** Took: one extra Food per token-creation event (a replacement effect on
  "one or more tokens", once per event). Manufactor: each Food/Clue/Treasure becomes one of each. You
  choose the order. "Create three Foods" → Took first = 4 Foods → Manufactor = **12 tokens**; Manufactor
  first = 9, then Took = 10. Always Took first. One Food → 6 tokens.
- **Second Harvest** copies every token; each copied Food is a Food, so Manufactor triples the copies
  and Took adds one more. Pay it at instant speed on an opponent's end step.
- **Jaheira**: tokens have "{T}: Add {G}". Food/Clue/Treasure tap the turn they arrive. Saproling,
  Pest, Spider, Insect and Dinosaur tokens are creatures and wait a turn. Seedborn Muse untaps the pile
  on every opponent's untap step: four mana refills per round.
- **The commander's "tap two untapped Foods: add one mana of any colour" taps, it does not sacrifice.**
  Foods stay for Night's X. Worse than Jaheira (two Foods = two green), but it is turn-one mana.
- **Free sacrifice outlets**: Wicked Wolf (sacrifice a Food: +1/+1 counter, indestructible, then it
  taps; the tap is an effect, not a cost, so use it again while tapped), Peregrin Took (three Foods:
  draw), Gilded Goose. Each Food hitting the yard feeds Syr Ginger (+1/+1, scry 1), each 3 life feeds
  Well of Lost Dreams (pay X, draw X) and Trudge Garden ({2}: a 4/4 trampler, itself a token event for Took).
- **The commander's forced sacrifice** (a creature deals combat damage to you → sacrifice a Food) is
  three opponents running your sac outlet for you. Unlucky Cabbage Merchant's search is optional; decline
  it when the land is not needed and keep the body.
- **Garruk's Uprising** draws on a power-4 creature **entering**: Dinosaur tokens, Trudge Garden's
  Beast, Giant Opportunity's Giant, The Earth King's Bear. Halsin and Tough Cookie animation is not entering.
- **Tendershoot Dryad**: a Saproling at every upkeep, four per round; each is also a Food only with Took out.
- **Invasion of Ikoria** at X=3 finds Academy Manufactor from library **or graveyard** (non-Human, MV 3).
- **Chord of Calling** convoke can tap summoning-sick creatures (Dinosaurs, Saprolings); Foods cannot convoke.
- **Endurance**: {1}{G}{G} for a flash 3/4 reach, or free by exiling a green card, in which case evoke
  sacrifices it on arrival. Never both.
- **Arachnogenesis**: X = creatures attacking you; prevents all non-Spider combat damage that turn.
  Hornet Nest only makes Insects when dealt damage, so it is a deterrent, not a token engine.
- **Sarinth Steelseeker** looks at the top card on each artifact entering: take it if it is a land, else
  bin it. It finds land drops, it does not draw you out of flood.

## 5. Opening hands

**Accelerants**: Llanowar Elves, Elvish Mystic, Elvish Spirit Guide (turn one). Gilded Goose is turn two.
Lembas and Foods are not accelerants until Jaheira, Night or the commander is out.

**Keep**: 3–4 lands + one accelerant + one 2–3-mana engine piece (Took, Jaheira, Manufactor, Steelseeker,
Tireless Provisioner, Unlucky Cabbage Merchant) + one fog. Minimum: 3 lands + accelerant, or 4 lands + two
spells castable by turn three, or 3 lands + two engine pieces. On the draw in a pod, 2 lands + Tangle or
Arachnogenesis is keepable.

**Mulligan**: 0–1 lands; 5+ lands with nothing to cast before turn four; hands whose only action is
Displaced Dinosaurs, Chord of Calling, Bosco or Seedborn Muse; all fogs and no engine; two or more of
Second Harvest, Night, Halsin, Bogbeast with no token maker.

**Best six to see early**: Gilded Goose, Academy Manufactor, Jaheira, Peregrin Took, Sarinth Steelseeker,
an Elf. Do not deploy Manufactor and Jaheira the same turn unless you hold a Veil: two engine pieces on
an empty board makes you the archenemy.

## 6. Changes (26 out, 21 in, +5 Forest)

| Out | inc / lift | Reason |
|---|---|---|
| Ash Barrens, Escape Tunnel, Nesting Grounds, Rumble Arena | ≤1.4 / ≤0 | Colourless lands under three GGG costs; Nissa doubles Forests only |
| Avatar Kyoshi, Earthbender; The Legend of Kyoshi | 1.2 / −0.4 | Earthbend package, 8-drop; Bumi's Feast Lecture already covers earthbend |
| Bloodspore Thrinax, Lifeblood Hydra, Ghalta | ≤2.4 / ≤−1.8 | Big-creature payoffs on an artifact-token board |
| Cankerbloom | 1.1 / −1.7 | Force of Vigor, Bridgeworks Battle, Pest Infestation, Charm cover artifacts/enchantments |
| Cream of the Crop, Vivien's Arkbow, Monstrous Vortex | ≤0.3 / ≤−0.6 | Top-of-library and cascade payoffs need big creatures |
| Crystalline Armor, Spry and Mighty, Overrun | ≤1.3 / ≤−0.6 | One-shot pump; Uprising, Bogbeast, Spider-Ham are permanents |
| Cycle of Renewal, Shared Roots, Explore | ≤8.6 / ≤−0.3 | Weak cantrips; Steelseeker and Took draw every turn |
| Flare of Cultivation | 1.4 / −1.3 | Free mode sacrifices a nontoken green creature, i.e. an engine piece; Kodama's Reach is the same effect |
| Shamanic Revelation | 8.2 / −0.9 | Counts creatures; the board is noncreature tokens |
| Selvala, Heart of the Wilds | 1.8 / −2.3 | Symmetric draw feeds three opponents |
| Loot, Oviya, Sandman | ≤1.0 / ≤−1.3 | Off-plan legends |
| Mishra's Bauble | 0.1 / −1.1 | Artifact count only, no mana |

| In | inc / lift | Reason |
|---|---|---|
| Gilded Goose | 88.3 / 3.11 | Food + ramp on turn one, free sac outlet |
| Llanowar Elves, Elvish Spirit Guide | 57.1, 34.9 | Turn-one Manufactor/Took/Jaheira on turn three |
| Autumn's Veil, Snakeskin Veil | 27.2, 8.3 | Engine protection vs three removal spells |
| Spider-Ham, Peter Porker | 3.1 / 0.6 | +1/+1 to every Halsin Bear, Spiders, Bosco, Toski, Goose, Wolf; closes the 36-of-40 gaps |
| Sakura-Tribe Elder | 4.7 | Ramp + chump + Uprising-free body |
| Lembas | 16.8 / 3.52 | Food that draws |
| Trudge Garden | 2.8 / 2.29 | Every 3 life → a 4/4 trampler token |
| Eternal Witness, Regrowth | 29.7, 2.7 | Rebuy Second Harvest / Force of Vigor / Charm after a wrath |
| Endurance | 26.4 / 1.43 | Flash blocker, graveyard hate, free |
| Well of Lost Dreams | 8.3 / 2.63 | Lifegain → cards |
| Pest Infestation | 14.5 / 1.74 | Tokens + artifact/enchantment removal in one card |
| Invasion of Ikoria | — | Tutor Manufactor to the battlefield, from the yard too |
| Sapseep Forest | 0.6 | Forest subtype (Nissa), repeatable lifegain trigger |
| Hornet Nest | 5.0 | Nobody attacks into it |
| Tendershoot Dryad | 4.0 | Four tokens a round, Foods with Took |
| Blossoming Bogbeast | 6.5 / 2.21 | Repeatable trample alpha off Food lifegain |
| Gingerbread Cabin | 46.2 / 2.34 | Forest that makes a Food |
| Blighted Woodland | 6.5 | Land ramp that dodges wraths |

Second copies assumed (also sleeved in Meren/Imotekh/Tazri): Llanowar Elves, Sakura-Tribe Elder, Eternal
Witness. If only one copy exists, the deck they leave is the one to re-sleeve.

## 7. Not owned, would improve it (informational, from the corpus)

Sol Ring ($1.54), Trail of Crumbs ($0.58), Beast Within ($0.60), Feasting Hobbit ($0.40), Feasting Troll
King ($0.71), Quina ($0.26), Transmutation Font ($2.39), Stridehangar Automaton ($2.79), The Shire ($4.01),
Heroic Intervention ($14.81). Full list: `verify-2026-09-18/cabbage-buy-candidates.txt`. Helix Pinnacle
(owned, inc 7.5) is the one defensible unused card: swap it for Nissa if the pod wraths three times a game.

## 8. When re-sleeved

Copy this list over `decks/paper/decks/the-cabbage-merchant.txt` and run `npx tsx scripts/paper-sync.ts`.

## 9. v2 (2026-09-18): Transmutation Font now, five purchases on arrival

**Applied now** (operator owns the Font; validator 0 errors, 100 cards, 36 lands):

| Out | In | Why |
|---|---|---|
| Nissa, Who Shakes the World | Transmutation Font | Corpus 52.5 % / lift 3.82 vs 2.5 %; with Manufactor one tap makes Food+Clue+Treasure, so {3} tutors an artifact onto the battlefield every turn |

**On arrival** of Trail of Crumbs, Beast Within, Feasting Hobbit, Feasting Troll King, Quina (add them to
`collection.txt`, then apply):

| Out | In | Why |
|---|---|---|
| Tendershoot Dryad | Trail of Crumbs | Dryad is 4 % of the corpus, five mana, creature tokens that wait a turn; Trail turns every Food sacrifice into a dig. Many Partings (47.5 %) stays |
| Kenrith's Transformation | Beast Within | Same slot, instant speed, any permanent |
| Sakura-Tribe Elder | Feasting Hobbit | Frees a card double-sleeved in Meren; 2-mana threat that eats Foods (devour Food 3), blocked only by bigger power |
| Ohran Frostfang | Feasting Troll King | 7/7 vigilance trample, three Foods when cast, rebuys itself for three Foods |
| Forgotten Ancient | Quina, Qu Gourmet | Third token multiplier: a 1/1 Frog on every token event |

Rules for the new cards:
- Transmutation Font tutors onto the battlefield: never fetch Walking Ballista with it (enters with X=0 and dies). Targets in order: Academy Manufactor, Well of Lost Dreams, Idol of Oblivion, Syr Ginger, Lembas, Emerald Medallion. Without Manufactor the three different names are Food, Clue, Blood over three taps.
- Replacement order on any token event once Quina is in: Took first, Quina anywhere, Manufactor last. "Create one Food" → 6 artifact tokens + 1 Frog.
- Feasting Troll King's graveyard return is not a cast, so no Foods on return; not historic, so no Dinosaur trigger.
- Feasting Hobbit: three Foods on entry = nine +1/+1 counters; each Food sacrificed still triggers Trail, Well, Trudge Garden, Syr Ginger.
- Beast Within still targets: no hexproof answer.

## 10. Land count (2026-09-18, operator: "I don't really have mana problems")

Corpus: the average Cabbage Merchant deck runs ~30 lands (18.2 Forest + 11.9 nonbasics) with more dorks
and rocks. The old deck ran 32 at avg MV 3.25 with one dork and no problems; 36 + two MDFC backs at avg
MV 2.81 with four dorks was too many. Applied: **3 Forest out (28 left, 33 lands + Tangled Florahedron
+ 2 MDFC backs)**, in: Tangled Florahedron (2-mana dork or a tapped Forest-equivalent land), Helix
Pinnacle (shroud; Jaheira + Seedborn Muse dumps the token pile into it on every opponent's turn, ~80
counters a round from 20 tokens; wins through wraths and blockers), Hornet Queen (seven mana, five
flying deathtouch bodies, a token event for Took; the pod's best defensive creature you own; Chord of
Calling can convoke creature tokens into it). Rejected: Mycoloth (devour sacrifices creatures, not Foods;
without creature fodder it is a 4/4 that makes nothing; corpus 0.2 %). Kodama's Reach and Return of the
Wildspeaker were already in the list.

## 11. Operator review of the swap page (2026-09-18)

Rows 19/20/22/23/24 flagged. The page pairs cuts with adds by role and mana value for display; a pair is
not an argument that one card replaces the other. Corrections applied: Sapseep Forest out (its reason
was Nissa doubling Forests, and Nissa is out) and Blighted Woodland out (6 %, four mana for two tapped
basics at 33 lands), both become basic Forest (30); Regrowth out for **Brawn** (from the graveyard with
a Forest, every creature you control has trample: Halsin bears, Bogbeast, Dinosaurs, the Bumi land;
Disciple of Freyalise sacrifices it for 3 life and 3 cards, and any wrath or chump turns it on).
Kept: Trudge Garden (lift +2.3, every Food sacrifice becomes a 4/4 trampler for {2}) and Gingerbread
Cabin (46 % of the corpus, a Forest that makes a Food). Lands 33 (30 Forest, Ba Sing Se, Mosswort
Bridge, Gingerbread Cabin) + Tangled Florahedron + 2 MDFC backs.

## 12. Operator's sleeved changes (2026-09-18)

Kept Spry and Mighty, added Ribtruss Roaster, no Lembas. Applied: −Lembas, −Hornet Nest (Hornet Queen
covers deterrence), +Spry and Mighty, +Ribtruss Roaster. Rules: Ribtruss Roaster's devour sacrifices
**creatures** only; Foods, Clues and Treasures do not count unless Halsin has animated them this turn
({1} each, then devour the 4/4s). Enters with N counters → N Pests every end step, each Pest a token
event (Took Food) and a Jaheira mana source from your next turn. Spry and Mighty: X = power difference
between the two chosen creatures; a 7/7 Dinosaur token beside a 1/1 dork draws six and gives both +6/+6
trample. Arrival plan unchanged (Dryad, Kenrith's Transformation, Sakura-Tribe Elder, Ohran Frostfang,
Forgotten Ancient go out for the five bought cards).
Also out at the operator's request: Well of Lost Dreams, Blossoming Bogbeast (win condition 3 in §3 no
longer applies; the lifegain-to-cards line is covered by Trail of Crumbs on arrival). Slots filled with
Explore and Hornet Nest as placeholders until the operator names the sleeved cards.
Ash Barrens, Escape Tunnel and Nesting Grounds kept (operator): they replace three Forests (27), lands stay 33.

