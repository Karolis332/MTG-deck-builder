---
name: release-from-clean-checkout
description: "Desktop releases must be built from a clean checkout of the tagged commit (the release worktree), never from the shared working tree while other agents hold uncommitted edits; never stash another agent's files; push before tagging"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0c6f5709-7ab2-42f9-8d4a-0eba683ab9d6
  modified: 2026-09-20T15:22:32.675Z
---

On 2026-09-20 a release builder ran `npm run dist:win` in `C:\Users\QuLeR\MTG-deck-builder` while a debugger had half-finished `src/lib/deck-score-*.ts` edits (13 failing tests) in the same tree. The packaged v1.0.0-beta.3 bundled that code; it was published before anyone noticed, then drafted and rebuilt. The same builder also `git stash`-ed and popped the other agent's files to "isolate" failures, and `gh release create --target auto-improve` tagged the REMOTE tip (the version-bump commit was unpushed), so the tag pointed at a commit without the release changes.

**Why:** a Next.js standalone + Electron build compiles whatever is on disk, not what is committed; shared working trees are never clean while agents run concurrently.

**How to apply:** build every release in `C:\Users\QuLeR\MTG-deck-builder-release` (a git worktree with its own real `node_modules` — no junctions, see [[worktree-junction-wipes-node-modules]]): `git checkout --detach <release sha>`, `git status --short` empty, `npm ci`, `npm run dist:win`, then upload. Push the branch BEFORE `gh release create`, and verify the tag sha afterwards (`gh api repos/…/git/ref/tags/<tag>`). Never stash, checkout or reset files another agent is editing; if a full-suite gate fails in foreign files, report it and gate only on your own files. If tainted assets were published: `gh release edit <tag> --draft` first (removes it from the electron-updater feed and the web /download), then rebuild and `--clobber`. Related: [[desktop-release-github]], [[commit-on-test-exit-status]].
