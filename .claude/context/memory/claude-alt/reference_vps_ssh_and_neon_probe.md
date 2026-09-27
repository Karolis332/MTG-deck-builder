---
name: reference-vps-ssh-and-neon-probe
description: "How to reach the VPS from this machine (non-default SSH key, no ssh config) and how to run one-off Neon DB scripts for the web app without leaking the connection string"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a596401d-6761-4518-aa45-89812eab6193
  modified: 2026-09-18T17:34:28.623Z
---

- VPS `root@187.77.110.100` accepts only `~/.ssh/id_ed25519_geo_vps` (also a copy named `geo-scraper-vps`). There is no `~/.ssh/config`, so a bare `ssh root@187.77.110.100` tries the default key names and fails with "Permission denied (publickey,password)". Always pass `-i ~/.ssh/id_ed25519_geo_vps` (DEPLOY.md in black-grimoire-web already does).
- One-off Neon queries for theblackgrimoire.com: copy the script to the VPS and run it there as `cd /opt/black-grimoire-web && NODE_PATH=/opt/black-grimoire-web/node_modules node --env-file=.env.local /tmp/<script>.cjs` — `/tmp` cannot resolve `@neondatabase/serverless` without `NODE_PATH`, and `--env-file` avoids echoing `DATABASE_URL` (a 2026-09-18 probe once leaked the password by parsing `.env.local` by hand). Print ids/names/counts only; pipe through `sed -E 's#postgres(ql)?://[^ ]+#<db-url>#g'`. Atomic rewrites go through `sql.transaction([...])` mirroring `PUT /api/decks/[id]`. Templates: MTG-deck-builder `verify-2026-09-18/deck-probe.cjs`, `deck-update.cjs`.
- Web deploy = commit first (the procedure archives `HEAD`), then the DEPLOY.md one-liner; `rm -rf .next` on the box is required because a Turbopack dev `.next` breaks `next build`.

Related: [[project-theblackgrimoire-com-launch]], [[feedback-background-workers-hazards]].
