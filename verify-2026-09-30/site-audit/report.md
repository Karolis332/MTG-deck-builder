# theblackgrimoire.com — functional audit 2026-09-30

Verdict: 58 functions checked — 51 PASS, 3 WARN, 2 FAIL, 5 untestable (sonnet agent `site-audit`, Playwright desktop 1440×900 +
mobile 390×844; page captures in `shots/`). The agent could not write files; this summary was written from its replies.

## FAIL
1. **Builder deck budget not enforced.** `/builder` → Niv-Mizzet Reborn, deck budget $150, bracket 2 → "Deck price $331.48 ·
   62 unpriced · budget $150 · Swapped for budget/bracket (56)", no warning (`shots/niv-build-text.txt`). Bracket target held
   (no game changers). Root cause under investigation (`site-debug`): 62 unpriced of 100 is abnormal — the 09-27 VPS card
   refresh is the first suspect.
2. **Optimizer ships a 92-card list.** Pasting the legal 100-card Arena Tam (`../arena-tam/final.txt`, Brawl) pre-selects 8 cuts
   and 0 adds (only 4 land adds offered) → "Optimized list 92 cards"; the page's own deck gate then says "require exactly 100
   cards (currently 92)" (`shots/optimizer-tam-text.txt`).

   The page's "CARDS 100" is the pasted list; the gate and "Optimized list · 92 cards · Copy for Arena" are the suggested
   list. The agent later called this a labelling WARN; kept as FAIL here because the copyable suggested list is illegal.
   The 8 cuts: Jace, Multiverse Architect (false illegal), All Will Be One, Oath of Teferi, Bloodthirsty Conqueror,
   Way of the Wildspeaker, Dovin, Hand of Control, Marauding Blight-Priest, Pia, Aether Ascetic.

Budget detail from the agent: `applyDeckBudget()` marks a card `stuck` when no cheaper same-role candidate exists and the loop
can exit over budget with no user-facing notice; Niv-Mizzet kept Mana Confluence ($34.46), Gemstone Caverns ($62.00), 4 fetches.
Build times: Edgar ~58 s, Krenko ~45 s, Niv-Mizzet ~100 s.

## WARN
1. FAQ bracket sentence stale: "The builder targets bracket 2 through 5 depending on the power level you request, and checks
   the finished list against the official criteria for that bracket." — power level and bracket are independent controls.
2. Weak / fake-fixing lands in every build (Multiversal Passage, Thran Portal, A-Thran Portal in mono-red Krenko, Gemstone
   Caverns) — the landbase fix (U1–U3, `hotfix/builder-plan-2026-09-26`) targets this.
3. No Content-Security-Policy header (HSTS, X-Frame-Options, X-Content-Type-Options present).

## Also seen on the optimizer page (Arena Tam) — model quality
- "Jace, Multiverse Architect: not legal in brawl" — false (Scryfall brawl legal); the VPS card DB is older than today's local
  refresh. It makes the Deck Score read 19/100 "Not a legal deck".
- Three land targets on one page: header 36 → 40, gate "Karsten wants 39 ±2", adds "recommended 38".
- Superfriends plan not understood: Commander Synergy 0/5–10, Card Draw 20/8–12 (walkers counted as draw), cuts proposed are
  engine pieces (Oath of Teferi, Way of the Wildspeaker, Pia, Dovin, All Will Be One).

## PASS (summary)
All pages 200 with no console errors (home, builder, optimizer, commanders index + detail + brawl sub-page, decks,
collection, favorites, download, faq, methodology, about, support, contact, privacy, terms, sign-in, sign-up); mobile layouts
without overflow; dashboard routes 307 → sign-in when signed out; `/api/decks` 401 unauthenticated; POST-only APIs 405 on GET
without stack traces; collection paste import parses; contact form blocks an empty submit (not submitted by design);
`/download` 3 links resolve and all 3 SHA-256 values match the GitHub digests; sitemap 514 URLs (sample 200); robots.txt
correct; TLS valid to 2026-12-05. Builds: Edgar Markov (WBR) and Krenko (Brawl) 100 cards, singleton, 6/6 sampled cards
inside identity and legal per Scryfall.

## Untestable (5)
Collection file upload (native OS picker), signed-in dashboard/decks/match sync (no session), payments/donate and feedback
submission (excluded by design).
