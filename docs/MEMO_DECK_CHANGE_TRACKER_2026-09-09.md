# Memo — bring the paper deck change tracker and the "what about X?" chat into The Black Grimoire

Date: 2026-09-09. Author: Fable (session with the operator). Status: proposal, not started.

## 1. What the operator liked, in one paragraph

Over two days the paper-deck scripts turned into a workflow the operator called out as the thing he
wants in the product: every physical deck is a versioned list; every change is a dated diff line;
the collection knows which cards are open and which are spoken for; a plan page argues each swap
with corpus numbers (inclusion, lift, CF rank, role band, curve bucket); and the conversation is
"what about Decorum Dissertation?" → a verdict with numbers → the list, the plan page, the visual
page and the ManaBox export regenerate in one step. Nothing in that loop is desktop-app UI today;
it lives in `scripts/` and `decks/paper/`.

## 2. What exists already (reuse, do not rebuild)

| Piece | Where | State |
|---|---|---|
| Versioned decklists | `deck_versions` table (migration `add_deck_versions`), `createVersionSnapshot()` in `src/lib/db.ts`, `HistorySection.tsx` in the consultant pane | snapshots exist, no diff view, no reasons |
| Physical register + diff log | `scripts/paper-sync.ts` → decks `built_by='paper'`, `decks/paper/HISTORY.md` | scripts only |
| Open-card pool and single-copy claims | `scripts/paper-sync.ts` (`open-cards.txt`), `scripts/deck-edit-plan.ts` (claims pass, cuts free copies), `scripts/paper-pool.ts` | scripts only |
| Argued swap plan | `scripts/deck-edit-plan.ts` → `edit-plan.html` (corpus inclusion + lift from `data/corpus-stats.json`, CF `/recommend` ranks, role bands, curve, colour sources) | scripts only |
| Visual list with sleeving ticks | `scripts/deck-view.ts` | scripts only |
| Corpus numbers in the app | `commander_card_stats` (top-300 per commander, `lift` since dd93e8c), CF API `/commander-stats`, `/commander-top-decks` | in app, desktop and VPS |
| Chat with actions | consultant pane: `ChatSection.tsx`, `chatActionCards.ts`, `SuggestionCard.tsx` (chat actions render as cards since c81691d) | in app |
| Apply a swap set | `POST /api/decks/[id]/optimize-apply` (T10 A) creates an "(Optimized)" deck | in app |
| Power level with credit | `PowerLevelTile.tsx`, `GET /api/decks/[id]/power-level` | in app |
| Web | `/optimizer` (cuts/adds), `/api/decks` (My Decks), Clerk accounts | live |

## 3. Gaps the product does not cover

1. **Change history is invisible.** Snapshots exist but the editor never shows "v13 → v14: −Boros Charm" or why.
2. **No proposal state.** A deck is either saved or not. The paper flow needs three states per deck:
   sleeved (what is in the box), proposed (what the model or the operator wants), and the diff between them.
3. **Collection is not a constraint across decks.** The app checks ownership per deck; it does not know
   that Mirkwood Bats is sleeved in Meren and therefore not free for Imotekh, nor that the Meren plan cuts it.
4. **Chat cannot evaluate a named card.** "What about X?" is answered by a general LLM reply without the
   corpus row, the role it would fill, the slot it would take, or a one-click apply.
5. **No ManaBox / paper export with set codes**, no printable visual list.

## 4. Proposal — five vertical slices, each shippable alone

### Slice A — Deck timeline (desktop)
- Derive diffs from `deck_versions` (no new table): `GET /api/decks/[id]/versions?diff=1` returns
  `[{version, created_at, reason, added[], removed[]}]`.
- `HistorySection.tsx` renders one line per version in the HISTORY.md shape
  ("v14, 100 cards: −Boros Charm"), expandable to the full diff, with "restore this version".
- Snapshot `reason` gets a short free text (today it is `import` / `batch_import`); chat-applied swaps write
  the argument as the reason so the timeline carries the why.

### Slice B — Proposal vs sleeved (desktop)
- Add `decks.state` (`'sleeved' | 'proposed'`) and `decks.parent_deck_id` (migration). A proposal is a
  child deck; the editor shows a "Changes vs sleeved" strip = the diff, with tick boxes that persist
  (`deck_cards.sleeved_at`), exactly the `deck-view.ts` page.
- "Mark as sleeved" promotes the proposal: parent gets a version snapshot, child is deleted.

### Slice C — Collection claims (desktop)
- `collection.claimed_by_deck_id` computed view: owned quantity minus copies in sleeved decks minus copies
  in proposals, so the editor and the chat both know a card is "in Meren, cut by the Meren plan, free".
- The optimizer (`optimize-apply`) and auto-build read the free pool, not raw ownership.

### Slice D — "What about X?" chat action (desktop, then web)
- Intent parser in `chatActionCards.ts`: a message that names a card the deck does not contain → run
  `evaluateCardForDeck(deckId, cardName)` (new pure function in `src/lib/`): corpus inclusion + lift for
  this commander from `commander_card_stats`, role via `classifyCard`, curve bucket delta, colour pips,
  the weakest current card in the same role (the slot), owned/free status from Slice C, power-level delta.
- Render as a `SuggestionCard` with **Apply swap** (writes a version with the argument as reason, Slice A)
  and **Reject**. The LLM writes the prose; the numbers come from the engine, never from the model.
- Web: the same evaluator behind `/optimizer` as a chat box; this is the paid "AI credits" surface from
  `docs/REFERENCE_SITES_2026-09-09.md` (DeckCheck model: free analyses, then credits; Codex Astra or
  Claude behind it).

### Slice E — Paper export
- `GET /api/decks/[id]/export?format=manabox` (Commander / Deck sections, optional set codes) and a
  print view of the visual list. Replaces the Desktop `new lists/*.txt` hand-off.

## 5. Order and effort

| Slice | Depends on | Effort | Gate |
|---|---|---|---|
| A timeline | — | 1 day | Playwright: three versions show three lines with correct diffs |
| D chat evaluator (desktop) | A for the reason field | 2 days | 20 named cards from the paper sessions reproduce today's verdicts (Decorum, Crystal, Mire, Harvest in; Diamond, Sword of the Animist, Mikaeus-for-Imotekh out) |
| C claims | — | 1 day | Mirkwood Bats case: shows "in Meren, freed by Meren plan" |
| B proposal state | A | 1.5 days | promote a proposal, timeline shows one version with the diff |
| E export | — | 0.5 day | ManaBox import of the file scans 100/100 |
| D on the web | D desktop | 1.5 days | credits deducted, rate-limited, evidence in `verify-*/` |

Implementation on Sonnet, review fresh-context Opus, harness untouched (none of this calls `autoBuildDeck`).

## 6. Risks and rules

- The corpus is thin for new cards (Decorum, Ominous Harvest at <1 %). The evaluator must say "new card,
  corpus not informative" rather than score it low; the LLM argument carries those cases.
- The optimizer's synergy taxonomy has no model of artifact recursion (Imotekh reads as 16 win conditions).
  Show the corpus columns first, the optimizer score last, and label it.
- Life-budget, combo-piece and "does this fuel Colossus" reasoning is LLM judgment; keep the numbers and
  the prose visibly separate so a wrong argument never looks like data.
- Single copies: never propose a card into two decks; a swap that frees a card must free it for the others.
- Paper register stays authoritative for physical decks until Slice B ships; `scripts/paper-sync.ts` remains
  the import path.

## 7. Success criteria

The operator can open Imotekh in the editor, see the sleeved list, the powerhouse proposal and the diff,
type "what about Charcoal Diamond?", get the corpus row, the slot it would take and a verdict, click Apply
or not, and print a ManaBox list, without leaving the app or asking an agent.
