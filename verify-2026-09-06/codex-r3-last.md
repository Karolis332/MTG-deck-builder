Committed as `6ff5189`; not pushed.

Redesigned the landing page with the screenshot hero, stats, callouts, linked features, timeline, mana pips and supporters. Added Commanders navigation and gated Sign in.

Verification:

- Build passed.
- HTTP assertions passed: H1, five JSON-LD nodes, screenshot, no Sign in; supporters on `/support`.
- Responsive and supporter-state checks passed; server stopped.
- Changed files lint clean. Repository lint retains one existing dashboard warning.

Caveats: `/commanders` currently returns 404. Callouts label visible screenshot elements; role counts and per-card reasons aren’t pictured.