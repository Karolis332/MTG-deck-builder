# rc10 card-data re-freeze (2026-09-27) pin edits. Each (file, old, new) must match exactly once.
import sys, io
T = 'src/lib/__tests__/'
C = ' // rc10 card-data re-freeze 2026-09-27: '
EDITS = [
 ('deck-score-coverage-round1.test.ts', "commander: { p50: 0.754, over80: 0.315 },", "commander: { p50: 0.754, over80: 0.305 }," + C + "over80 .315 -> .305"),
 ('deck-score-coverage-round1.test.ts', "brawl: { p50: 0.741, over80: 0.250 },", "brawl: { p50: 0.741, over80: 0.230 }," + C + "over80 .250 -> .230"),
 ('deck-score-coverage-round1.test.ts', "expect(pct(brawl.S, 50)).toBeCloseTo(87.1, 1);", "expect(pct(brawl.S, 50)).toBeCloseTo(87.5, 1);" + C + "87.1 -> 87.5"),
 ('deck-score-coverage-round1.test.ts', "expect(pct(cmd.totals, 50)).toBe(53);", "expect(pct(cmd.totals, 50)).toBe(55);" + C + "53 -> 55"),
 ('deck-score-v13-stage2.test.ts', "expect(scores).toEqual([65, 46, 60, 47, 59, 65, 63, 55,", "// rc10 card-data re-freeze 2026-09-27: pile 7 63 -> 65 (FRA entries type a pile card).\n    expect(scores).toEqual([65, 46, 60, 47, 59, 65, 65, 55,"),
 ('deck-score-v13-stage2.test.ts', "toEqual([27, 51, 26, 50, 26, 26, 27, 22, 20, 26]);", "toEqual([26, 27, 26, 26, 22, 26, 26, 21, 20, 26]);" + C + "was [27,51,26,50,26,26,27,22,20,26]"),
 ('deck-score-v13-stage3.test.ts', "toEqual([27, 51, 26, 50, 26, 26, 27, 22, 20, 26]);", "toEqual([26, 27, 26, 26, 22, 26, 26, 21, 20, 26]);" + C + "was [27,51,26,50,26,26,27,22,20,26]"),
 ('deck-score-v13-stage4a.test.ts', "engine: [[6, 16], [7, 17], [7, 17]]", "engine: [[6, 16], [7, 17], [6, 17]]"),
 ('deck-score-v13-stage4a.test.ts', "payoff: [[3, 16], [4, 15], [4, 16]]", "payoff: [[3, 16], [4, 15], [4, 15]]"),
 ('deck-score-v13-stage4a.test.ts', "payoff: [[2, 12], [2, 12], [2, 12]]", "payoff: [[2, 12], [2, 12], [1, 11]]"),
 ('deck-score-v13-stage4a.test.ts', "payoff: [[6, 19], [6, 20], [6, 20]]", "payoff: [[6, 19], [6, 20], [6, 19]]"),
 ('deck-score-v13-stage4a.test.ts', "    conversion: { converters:", "    // rc10 card-data re-freeze 2026-09-27 (bands freeze --write): control.engine 7/17 -> 6/17,\n    // aristocrats.payoff 4/16 -> 4/15, spells.payoff 2/12 -> 1/11, tokens.payoff 6/20 -> 6/19.\n    conversion: { converters:"),
 ('deck-score-v13-stage4a.test.ts', "[56, 48, 66, 46, 45, 44, 58, 60, 20, 66, 60, 47, 66, 61, 63, 34, 62, 63, 60, 60]);", "[56, 48, 66, 46, 44, 41, 58, 60, 20, 66, 60, 50, 66, 61, 63, 26, 62, 62, 60, 60]);" + C + "was [56,48,66,46,45,44,58,60,20,66,60,47,66,61,63,34,62,63,60,60]"),
 ('deck-score-v13-stage4b.test.ts', "expect(band('spells', 'spells')).toEqual({ min: 20, max: 34 });", "expect(band('spells', 'spells')).toEqual({ min: 19, max: 34 });" + C + "20/34 -> 19/34"),
 ('deck-score-v13-stage4c.test.ts', "expect(pct(S, 10)).toBeCloseTo(81.27, 1);", "expect(pct(S, 10)).toBeCloseTo(81.68, 1);" + C + "Brawl p80 back to .4040: 81.27 -> 81.68"),
 ('deck-score-v14-stage1c.test.ts', "21fa0be02940c884620b08cfd3cbf9558fb42abf1f7d31428c38fda167da2c6b');", "e89ea252ed032582cc2b7f829eb2ba2759b6941f3c3d8085c6ab9fccd31a7721');" + C + "was 21fa0be0…"),
 ('deck-score-v14-stage1d.test.ts', "21fa0be02940c884620b08cfd3cbf9558fb42abf1f7d31428c38fda167da2c6b');", "e89ea252ed032582cc2b7f829eb2ba2759b6941f3c3d8085c6ab9fccd31a7721');" + C + "was 21fa0be0…"),
 ('deck-score-v14-stage2.test.ts', "expect(Q_SLOT_SATURATION.brawl).toBeCloseTo(40.2 / 99, 6);", "expect(Q_SLOT_SATURATION.brawl).toBeCloseTo(40 / 99, 6);" + C + "p80 U 40.2 -> 40 (a whole copy)"),
 ('deck-score-v14-stage2.test.ts', "expect(cmd.tp50).toBe(53); // rc10 re-freeze: 50 -> 53", "expect(cmd.tp50).toBe(55); // rc10 re-freeze: 50 -> 53; card-data re-freeze 2026-09-27: 53 -> 55"),
 ('deck-score-v14-stage2.test.ts', "expect(brawl.sp50).toBeCloseTo(87.1, 1);", "expect(brawl.sp50).toBeCloseTo(87.5, 1);" + C + "87.1 -> 87.5"),
 ('deck-score-v14-stage2c.test.ts', "expect(commander.tiedIntervals).toBe(168);", "expect(commander.tiedIntervals).toBe(167);" + C + "168 -> 167"),
 ('deck-score-v14-stage2c.test.ts', "expect(brawl.knots.length).toBe(407);", "expect(brawl.knots.length).toBe(404);" + C + "407 -> 404"),
 ('deck-score-v14-stage2c.test.ts', "expect(brawl.tiedIntervals).toBe(83);", "expect(brawl.tiedIntervals).toBe(82);" + C + "83 -> 82"),
 ('deck-score-v14-stage2c.test.ts', "expect(rankOf(commander, 67.84)).toBeCloseTo(79.10, 2);", "// rc10 card-data re-freeze 2026-09-27 (deck-score-report.ts): 79.10 -> 79.27, 19.93 -> 20.07, 80.45 -> 80.39, 56.91 -> 57.03.\n    expect(rankOf(commander, 67.84)).toBeCloseTo(79.27, 2);"),
 ('deck-score-v14-stage2c.test.ts', "expect(rankOf(commander, 28.08)).toBeCloseTo(19.93, 2);", "expect(rankOf(commander, 28.08)).toBeCloseTo(20.07, 2);"),
 ('deck-score-v14-stage2c.test.ts', "expect(rankOf(brawl, 86.16000000000001)).toBeCloseTo(80.45, 2);", "expect(rankOf(brawl, 86.16000000000001)).toBeCloseTo(80.39, 2);"),
 ('deck-score-v14-stage2c.test.ts', "expect(rankOf(brawl, 80.64)).toBeCloseTo(56.91, 2);", "expect(rankOf(brawl, 80.64)).toBeCloseTo(57.03, 2);"),
 ('deck-score-v14-stage3.test.ts', "expect(counts.brawl).toBe(20);", "expect(counts.brawl).toBe(16);" + C + "20 -> 16 (FRA entries)"),
 ('deck-score-v14-stage3b.test.ts', "['brawl', '348643075', 1, 88.19],", "['brawl', '348643075', 1, 88.26494845360824], // card-data re-freeze 2026-09-27: 88.19 ->"),
 ('deck-score-v14-stage3b.test.ts', "['brawl', '356465177', 1, 67.25],", "['brawl', '356465177', 1, 67.30412371134021], // card-data re-freeze 2026-09-27: 67.25 ->"),
] + [tuple(e) for e in __import__('json').loads(sys.argv[1] if len(sys.argv) > 1 else '[]')]
bad = 0
for f, old, new in EDITS:
    p = T + f
    s = io.open(p, encoding='utf-8', newline='').read()
    n = s.count(old)
    if n != 1:
        print('SKIP', f, n, old[:70]); bad += 1; continue
    io.open(p, 'w', encoding='utf-8', newline='').write(s.replace(old, new))
print('applied', len(EDITS) - bad, 'of', len(EDITS))
