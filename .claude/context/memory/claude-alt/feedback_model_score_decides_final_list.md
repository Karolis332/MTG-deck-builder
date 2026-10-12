---
name: model-score-decides-final-list
description: "For model-built decks, the operator's card ideas phrased as proposals go through the lab and the score decides; \"X replaced with Y\" is a decision — apply it, record the model's number (set 2026-10-08, refined the same day)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1c55ddd6-8d5c-42f9-b5b1-613f919a0ed9
  modified: 2026-10-08T16:02:00.986Z
---

Two kinds of operator messages about a model-built list:

1. **Proposal** ("I'm just proposing possible synergies", "what about Snakeskin Veil instead of Tyvar's Stand?", "Arnyn seems pretty good?") → the lab decides. Run `buy-lab.ts --swap "In=Out|…"` (300 games) or `--only "Card"` (every slot); apply only if it clears 0.25; otherwise a maybeboard row with the number and an oracle judgment.
2. **Decision** ("deadly tempest replaced with culling ritual", "yahenni replaced argentum", "deck confirmed") → apply everywhere (list, Moxfield, Desktop, guide, backups, check page) regardless of the number; still run the lab and record the delta in the guide's operator-swaps sentence. On 2026-10-08 fourteen such swaps landed at −18.8 total — the operator knew and did not ask.

**Why:** the 2026-10-08 climb rejected Meren/Reanimate/Blech and the operator set "the score decides"; later the same day he applied Blech, Culling Ritual, Dark Ritual, Insidious Roots etc. by direct instruction. The model is blind to lifegain, drain, sacrifice, free-cast and Pest mana, and its win component steps ~10 points at the T8/T9 close-turn edge, so single-slot deltas are bimodal — score a card in two or three unrelated slots before quoting a number.

**How to apply:** batch swaps that arrive one message at a time (one lab call, one list edit, one Moxfield save, one backups rebuild); a swap pulling a card out of another sleeved deck needs the ban-file line removed, the backups DONORS entry, the apply-script backfill and a named backfill for the donor. See [[deck-review-fixed-point]], [[deck-gate-before-showing-lists]], [[card-check-page-standard]].
