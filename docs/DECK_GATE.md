# Deck gate

One canonical judgment on a decklist before it reaches a human. Built after the
2026-09-18 Brawl incident ("The Emperor of Palamecia"), where a chat-built list
arrived with 12 unowned cards, seven names Arena's importer rejects, a curve that
could not trigger the commander, and hand-restored fetch lands.

The gate **judges**; it never builds.

## Run it

```bash
MTG_DB_DIR="$APPDATA/the-black-grimoire/data" \
  npx tsx scripts/deck-gate.ts <list.txt> --format brawl --owner 1
```

| Flag | Meaning |
| --- | --- |
| `--format` | `brawl`, `standardbrawl`, `commander`, `standard`, … (default `commander`) |
| `--owner <id>` | user id whose collection the deck must fit inside; omit to skip ownership |
| `--source arena\|paper` | collection source; defaults to `arena` for Arena formats |
| `--lock "Card Name"` | repeatable; a card that must be present and never cut |
| `--before a.txt --after b.txt` | compare an edit: locked cards in `a` must survive into `b` |
| `--json` | machine-readable verdict instead of the table |

Exit code is 1 when any check fails, 0 otherwise. The library entry point is
`gateDeck(text, options)` in `src/lib/deck-gate.ts`.

Callers with no access to the desktop `collection` table — the build-api service —
pass `ownedCards: string[]` instead of `ownerId`; the ownership check then runs
against that pool and never queries the DB. `POST /build` and `POST /optimize`
return the whole verdict as a `gate` field, and `/optimize` also returns
`lockedFromCuts`: cards it wanted to cut but could not, because a lock or a
commander-implied closer protects them.

## The checks

| id | What it catches |
| --- | --- |
| `size` | deck size for the format, commander/companion included |
| `singleton` | 1 copy in commander formats, 4 elsewhere; basics and "any number" cards exempt |
| `legality` | per-format legality from the DB, with the Alchemy rule below |
| `rules` | anything else `deck-validation.ts` reports (e.g. Competitive Brawl commander bans) |
| `identity` | every card inside the commander's colour identity (both faces) |
| `ownership` | every nonbasic card in the owner's collection; warns when the snapshot is over 14 days old, stating its age. `skip` when the caller gives neither `ownerId` nor `ownedCards` |
| `arenaNames` | `Front // Back` names Arena rejects; reports the corrected line |
| `lands` | effective land count vs the Karsten target from `land-math.ts`, ±2 |
| `plan` | how much of the deck can actually turn the commander on |
| `curve` | share of nonland cards below the commander's mana threshold |
| `wincons` | win conditions and commander-derived closers (`warn` < 3, `fail` < 2) |
| `locks` | locked cards present, and not cut by an edit |
| `resolution` | names the card DB does not know |

Format rules, card roles and land math are reused from `deck-validation.ts`,
`card-classifier.ts` and `land-math.ts` — the gate adds no second copy of them.

### The Alchemy rule

An Arena `A-` name is stripped for lookup, then **both** the `A-` row and the
paper row are candidates; whichever is `legal` in the requested format wins.
Arena's rebalanced printings and their paper originals disagree in the Scryfall
legality JSON (`A-Thran Portal` is `brawl: legal`, plain `Thran Portal` is not),
so checking only one row rejects cards Arena accepts.

### The plan check

The gate derives the commander's trigger condition from its oracle text — a cost
threshold ("if at least four mana was spent", "mana value 4 or greater") and a
spell type ("noncreature spell", "instant or sorcery spell") — plus the trigger
nouns of its detected synergy categories (`commander-synergy.ts`).

It then reports two numbers, because they differ and only one of them matters:

- **interact** — cards that satisfy the condition *or* name one of the trigger nouns.
- **can satisfy it** — cards that can actually meet the cost/type condition.

A deck of "spells matter" cards scores well on the first and badly on the second.
That gap is the 2026-09-18 bug. `fail` below 40 % interaction or below 35 %
enablers; `warn` below 55 % interaction or below 50 % enablers. The
non-interacting cards are listed cheapest first, so the cut list is the output.

## Adding a lock

Edit `DEFAULT_LOCKS` in `src/lib/deck-gate.ts` — a plain card name, or a
`"/regex/"` string for a family. Defaults are the fetch lands and the shock
lands. Per-run locks go through `--lock` / the `locks` option; those must also be
present in the list, not merely uncut.
