# Command Center — deck editor pane contract

The deck editor (`src/app/deck/[id]/page.tsx`) is a 3-pane layout: **Consultant** (left),
**Deck** (center), **Analysis** (right, containing the Live Rail tile stack + Analysis Rail).

## `CommandCenterLayout`

`src/components/command-center/CommandCenterLayout.tsx`

```ts
interface CommandCenterLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftTitle?: string;
  rightTitle?: string;
  controlRef?: { current: CommandCenterPaneControls | null }; // { toggleLeft, toggleRight }
}
```

Resizable two-divider desktop grid (persisted to `localStorage` under `bg.commandCenter.v1`),
collapsing to a tab bar below the `lg` breakpoint. `controlRef` is an imperative escape hatch —
the page sets it once via `useRef` and reads `.current.toggleLeft()/.toggleRight()` from the
`[` / `]` hotkeys, since collapse state lives inside the layout component, not the page.

## `ConsultantPane`

`src/components/command-center/ConsultantPane.tsx` — stacks `ModelFeed` → `ChatSection` →
`HistorySection`. Props: `deckId`, `deck`, `collectionOnly`, `prefill` (chat prefill text, e.g.
from a tile's "ask consultant" button), `onOpenCard`, `onApplyChanges`, `onDeckChanged` (a tick
that bumps on every deck mutation, re-fetches the model feed), `onUndo` (deck editor's `undo`,
surfaced as the Undo action on apply toasts), `modelFeedHotkeyRef` (imperative `{applyAll,
dismissTop}` for the `A`/`D` hotkeys).

## Live Rail tiles

`src/components/command-center/LiveRail.tsx` renders, in order: Bracket, Score, Roles,
Benchmark, Coverage, Synergy, Curve.

| Tile | Data source | Notes |
|---|---|---|
| BracketTile | `classifyBracket()` (`lib/bracket.ts`), client-side | Bracket 2–5 target pills, also mirrored in the header command strip |
| ScoreTile | `GET /api/deck-analysis` (`analysis.overallScore/curveScore/iss`) | |
| RolesTile | `analysis.ratioHealth` | Headline: "N of M roles in range" |
| BenchmarkTile | `GET /api/decks/{id}/benchmark` | Debounced 1.5s on deck signature change; n/a outside commander/brawl formats |
| CoverageTile | `computeCoverageStats()` (`tiles/coverage-selectors.ts`), client-side | |
| SynergyTile | `analysis.topSynergyPairs` / `analysis.winPlan` | |
| CurveTile | `deck.cards` + `analysis.curveScore.notes` | |

All tiles that show a number in the headline call `useTickOnChange(value)` and apply `.hud-tick`
to flash on change — do this for any new tile's headline too.

## Events emitted to the CF bandit

Fired from existing API routes (unchanged by this pass), fire-and-forget to `/events/track` on
the CF API, always carrying `impression_id` + `source`:

| Event | Route | When |
|---|---|---|
| `suggestions_shown` | `POST /api/ai-suggest` | Model feed fetch returns suggestions |
| `card_added` / `card_removed` | `POST /api/ai-suggest/apply` | A suggestion or chat action is applied |
| `suggestion_dismissed` | `POST /api/ai-suggest/dismiss` | A model-feed card is dismissed |

## Toasts

`src/hooks/use-toast.ts` — a module-level store (not React Context: `toast()` needs to be
callable from plain event handlers, not just component bodies) read via `useSyncExternalStore`.
`toast({ title, tone?: 'ok'|'warn'|'error', ttl?, action?: { label, onClick } })`. Max 3 stacked,
rendered bottom-right by `<ToastHost />` (mounted once in `page.tsx`). Emitted on: suggestion
apply/dismiss, chat action apply, undo/redo, target-bracket change, role change, and the header's
Rebuild/Optimize action — all replacing the previous `alert()` calls.

## Hotkeys

`src/hooks/use-command-center-hotkeys.ts`. Ignored while focus is in an input/textarea/select/
contenteditable. `/` (search) and Ctrl+Z / Ctrl+Shift+Z (undo/redo) are handled elsewhere
(`DeckWorkspace` search input, `use-deck-editor.ts`'s own listener) — this hook only adds:

| Key | Action |
|---|---|
| `A` | Apply all model-feed suggestions |
| `D` | Dismiss the top model-feed suggestion |
| `Esc` | Close card zoom → card detail popout → hotkey cheat sheet, first one open wins |
| `1`–`5` | Set target bracket |
| `[` / `]` | Collapse/expand the Consultant / Analysis pane |
| `?` | Toggle the hotkey cheat sheet overlay |

## Adding a tile

1. New file under `tiles/`, default export a component taking `deck: LiveRailDeck` and/or
   `analysis?: AnalysisResponse | null` per `tiles/types.ts`.
2. Wrap the headline value in `useTickOnChange()` and apply `.hud-tick` on change.
3. Round every displayed number before rendering — integers for %, counts, indices; one decimal
   only where genuinely sub-integer (e.g. avg CMC).
4. Wrap the body in `<TileFrame title="..." headline={...}>`.
5. Add it to `LiveRail.tsx`'s render list.
