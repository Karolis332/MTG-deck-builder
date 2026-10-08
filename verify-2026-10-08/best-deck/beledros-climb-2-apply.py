"""Beledros climb 2 (2026-10-08): the model rejected Vilis / Meren / Reanimate / Blech and put Blooming Marsh in for Vilis.
Rewrites the guide around that result, logs the operator's rule (the score decides) in LEARNINGS and memory."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
G = ROOT / ".claude/skills/deck-building/reference/decks/beledros-witherbloom.md"
s = G.read_text(encoding="utf-8")


def rep(old: str, new: str) -> None:
    global s
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new)


# §1: Vilis sentence out
rep("or by a pumped alpha strike ([[Thunderfoot Baloth]]). [[Vilis, Broker of Blood]] turns Beledros' untap into a refill: pay 10 life = draw 10. No infinite combo: the deck wins by never running out of deaths.",
    "or by a pumped alpha strike ([[Thunderfoot Baloth]]). No infinite combo: the deck wins by never running out of deaths.")
# win-line row 5 (Vilis) out
rep('\n| 5 | Vilis refill | Vilis: "Whenever you lose life, draw that many cards." Beledros: "Pay 10 life: Untap all lands you control." Together: draw 10 and untap every land, then cast the hand. Vilis\'s "{B}, Pay 2 life: Target creature gets -1/-1" on your own Pest is a death trigger plus two cards. |', "")
# Vilis flow out
rep("\n=> [[Vilis, Broker of Blood]] in play → Beledros: pay 10 life, untap all lands → draw 10 → cast [[Gray Merchant of Asphodel]] and the drains with the untapped lands → Merchant refunds the 10 life → **a Necropotence turn, every turn**\n", "\n")
# engine row 13 out
rep('| 13 | [[Vilis, Broker of Blood]] | "Whenever you lose life, draw that many cards. (Damage causes loss of life.)" | Pay 10 to Beledros only with Vilis out and a drain to refund it; [[Alhammarret\'s Archive]] doubles it to 20 cards — count the library. Each Pest you shrink with "{B}, Pay 2 life" is a drain trigger and two cards. Combat damage and [[Phyrexian Arena]] draw too. |\n', "")
# maybeboard
rep("## 8. Maybeboard (19 cards, kept in the box) and between-game swaps", "## 8. Maybeboard (22 cards, kept in the box) and between-game swaps")
rep("All free after Meren is dismantled (Meren leftovers), except where noted. Swaps happen between games, never mid-game. The first three are upgrades the model cannot see; the rest answer a table.",
    "All free after Meren is dismantled (Meren leftovers), except where noted. Swaps happen between games, never mid-game. The first three are upgrades the model cannot see; the rest answer a table. "
    "**Operator rule (2026-10-08): the model's score decides the final 99; proposed synergies live here until a climb accepts them.** "
    "The 2026-10-08 climb (`verify-2026-10-08/best-deck/beledros-climb-2.ndjson`, 1,646 evaluations, converged) rejected every card in the last block and put [[Blooming Marsh]] in the 99 instead.")
rep('| [[Reanimate]] (2 owned, one in Meren) | [[Feral Appetite]] | Any table once something has died: "Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to that card\'s mana value" — any graveyard, so an opponent\'s dead fatty too. On [[Vilis, Broker of Blood]] the 8 life lost is 8 cards (Vilis is on the battlefield before the loss). The deck has no self-mill or discard, so the target must have died first: a wiped Wurm, Merchant or Vilis back for {B}. |',
    '| [[Reanimate]] (2 owned, one in Meren; model-neutral, rejected by the climb) | [[Feral Appetite]] | Any table once something has died: "Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to that card\'s mana value" — any graveyard, so an opponent\'s dead fatty too. The deck has no self-mill or discard, so the target must have died first: a wiped Wurm or Merchant back for {B}. |')
rep("| [[Blossoming Bogbeast]] (cut for Vilis) | [[Vilis, Broker of Blood]] | Tables with no removal where the alpha is the plan: attack, gain 2, X = life gained this turn, team +X/+X trample — six Pests at +8/+8 after sacrificing before combat. |",
    "| [[Blossoming Bogbeast]] (cut by the climb for a land) | [[Blooming Marsh]] | Tables with no removal where the alpha is the plan: attack, gain 2, X = life gained this turn, team +X/+X trample — six Pests at +8/+8 after sacrificing before combat. |\n"
    '| [[Vilis, Broker of Blood]] (loose, registered 2026-10-08; climb −4.2: a window overflow the model cannot value) | [[Blooming Marsh]] | Beledros "Pay 10 life: Untap all lands you control" + Vilis "Whenever you lose life, draw that many cards" = draw 10 and untap; "{B}, Pay 2 life: -1/-1" on your own Pest is a drain trigger and two cards; [[Alhammarret\'s Archive]] doubles to 20. Slow tables with a drain to refund the life. |\n'
    '| [[Meren of Clan Nel Toth]] (loose once her deck is dismantled; model-neutral, rejected) | [[Veinwitch Coven]] | "Whenever another creature you control dies, you get an experience counter" — four Pests a round = four counters; the end step returns Merchant (5) or Wurm (6) from the second end step on. Sacrifice Merchant to Altar in main 2, Meren returns him: a drain every turn. |\n'
    '| [[Blech, Loafing Pest]] (loose, registered 2026-10-08; model-neutral, rejected) | [[Pest Rescuer]] | "Whenever you gain life, put a +1/+1 counter on each Pest, Bat, Insect, Snake, and Spider you control" — every Pest death grows the swarm. ⚠️ Pests with counters lose Mikaeus undying (CR 702.93a). Alpha tables. |')
G.write_text(s, encoding="utf-8")

L = ROOT / ".claude/skills/deck-building/LEARNINGS.md"
L.write_text(L.read_text(encoding="utf-8").rstrip("\n") + "\n- 2026-10-08 — Beledros — operator rule: \"I'm just proposing possible synergies, the score decides the final state\" → never hand-apply a judgment swap to a model-built list; run the climb with the proposals in the pool (other decks banned, locks kept) and apply its converged output; proposals the model rejects go to the maybeboard with the climb's number. Say plainly when the model is blind to a card (Deck Score flat), but the list still follows the score.\n", encoding="utf-8")

MEM = pathlib.Path(r"C:\Users\QuLeR\.claude-alt\projects\C--Users-QuLeR-MTG-deck-builder\memory")
(MEM / "feedback_model_score_decides_final_list.md").write_text("""---
name: model-score-decides-final-list
description: For model-built decks (best-deck climb / lab), the operator's card ideas are proposals; the climb's converged objective decides the final 99 (set 2026-10-08)
metadata:
  type: feedback
---

The operator proposes synergies ("I'm just proposing possible synergies, but the score needs to decide the final state"); the model-lab climb decides what enters a model-built list.

**Why:** on 2026-10-08 I hand-applied Vilis into the Beledros list on judgment (the lab was blind to it: Deck Score flat, window penalty only). The operator then proposed Meren, Reanimate and Blech and set the rule. The climb (other decks banned, Ashnod's Altar locked) rejected all of them and replaced Vilis with Blooming Marsh (96.8 → 101.0, converged after 1,646 evaluations).

**How to apply:** register the operator's cards first (collection.txt + paper-sync; the lab re-reads ownership on file mtime), then run `/api/climb` with the proposals in the pool, cards locked in other decks banned (Meren's deck excluded while it is being dismantled) and the refuter locks/bans kept; apply the converged output verbatim; put rejected proposals in the guide's maybeboard with the climb's number; say plainly when the model is blind to a card, but do not override it. Judgment swaps are for lists the operator built by hand, not for model-built lists. See [[deck-review-fixed-point]] and [[deck-gate-before-showing-lists]].
""", encoding="utf-8")
idx = MEM / "MEMORY.md"
idx.write_text(idx.read_text(encoding="utf-8").rstrip("\n") + "\n- [Model score decides the final list](feedback_model_score_decides_final_list.md) — operator ideas are proposals; run the climb with them in the pool and apply its converged output; rejected ones go to the maybeboard (2026-10-08)\n", encoding="utf-8")
print("guide, LEARNINGS, memory updated")
