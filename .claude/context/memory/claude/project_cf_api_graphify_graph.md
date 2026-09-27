---
name: project_cf_api_graphify_graph
description: grimoire-cf-api has a graphify knowledge graph; use it before grepping the CF engine cold
metadata: 
  node_type: memory
  type: project
  originSessionId: bf746aee-4d72-4c7a-8588-0e9658a5123b
---

The `grimoire-cf-api` repo now has a **graphify knowledge graph** at `C:/Users/QuLeR/grimoire-cf-api/graphify-out/` (`graph.json`, `graph.html`, `GRAPH_REPORT.md`). Built 2026-06-17 from 52 files → 602 nodes / 1001 edges / 46 communities (6.7x token reduction per query).

**Why:** User explicitly adopted graphify (the `/graphify` skill) to give Claude a persistent map of the recommendation engine instead of cold-grepping every session — prompted while benchmarking the CF model.

**How to apply:** Before answering CF-engine architecture questions, query the graph: `/graphify query "<question>"` (run from the cf-api dir). After code changes there, refresh with `/graphify . --update` (code-only changes skip the LLM/AST-only). God nodes: `CFEngine` (deg 39), `get_settings`, `MoxfieldScraper`/`ArchidektScraper`, `VWEngine`, `BootstrapTrainer`, `BaseScraper`. The eval harness lives at `scripts/evaluate.py` — see [[project_collection_table_unreliable]] is unrelated; this is the CF model work. Consider `graphify claude install` in that repo to auto-load the graph each session.
