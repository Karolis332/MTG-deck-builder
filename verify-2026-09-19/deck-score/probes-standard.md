## §10.4 gaming probes — standard training stride (499 fully resolved lists)

Allowance for the WHOLE k-copy edit: max +0 S (1e-6), +1 displayed total,
+1 unrounded rank and +1 displayed rank (§10.9 item 5).
`rank absent` counts edits where one endpoint left the rank domain: no
numeric rank delta exists there, so it is counted, never graded as 0.
`swap-lands` and `metadata` are equivalences: |ΔS| and |Δtotal| must be 0.
`add-ramp-unmatched` is an UNMATCHED edit: extra ramp can be a real mana
upgrade, so its movement is reported, not graded.
The `ΔU>0` columns hold the lists where the edit raised the §10.2 useful
mass itself — a real assignment gain, reported and excluded from grading.
`repaired` counts edits that removed a card the deck was ILLEGAL for:
lifting a rule failure is a benefit, so those totals are not graded.

| probe | k | lists | skipped | max ΔS | max ΔT_abs | max Δtotal | max Δrank | max Δrank shown | S viol | total viol | rank viol | rank absent | repaired | ΔU>0 | max ΔU | max ΔS there | worst lists |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| delete-offplan-typed | 1 | 41 | 458 | 1.60 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 40 | 0 | 0 | 0.0 | 0.0 | — |
| delete-offplan-typed | 5 | 25 | 474 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 25 | 0 | 0 | 0.0 | 0.0 | — |
| delete-offplan-typed | 10 | 21 | 478 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 21 | 0 | 0 | 0.0 | 0.0 | — |
| replace-offplan-unknown | 1 | 41 | 458 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| replace-offplan-unknown | 5 | 25 | 474 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| replace-offplan-unknown | 10 | 21 | 478 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped | 1 | 0 | 499 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped | 5 | 0 | 499 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped | 10 | 0 | 499 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| add-unknown-slots | 1 | 499 | 0 | 0.00 | 17.52 | 18 | 40.51 | 41 | 0 | 7 | 7 | 11 | 0 | 0 | 0.0 | 0.0 | standard:1446026(rank+37.21/disp+38) standard:1446106(rank+40.51/disp+41) standard:1446148(rank+37.21/disp+38) |
| add-unknown-slots | 5 | 499 | 0 | 0.00 | 4.40 | 5 | 2.97 | 3 | 0 | 4 | 4 | 11 | 0 | 0 | 0.0 | 0.0 | standard:1446519(rank+1.76/disp+2) standard:1445877(rank+2.86/disp+3) standard:1446862(rank+2.97/disp+3) |
| add-unknown-slots | 10 | 499 | 0 | 0.00 | 2.08 | 2 | 2.97 | 3 | 0 | 2 | 2 | 11 | 0 | 0 | 0.0 | 0.0 | standard:1446862(rank+2.97/disp+3) standard:1446838(rank+2.97/disp+3) |
| add-untyped-unmatched | 1 | 499 | 0 | 0.00 | 19.92 | 20 | 43.96 | 44 | 0 | 0 | 0 | 11 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped-unmatched | 5 | 499 | 0 | 0.00 | 15.92 | 16 | 41.59 | 41 | 0 | 0 | 0 | 11 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped-unmatched | 10 | 499 | 0 | 0.00 | 13.36 | 13 | 31.26 | 31 | 0 | 0 | 0 | 11 | 0 | 0 | 0.0 | 0.0 | — |
| add-saturated-staples | 1 | 479 | 20 | 0.00 | 19.85 | 20 | 43.85 | 44 | 0 | 0 | 0 | 11 | 0 | 36 | 1.0 | 2.6 | — |
| add-saturated-staples | 5 | 387 | 112 | 0.00 | 15.92 | 16 | 41.59 | 41 | 0 | 0 | 0 | 11 | 0 | 87 | 5.0 | 6.6 | — |
| add-saturated-staples | 10 | 141 | 358 | 0.00 | 18.96 | 19 | 15.36 | 16 | 0 | 0 | 0 | 2 | 0 | 64 | 7.0 | 6.9 | — |
| add-ramp-unmatched | 1 | 499 | 0 | 0.00 | 1.71 | 2 | 3.13 | 3 | 0 | 0 | 0 | 0 | 0 | 489 | 11.0 | 36.7 | — |
| add-ramp-unmatched | 5 | 499 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 499 | 19.0 | 44.8 | — |
| add-ramp-unmatched | 10 | 498 | 1 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 498 | 24.0 | 45.3 | — |
| swap-lands | 1 | 499 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0.0 | 0.0 | — |
| swap-lands | 5 | 307 | 192 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 9 | 0 | 0 | 0.0 | 0.0 | — |
| swap-lands | 10 | 128 | 371 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0.0 | 0.0 | — |
| metadata | - | 499 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0.0 | 0.0 | — |
