import io
T = 'src/lib/__tests__/'
C = ' // rc10 card-data re-freeze 2026-09-27: '
EDITS = [
 ('deck-score-coverage-round1.test.ts', "expect(pct(brawl.totals, 50)).toBe(76);", "expect(pct(brawl.totals, 50)).toBe(77);" + C + "76 -> 77"),
 ('deck-score-v14-stage2.test.ts', "expect(brawl.tp50).toBe(76); // rc10 re-freeze: 74 -> 76", "expect(brawl.tp50).toBe(77); // rc10 re-freeze: 74 -> 76; card-data re-freeze 2026-09-27: 76 -> 77"),
 ('deck-score-v13-stage4c.test.ts', "toBeCloseTo(0.554, 2);", "toBeCloseTo(0.546, 2);" + C + ".554 -> .546"),
 ('deck-score-v13-stage3.test.ts', "expect(syn).toEqual([77.2, 100, 68.6, 74.4, 72.1, 69.8, 79.5, 84.2, 77.2, 79.5]);", "expect(syn).toEqual([77.2, 100, 68.6, 74.4, 72.1, 69.8, 81.9, 79.5, 79.5, 81.9]);" + C + "was [..,69.8,79.5,84.2,77.2,79.5]"),
]
for f, old, new in EDITS:
    p = T + f
    s = io.open(p, encoding='utf-8', newline='').read()
    assert s.count(old) == 1, (f, old)
    io.open(p, 'w', encoding='utf-8', newline='').write(s.replace(old, new))
print('applied', len(EDITS))
