## §10.4 gaming probes — brawl training stride (1141 fully resolved lists)

Allowance for the WHOLE k-copy edit: max +0 S (1e-6) and +1 displayed total.
`swap-lands` and `metadata` are equivalences: |ΔS| and |Δtotal| must be 0.
`add-ramp-unmatched` is an UNMATCHED edit: extra ramp can be a real mana
upgrade, so its movement is reported, not graded.
The `ΔU>0` columns hold the lists where the edit raised the §10.2 useful
mass itself — a real assignment gain, reported and excluded from grading.
`repaired` counts edits that removed a card the deck was ILLEGAL for:
lifting a rule failure is a benefit, so those totals are not graded.

| probe | k | lists | skipped | max ΔS | max Δtotal | S violations | total violations | repaired | ΔU>0 | max ΔU | max ΔS there | worst lists |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| delete-offplan-typed | 1 | 953 | 188 | 0.00 | 7 | 0 | 8+ | 5 | 0 | 0.0 | 0.0 | 344213921(+2) 276328878(+2) 364454802(+2) |
| delete-offplan-typed | 5 | 199 | 942 | 0.00 | 10 | 0 | 8+ | 5 | 0 | 0.0 | 0.0 | 344213921(+10) 276328878(+5) 348693085(+3) |
| delete-offplan-typed | 10 | 24 | 1117 | 0.00 | 19 | 0 | 1 | 2 | 0 | 0.0 | 0.0 | 344213921(+19) |
| replace-offplan-unknown | 1 | 953 | 188 | 0.00 | 4 | 0 | 2 | 5 | 0 | 0.0 | 0.0 | 348705370(+4) 374717363(+3) |
| replace-offplan-unknown | 5 | 199 | 942 | 0.00 | 2 | 0 | 1 | 5 | 0 | 0.0 | 0.0 | 374717363(+2) |
| replace-offplan-unknown | 10 | 24 | 1117 | 0.00 | 0 | 0 | 0 | 2 | 0 | 0.0 | 0.0 | — |
| add-untyped | 1 | 1141 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped | 5 | 1141 | 0 | 0.00 | 0 | 0 | 0 | 0 | 2 | 6.0 | 11.6 | — |
| add-untyped | 10 | 1141 | 0 | 0.00 | 0 | 0 | 0 | 0 | 12 | 13.0 | 22.9 | — |
| add-saturated-staples | 1 | 1109 | 32 | 0.00 | 0 | 0 | 0 | 0 | 106 | 2.0 | 4.1 | — |
| add-saturated-staples | 5 | 1108 | 33 | 0.00 | 0 | 0 | 0 | 0 | 225 | 6.0 | 11.3 | — |
| add-saturated-staples | 10 | 1078 | 63 | 0.00 | 0 | 0 | 0 | 0 | 246 | 9.0 | 10.8 | — |
| add-ramp-unmatched | 1 | 1141 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1025 | 7.7 | 18.5 | — |
| add-ramp-unmatched | 5 | 1141 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1138 | 11.7 | 24.9 | — |
| add-ramp-unmatched | 10 | 1141 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1140 | 26.0 | 47.1 | — |
| swap-lands | 1 | 1000 | 141 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| swap-lands | 5 | 928 | 213 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| swap-lands | 10 | 778 | 363 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| metadata | - | 1141 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
