---
name: project_all_repos_graphified
description: All 10 QuLeR projects have graphify knowledge graphs + CLAUDE.md sections (built 2026-06-17)
metadata: 
  node_type: memory
  type: project
  originSessionId: bf746aee-4d72-4c7a-8588-0e9658a5123b
---

All of QuLeR's projects were graphified on 2026-06-17 — each has a persistent knowledge graph at `<repo>/graphify-out/` (`graph.json`, `graph.html`, `GRAPH_REPORT.md`) and a `## graphify` section in its `CLAUDE.md` telling future sessions to query the graph instead of cold-grepping.

**Why:** User adopted graphify across the board (cost no object) so every project has a queryable map.

**Final graph sizes (nodes/edges/communities):**
- grimoire-cf-api 602/1001/46 · MTG-deck-builder 1798/3893/109 · geo-scraper 1480/3150/76 · side-hustle 1171/2293/89
- ai-recruiter-mvp 61/66/30 · language-tutor 65/56/29 · quiz-funnel 49/45/25 · shorts-generator 52/99/12 · black-grimoire-web 46/48/20 · freelance 176/69/135 (content repo — loose concept graph by design)

**How to apply:**
- Query before answering architecture questions in any repo: `/graphify query "<question>"` (run from that repo).
- Refresh after code changes: `/graphify . --update` (code-only changes are AST-only = free/no-LLM).
- Large code repos (MTG-deck-builder, geo-scraper, side-hustle) needed **full chunked semantic** extraction to connect properly — graphify's AST edge extraction is weak for TypeScript (strong for Python), so docs-only mode left them fragmented; the chunked-agent re-run fixed it.
- Pitfall fixed: graphify's AST `extract()` uses a Windows process pool — any driver script calling it MUST have an `if __name__ == '__main__':` guard or it spawn-loops.
- See [[project_cf_api_graphify_graph]] for the CF-engine-specific god nodes.
