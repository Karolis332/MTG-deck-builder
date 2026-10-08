"""Beledros guide: the operator's four between-game swaps become the list (2026-10-08):
Culling Ritual <- Deadly Tempest, Yahenni <- Argentum Masticore, Omnipresence <- Alhammarret's Archive, Saw in Half <- Warg Tactics.
Model (300 games): -3.98 / -2.01 / -0.03 / -1.05, -5.08 together — wipe/removal windows and free-cast, the model's blind spots."""
import pathlib
import re

G = pathlib.Path(".claude/skills/deck-building/reference/decks/beledros-witherbloom.md")
s = G.read_text(encoding="utf-8")


def rep(old: str, new: str) -> None:
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)


# §1 plan table + Merchant flow
rep("[[Deadly Tempest]] with your drains out, [[Liliana, Dreadhorde General]] -4. |",
    "[[Culling Ritual]] with [[Blood Artist]] or [[Zulaport Cutthroat]] out (every small creature on the table dies at once, each one drains, the mana recasts Gray Merchant), [[Liliana, Dreadhorde General]] -4. |")
rep("→ [[Vito, Thorn of the Dusk Rose]] makes one opponent lose 3X → with [[Alhammarret's Archive]] the gain is 6X → **X = 7 kills the Vito target from 40**",
    "→ [[Vito, Thorn of the Dusk Rose]] makes one opponent lose 3X (4X on that player with the Merchant's own X) → with [[Sanguine Bond]] out as well it is 7X → **X = 6 is lethal from 40 through both, X = 10 through Vito alone**")
# §2 engine table row 11 + traps
rep("| 11 | [[Alhammarret's Archive]] | \"If you would gain life, you gain twice that much life instead. / If you would draw a card except the first one you draw in each of your draw steps, draw two cards instead.\" | Doubles Vito and Sanguine Bond. Also doubles Idol, Moldervine and Liliana draws: count your library in long turns. |",
    "| 11 | [[Omnipresence]] | \"You may cast spells with mana value less than or equal to the number of creatures you control from your hand without paying their mana costs.\" | Eight mana once; with eight creatures (Pests count) every spell in hand is free — Gray Merchant, Massacre Wurm, Casualties of War. Operator's pick 2026-10-08 over the unconfirmed Archive; the model scores it flat (−0.03). |")
rep("- ❌ [[Deadly Tempest]] hits you too: \"Each player loses life equal to the number of creatures they controlled that were destroyed this way.\" Pests refund 1 each, nontoken creatures do not. Count before casting.\n",
    "- ❌ [[Culling Ritual]] destroys your own permanents with mana value 2 or less too: Pests, dorks, [[Sol Ring]], Signet, Talisman, [[Blood Artist]], [[Zulaport Cutthroat]], [[Viscera Seer]] (13 of ours). Artist and Zulaport see every simultaneous death including their own (leaves-the-battlefield look-back), so with either on board each creature destroyed drains and the mana recasts [[Gray Merchant of Asphodel]]. Without them it is a self-wipe.\n")
# §3 sourcing rows
rep("| [[Alhammarret's Archive]], [[Deadly Tempest]], [[Golgari Rot Farm]], [[Blighted Woodland]] | check the box before sleeving; the check page panel gives 3 scored backups each (Archive → [[Night's Whisper]] +0.01; Tempest → [[Golgari Charm]] +0.04; either land → a basic, +0.04 / +0.00) |",
    "| [[Golgari Rot Farm]], [[Blighted Woodland]] (Alhammarret's Archive and Deadly Tempest left the list on 2026-10-08) | check the box before sleeving; the check page panel gives 3 scored backups each (either land → a basic, +0.04 / +0.00) |")
rep("The same 2026-09-09 batch registered Alhammarret's Archive, Deadly Tempest, Golgari Rot Farm and Blighted Woodland — those four stay in the list but are unconfirmed until the Witherbloom box is checked (the check page badges them `WITHERBLOOM ?`).",
    "The same 2026-09-09 batch registered Alhammarret's Archive and Deadly Tempest (both swapped out by the operator on 2026-10-08) and Golgari Rot Farm and Blighted Woodland — the two lands stay in the list and are unconfirmed until the Witherbloom box is checked (the check page badges them `WITHERBLOOM ?`).")
# §5 mulligan hands
rep("| Swamp, Forest, [[Gray Merchant of Asphodel]], [[Massacre Wurm]], [[Mikaeus, the Unhallowed]], [[Casualties of War]], [[Deadly Tempest]] | 2 lands, nothing under 5 mana |",
    "| Swamp, Forest, [[Gray Merchant of Asphodel]], [[Massacre Wurm]], [[Mikaeus, the Unhallowed]], [[Casualties of War]], [[Culling Ritual]] | 2 lands, nothing under 4 mana |")
rep("| [[Elvish Mystic]], [[Paradise Druid]], Forest, [[Sanguine Bond]], [[Alhammarret's Archive]], [[Vito, Thorn of the Dusk Rose]], [[Plumb the Forbidden]] | 1 land; Bond and Archive do nothing without a board |",
    "| [[Elvish Mystic]], [[Paradise Druid]], Forest, [[Sanguine Bond]], [[Omnipresence]], [[Vito, Thorn of the Dusk Rose]], [[Plumb the Forbidden]] | 1 land; Bond and Omnipresence do nothing without a board |")
# §6 piloting
rep("[[Toxic Deluge]] and [[Deadly Tempest]] cost life too.", "[[Toxic Deluge]] costs life; [[Culling Ritual]] costs your own small permanents.")
rep("Pests chump; [[Massacre Wurm]] or [[Deadly Tempest]] when the drains are out |",
    "Pests chump; [[Massacre Wurm]], or [[Culling Ritual]] against a wide board of small creatures when the drains are out |")
rep("[[Vito, Thorn of the Dusk Rose]] or [[Sanguine Bond]] sends 3X (6X with [[Alhammarret's Archive]]) at one target. X = 7 is lethal from 40 through one of them.",
    "[[Vito, Thorn of the Dusk Rose]] or [[Sanguine Bond]] sends 3X at one target on top of the Merchant's X; both together 7X. X = 10 is lethal from 40 through one of them, X = 6 through both.")
rep("[[Tyvar's Stand]] and [[Warg Tactics]] mode 2 for a single piece;",
    "[[Tyvar's Stand]] for a single piece; [[Saw in Half]] in response to removal on [[Gray Merchant of Asphodel]] (two Merchants enter: two drains);")
# §8 misplays
rep("1. Casting Deadly Tempest with eight nontoken creatures and 12 life.\n",
    "1. Casting Culling Ritual with Sol Ring, the Signets and the drain creatures out but no Blood Artist or Zulaport Cutthroat to pay for it.\n")
rep("6. Letting Alhammarret's Archive double a long Plumb or Moldervine chain into an empty library.\n",
    "6. Casting Omnipresence with fewer than six creatures out: eight mana that frees nothing. Count Pests first.\n")
# §9 weak spots
rep("| Fliers over a Pest wall | Pests are 1/1 ground tokens | Warg Tactics mode 1, Feral Appetite deathtouch, Mikaeus +1/+1, Beledros blocks 4/4 in the air |",
    "| Fliers over a Pest wall | Pests are 1/1 ground tokens | Feral Appetite deathtouch, Mikaeus +1/+1, Beledros blocks 4/4 in the air |")
# §10 maybeboard: the four rows flip direction
rep("| [[Saw in Half]] | [[Warg Tactics]] | Any table. On your own [[Gray Merchant of Asphodel]] it is a death trigger plus two Merchants entering; on [[Massacre Wurm]] two sweeps; instant removal otherwise. Never on Beledros (command zone = did not die). |\n",
    "| [[Warg Tactics]] (model +1.05 back) | [[Saw in Half]] | Only if you want the mode-2 protection back; Saw in Half on your own [[Gray Merchant of Asphodel]] (death trigger plus two Merchants) is the operator's pick. Never Saw on Beledros (command zone = did not die). |\n")
rep("| [[Culling Ritual]] | [[Deadly Tempest]] | Token and dork tables. Cast it only with [[Blood Artist]] + [[Zulaport Cutthroat]] on board: every creature of ours that dies drains; the mana recasts Gray Merchant. Alone it is a self-wipe (13 of our permanents). |\n",
    "| [[Deadly Tempest]] (❓ unconfirmed; model +3.98 back, its wipe window) | [[Culling Ritual]] | Big-creature tables where nothing of theirs has mana value 2 or less. \"Each player loses life equal to the number of creatures they controlled that were destroyed this way\" — count your own. |\n")
rep("| [[Yahenni, Undying Partisan]] | [[Argentum Masticore]] | Wrath-heavy control: an indestructible sacrifice outlet keeps the drain engine through the sweep. |\n",
    "| [[Argentum Masticore]] (model +2.01 back, its removal window) | [[Yahenni, Undying Partisan]] | Tables with one big threat per turn: a repeatable destroy at upkeep. Yahenni (indestructible sacrifice outlet through wipes) is the operator's pick. |\n")
m = re.search(r"^\| \[\[Omnipresence\]\] \(loose\) \| \[\[Alhammarret's Archive\]\] \|[^\n]*\n", s, re.M)
assert m, "Omnipresence maybeboard row"
s = s[:m.start()] + "| [[Alhammarret's Archive]] (❓ unconfirmed; model +0.03 back) | [[Omnipresence]] | Long games: doubles Vito / Bond drains and every non-first draw. Out on 2026-10-08 for Omnipresence (operator). |\n" + s[m.end():]
rep("| Wrath-heavy control | Yahenni, Golgari Charm, Village Rites | Argentum Masticore, Tyvar's Stand, Feral Appetite |",
    "| Wrath-heavy control | Golgari Charm, Village Rites | Tyvar's Stand, Feral Appetite |")
rep("| Token / dork swarm | Culling Ritual, Golgari Charm | Deadly Tempest, Tyvar's Stand |",
    "| Token / dork swarm | Golgari Charm | Tyvar's Stand |")
rep("| Lifegain | Jarad, Saw in Half | Mirkwood Bats, Warg Tactics |", "| Lifegain | Jarad | Mirkwood Bats |")
rep("## 10. Maybeboard (26 cards, kept in the box) and between-game swaps", "## 10. Maybeboard (28 cards, kept in the box) and between-game swaps")
rep("The first three are upgrades the model cannot see; the rest answer a table.",
    "Operator swaps applied 2026-10-08: [[Saw in Half]], [[Culling Ritual]], [[Yahenni, Undying Partisan]] and [[Omnipresence]] are in the list (model −5.08 together at 300 games: wipe and removal windows plus free casting, all blind spots); their predecessors sit at the top of the table.")
G.write_text(s, encoding="utf-8")
print("guide: operator swaps applied in 20 places")
