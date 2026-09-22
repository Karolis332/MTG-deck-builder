## §10.4 gaming probes — commander training stride (1797 fully resolved lists)

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
| delete-offplan-typed | 1 | 1662 | 135 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1662 | 0 | 0 | 0.0 | 0.0 | — |
| delete-offplan-typed | 5 | 545 | 1252 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 545 | 0 | 0 | 0.0 | 0.0 | — |
| delete-offplan-typed | 10 | 79 | 1718 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 79 | 0 | 0 | 0.0 | 0.0 | — |
| replace-offplan-unknown | 1 | 1662 | 135 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 312 | 6 | 0 | 0.0 | 0.0 | — |
| replace-offplan-unknown | 5 | 545 | 1252 | 0.00 | 21.84 | 22 | 14.91 | 15 | 0 | 1 | 1 | 97 | 4 | 0 | 0.0 | 0.0 | 380158752(rank+14.91/disp+15) |
| replace-offplan-unknown | 10 | 79 | 1718 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped | 1 | 0 | 1797 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped | 5 | 0 | 1797 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| add-untyped | 10 | 0 | 1797 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0.0 | 0.0 | — |
| add-unknown-slots | 1 | 1797 | 0 | 0.00 | 10.32 | 10 | 16.47 | 16 | 0 | 4 | 4 | 348 | 8 | 0 | 0.0 | 0.0 | 379646794(rank+16.47/disp+16) 369978387(rank+13.25/disp+13) 378292470(rank+14.88/disp+15) |
| add-unknown-slots | 5 | 1797 | 0 | 0.00 | 23.89 | 24 | 21.81 | 22 | 0 | 8+ | 8+ | 348 | 9 | 1 | 2.0 | 0.4 | 381395677(rank+20.61/disp+20) 381376851(rank+9.34/disp+10) 381368252(rank+4.28/disp+4) |
| add-unknown-slots | 10 | 1797 | 0 | 0.00 | 22.73 | 23 | 23.79 | 24 | 0 | 8+ | 8+ | 348 | 10 | 1 | 2.0 | 0.0 | 381395677(rank+20.49/disp+20) 315319587(rank+5.85/disp+6) 381368252(rank+2.36/disp+2) |
| add-untyped-unmatched | 1 | 1797 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1797 | 8 | 0 | 0.0 | 0.0 | — |
| add-untyped-unmatched | 5 | 1797 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1795 | 0 | 2 | 2.0 | 0.4 | — |
| add-untyped-unmatched | 10 | 1797 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1792 | 0 | 5 | 3.0 | 0.0 | — |
| add-saturated-staples | 1 | 1778 | 19 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1670 | 8 | 108 | 1.0 | 1.8 | — |
| add-saturated-staples | 5 | 1778 | 19 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1528 | 0 | 250 | 6.0 | 11.2 | — |
| add-saturated-staples | 10 | 1777 | 20 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 1489 | 0 | 288 | 10.0 | 13.8 | — |
| add-ramp-unmatched | 1 | 1797 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 226 | 1 | 1571 | 4.0 | 8.9 | — |
| add-ramp-unmatched | 5 | 1797 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 22 | 0 | 1775 | 8.0 | 15.4 | — |
| add-ramp-unmatched | 10 | 1797 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 16 | 0 | 1781 | 22.9 | 45.0 | — |
| swap-lands | 1 | 1708 | 89 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 308 | 0 | 0 | 0.0 | 0.0 | — |
| swap-lands | 5 | 1647 | 150 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 290 | 0 | 0 | 0.0 | 0.0 | — |
| swap-lands | 10 | 1467 | 330 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 257 | 0 | 0 | 0.0 | 0.0 | — |
| metadata | - | 1797 | 0 | 0.00 | 0.00 | 0 | 0.00 | 0 | 0 | 0 | 0 | 348 | 0 | 0 | 0.0 | 0.0 | — |
