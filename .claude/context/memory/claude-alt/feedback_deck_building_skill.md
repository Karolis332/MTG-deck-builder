---
name: feedback-deck-building-skill
description: Every deck task runs through the project skill .claude/skills/deck-building (rules + LEARNINGS.md + reference/); append a learning after each deck conversation (2026-10-02)
metadata:
  type: feedback
---

The operator asked for deck-building skills that learn from each conversation. The skill lives at `.claude/skills/deck-building/`:
- `SKILL.md`: workflow and hard rules (oracle exactness, synergy density, one game plan, convergence, allocation);
- `LEARNINGS.md`: append-only operator decisions, corrections and evaluation mistakes;
- `reference/`: deep research on principles, win conditions, lines and mulligans, plus per-deck pilot guides;
- `q.py`: read-only oracle query.

**Why:** set 2026-10-02 ("write these skills and try to learn from each conversation about deck building"). The operator wants expertise in win conditions, the lines to visualise, and the hands to avoid.

**How to apply:** invoke the skill on any deck task and read LEARNINGS.md first. Whenever the operator overrides or corrects a recommendation, append a dated line to LEARNINGS.md and commit it with the work. Related: [[feedback-deck-review-fixed-point]], [[feedback-card-check-page-standard]], [[feedback-deck-gate-before-showing-lists]]
