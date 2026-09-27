---
name: desktop-release-github
description: How the Windows desktop client is published (GitHub Releases on the public repo) and the two gotchas — asset naming vs electron-updater, and releases/latest ignoring prereleases
metadata:
  type: reference
---

Desktop releases live at https://github.com/Karolis332/MTG-deck-builder/releases (repo is public). First public build
`v1.0.0-beta.1` published 2026-09-19 from `auto-improve` (d20ddcb). Procedure: bump `package.json` version → `npm run dist:win`
(→ `dist-electron/`) → smoke `node verify-2026-09-19/electron-smoke.mjs` (fresh profile, expects the window in ~10 s) →
`cd dist-electron && gh release create vX.Y.Z --target auto-improve --prerelease --notes-file … <nsis.exe> <.blockmap> <portable.exe> <.zip> latest.yml`.
`latest.yml` on the release is the electron-updater feed (`publish: provider github` in electron-builder.yml; main.ts sets
`autoDownload=false`, `autoInstallOnAppQuit=true`).

**Why it matters:** (1) GitHub renames uploaded assets with spaces to dots, but electron-updater 6.x requests
`latest.yml.url.replace(/ /g,'-')` → 404. Fixed 2026-09-19: `artifactName` templates use `${name}` (`the-black-grimoire-…`,
8be3873); the beta.1 assets were renamed by hand to the hyphen form. (2) `GET /repos/…/releases/latest` returns 404 while every
release is a prerelease — the web `/download` page reads `/releases?per_page=5` and takes the first non-draft.
**How to apply:** never put spaces in artifact names; keep `latest.yml` in every release; verify with
`curl -sIL https://github.com/Karolis332/MTG-deck-builder/releases/download/<tag>/<latest.yml url>` → 200.
Related: [[project-theblackgrimoire-com-launch]], [[deck-gate-before-showing-lists]].
