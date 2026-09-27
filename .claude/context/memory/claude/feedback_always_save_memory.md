---
name: Always save memory on crash or session end
description: User explicitly requested that memory is always recorded because Claude crashed and lost context
type: feedback
---

Always record memory during sessions, especially before anything that could cause a crash or context loss. The user lost progress when Claude crashed mid-conversation.

**Why:** Claude crashed and the user lost all conversational context about what they were working on (fixing deck builder to respect collection).

**How to apply:** Proactively save memory at key milestones during work — don't wait until the end. If a task spans multiple steps, save progress incrementally.
