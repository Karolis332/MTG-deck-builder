---
name: feedback-no-git-stash-shared-repos
description: Never git stash/checkout/reset in shared trees or the VPS repos; a stash reset run-pipeline.sh to mode 0644 and would have broken the 22:00 cron
metadata:
  node_type: memory
  type: feedback
  originSessionId: 11d220af-9960-4663-be00-7f202e55667e
  modified: 2026-09-27T12:43:30.856Z
---

Agents must never run `git stash`, `git checkout -- <file>` or `git reset` in a shared working tree (this repo, `/opt/grimoire-cf-api`, `/opt/grimoire-build-api`). Commit with pathspecs instead: `git commit -- <files>`.

**Why:** on 2026-09-27 a builder's `git stash` in `/opt/grimoire-cf-api` restored `run-pipeline.sh` from the index, where it was recorded as 100644. That stripped the exec bit, and the 22:00 cron (`run-pipeline.sh` spawned directly) would have failed silently. The fix was to chmod 755 and commit the file as mode 100755. A pathspec commit also swept in unrelated staged content and had to be amended.

**How to apply:** put this ban in every VPS or shared-tree brief. After any git operation on the VPS, check `git ls-files -s ops/*.sh run-*.sh | grep -v 100755` for the cron scripts. Related: [[feedback-background-workers-hazards]], [[feedback-release-from-clean-checkout]].
