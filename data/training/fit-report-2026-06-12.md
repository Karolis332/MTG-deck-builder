# Scoring-weight fit — 2026-06-12

rows=22638 commanders=100 positives=0.594 AUC(test, group-split)=0.607

| component | coef (logit/pt) | weight | mean@played | mean@unplayed | nonzero share |
|---|---|---|---|---|---|
| ml | +0.0000 | 1.0 | 0.0 | 0.0 | 0.00 |
| cf | -0.0897 | 0.25 | 0.2 | 0.3 | 0.04 |
| edhrec | +0.0000 | 1.0 | 0.0 | 0.0 | 0.00 |
| globalRank | +0.0224 | 1.0 | 44.4 | 43.5 | 1.00 |
| tribal | +0.0228 | 1.02 | 3.0 | 1.0 | 0.05 |
| theme | -0.0133 | 0.5 | 10.1 | 14.6 | 0.47 |
| profileSynergy | -0.0035 | 1.0 | 4.7 | 5.7 | 0.25 |
| typePenalty | -0.0074 | 1.0 | -0.5 | -0.3 | 0.01 |
| stormFit | +0.0060 | 1.0 | 0.2 | 0.2 | 0.01 |
| mechanicFit | -0.0023 | 1.0 | 0.3 | 0.5 | 0.02 |
| strategyFit | -0.0023 | 1.0 | 4.3 | 4.6 | 0.76 |
| powerTier | +0.0000 | 1.0 | 0.0 | 0.0 | 0.00 |
| metaStats | -0.0083 | 0.5 | 14.7 | 16.3 | 0.99 |
| collection | +0.0000 | 1.0 | 0.0 | 0.0 | 0.00 |
| qualityFloor | +0.0000 | 1.0 | 0.0 | 0.0 | 0.00 |
| cmdrStats | (pinned) | 1.0 | — | — | — |
