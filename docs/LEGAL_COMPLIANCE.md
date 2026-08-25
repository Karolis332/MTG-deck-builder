# Legal Compliance — The Black Grimoire

*2026-08-25. From primary-source research (WotC Fan Content Policy fetched directly; Scryfall
terms via verbatim cached snippets; GDPR/CJEU case law). NOT legal advice — the four items in
§5 need an EU/Lithuania-qualified lawyer before launch scales.*

## 1. Decisions TAKEN (implemented 2026-08-25)

- **Moxfield decks removed from the public catalogue** (VPS deck_catalog router:
  `source != 'moxfield'` on list + detail). Their ToS prohibits scraping; public
  *republication* was our highest-risk surface. Corpus still used for ML training
  (materially different risk profile). Catalogue now serves Archidekt (1.36M decks) with
  attribution. **Reversal path: written permission via support@moxfield.com.**
- **`catalog_exclusions` table** (Postgres): deck-level removal mechanism honored by every
  public query — the GDPR Art. 21 objection baseline. Process a request:
  `INSERT INTO catalog_exclusions (deck_id, reason) VALUES (<id>, 'author request <date>');`
- Web footer gets the FCP notice + non-affiliation + trademark lines (§3), and deck detail
  pages get a "Deck owner? Request removal" link.

## 2. Product-design constraints (bake into P4 payments — do not violate)

- **WotC FCP "free means free"**: card names/oracle text/images and basic deck
  viewing/building must NEVER sit behind a paywall, registration wall, or survey wall.
  Paid tiers sell OUR software value only: AI analysis, ISS/win-plan intelligence, build
  service capacity, collection tools, hosting/sync. This is the exact structure every
  comparable product uses (Untapped, Moxfield, AetherHub) — standard practice, no
  enforcement precedent against it.
- **Scryfall**: same no-paywall rule for their data/images, plus "your software must create
  additional value" (we clearly do), image-handling rules (no cropping artist/©, no
  distortion, no watermarks over cards), accurate User-Agent on api.scryfall.com calls.
- **⚠️ Paid one-off Deck Doctor reports are closer to the FCP line than subscriptions**
  (a for-money artifact substantially *about* WotC IP). Lawyer question before building —
  §5.4. Subscriptions gating our features are the safe structure.

## 3. Required notices (verbatim — add to web footer, desktop about, store listings)

> The Black Grimoire is unofficial Fan Content permitted under the Fan Content Policy.
> Not approved/endorsed by Wizards. Portions of the materials used are property of
> Wizards of the Coast. ©Wizards of the Coast LLC.

> This app is not affiliated with, endorsed, sponsored, or specifically approved by
> Wizards of the Coast LLC. "Magic: The Gathering", "MTG", and related marks are
> trademarks of Wizards of the Coast LLC and are used for identification and
> descriptive purposes only.

Never use WotC logos, the card back, or the planeswalker symbol. Text references only.

## 4. GDPR (we are an EU controller — Lithuania)

Scraped author usernames ARE personal data (Art. 4(1); pseudonyms count — CJEU
*EDPS v SRB* 2025). Lawful basis: legitimate interest (Art. 6(1)(f)) with the 3-part test
documented. Obligations, all pre-launch:
- Privacy policy section naming: data categories (usernames, decklists, like counts),
  purpose (attributed community catalogue), basis (legitimate interest), source platforms,
  and rights (object Art. 21 / erase Art. 17) with the removal contact.
- Working removal flow (catalog_exclusions + monitored contact) — exists, keep honoring.
- We have no author-profile pages (good — don't add them without the lawyer's read).
- Weakest prong is *necessity* of showing full usernames; if challenged, fallback design:
  usernames on click-through only, or initials + source link.

## 5. Lawyer-required items (EU/LT, IP + GDPR) — before launch scales

1. Moxfield ToS-as-contract exposure for the period we DID republish + the training-use
   posture (*Ryanair v PR Aviation*: ToS enforceable even without IP rights).
2. Legitimate-interest sign-off for username republication (the necessity prong).
3. EU sui generis database right: confirm domicile/hosting of Archidekt, EDHREC,
   MTGGoldfish, MTGTop8 — if any is EU-exposed, full-list republication vs derived-stats
   needs a call (Directive 96/9/EC; *BHB v William Hill* line).
4. Paid one-off analysis reports vs FCP "free" (§2 ⚠️).

## 6. Remaining checklist (standard practice, no lawyer needed)

- [ ] FCP notice + trademark lines in web footer (dispatched), desktop about page, store listings (at P0/P2).
- [ ] Privacy policy incl. §4 content + Arena Player.log disclosure (local-only parsing; WotC's own "Detailed Logs (Plugin Support)" opt-in is the sanctioned mechanism — same pattern as Untapped/17Lands; product risk: WotC broke it once in 2019, monitor).
- [ ] Human verification of: moxfield.com/help/terms + archidekt.com/terms verbatim text, scryfall.com/docs/api/images hotlinking clause (all 403'd automated fetch).
- [ ] Verify Scryfall User-Agent is set in scryfall.ts + update-card-data.ts fetches.
- [ ] Internal note documenting the free-tier audit at P4 (which screens gate what).

Game Changers display: factual rules data, covered by the FCP notice — no action.
