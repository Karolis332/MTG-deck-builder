---
name: feedback-deck-gate-before-showing-lists
description: "Every decklist produced for the operator (chat, builder, optimizer) must pass scripts/deck-gate.ts against the live DB before it is shown; ownership, Arena names, commander plan and operator locks are the checks that failed on 2026-09-18"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a596401d-6761-4518-aa45-89812eab6193
  modified: 2026-09-18T18:52:48.832Z
---

On 2026-09-18 a chat-built Brawl deck reached the operator with 12 cards not in their Arena collection, seven `Front // Back` names Arena rejects, a plan where most nonland cards never triggered the commander, and cuts of cards the operator considers locked (fetch lands, Coastal Piracy). The operator's response: "we need to construct a harness for the model to build proper decks."

**Why:** corpus popularity and card-DB legality are not enough; a list is only "proper" if the operator owns it, Arena imports it, and it plays the commander's text.

**How to apply:** before presenting any list, run
`MTG_DB_DIR="$APPDATA/the-black-grimoire/data" npx tsx scripts/deck-gate.ts <list.txt> --format <fmt> --owner 1 [--before <old.txt> --after <new.txt>]`
(commit `86b00da` on `auto-improve`, docs in `docs/DECK_GATE.md`). Show the verdict table with the list; a FAIL is not deliverable. Ask the operator for locks up front (their default set: fetch lands, shock lands, and whatever they name). Check the collection age it prints; if over 14 days, say so and ask them to relaunch Arena so `Player.log` gets a `GetPlayerCardsV3` sync, then run `verify-2026-09-18/reimport-arena-collection.ts`. Print A-cards as `A-Name` for Arena. Related: [[feedback-never-prefilter-agent-input]], [[project-arena-brawl-pool-ground-truth]].
