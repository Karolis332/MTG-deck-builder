---
name: project-paid-tier-stripe
description: theblackgrimoire.com Claude quota tier + Stripe billing deployed 2026-10-12 on Stripe TEST keys; live switch pending operator; prod E2E method via Clerk sign-in token
metadata:
  node_type: memory
  type: project
  originSessionId: 5e9a99de-b2fa-445d-922f-131b02b695f6
  modified: 2026-10-12T06:55:46.875Z
---

Paid tier deployed to prod 2026-10-12 (black-grimoire-web bf0b69e, 72fe8eb, ecc6e5f on branch `feat/claude-paid-tier`, not pushed): consults on `claude-opus-5` up to Free 5 / Pro 50 / Commander 150 per cycle (resets on the 4th, with the Max-plan $100 API credit), then OpenAI. VPS env has `ANTHROPIC_API_KEY`, `CLAUDE_MONTHLY_BUDGET_USD=90` and the **Stripe sandbox** keys (backup `.env.local.bak-2026-10-12-stripe-test`).

**Why:** operator decision 2026-10-11: quota, not paywall; every feature stays free.

**How to apply:**
- Until the operator activates live Stripe (`acct_1UPcAvFhYSvKrIj4`) and sets the Terms/Privacy URLs, a 4242 test card grants Pro. After activation: live prices + webhook (checkout.session.completed, customer.subscription.created/updated/deleted) + portal, swap the 4 `STRIPE_*` vars, set `STRIPE_TOS_CONSENT=1`. Never handle `sk_live` in chat.
- Prod E2E without the operator's password: on the VPS (env sourced, never printed), Clerk Backend API `POST /v1/users` (`skip_password_requirement`) + `POST /v1/sign_in_tokens` → open `/sign-in?__clerk_ticket=<token>` in Playwright. Delete the Clerk user + Neon `users` row (ai_usage cascades) + sandbox customer afterwards.
- The Stripe CLI shows its default profile's account name ("Vitals sandbox") even with `--api-key`; destructive commands need `--confirm`; use `MSYS_NO_PATHCONV=1`.
- Related: [[theblackgrimoire-com-launch]], [[reference-vps-ssh-and-neon-probe]].
