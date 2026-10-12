# Pre-rank formula comparison

Full screen: `verify-2026-10-07/best-deck/paper-2` (265 commanders, passes:0, same owned pool `loadOwned('paper')`).
Candidates (owned, isCommander, commander format): 268; overlap with the full screen: 265.
True top 5: Mikaeus, the Unhallowed, Meren of Clan Nel Toth, Dina, Essence Brewer, Imotekh the Stormlord, Illuminor Szeras
True top 10: Mikaeus, the Unhallowed, Meren of Clan Nel Toth, Dina, Essence Brewer, Imotekh the Stormlord, Illuminor Szeras, Nalia de'Arnise, Minthara, Merciless Soul, Chainer, Dementia Master, The Destined Warrior, Ruric Thar, the Unbowed

| formula | recall@24 (top5) | recall@24 (top10) | Spearman rho vs seedObjective |
|---|---|---|---|
| (1) raw sum, top120 | 60% (3/5) | 40% (4/10) | 0.398 |
| (2) coverage ratio, top120 | 40% (2/5) | 20% (2/10) | 0.300 |
| (3) coverage ratio, top60 | 40% (2/5) | 30% (3/10) | 0.276 |
| (4) blend: raw sum top120 * coverage top60 | 40% (2/5) | 30% (3/10) | 0.361 |
| (5) raw sum, top60 | 40% (2/5) | 40% (4/10) | 0.379 |
| (6) blend: raw sum top120 + 0.25*coverage top60 | 60% (3/5) | 40% (4/10) | 0.397 |
| (7) raw sum of inclusion^2, top120 | 60% (3/5) | 50% (5/10) | 0.367 |
