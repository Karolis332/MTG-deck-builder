import io
p = r'C:\Users\QuLeR\MTG-deck-builder\src\lib\__tests__\deck-score-v12.test.ts'
s = io.open(p, encoding='utf-8').read()

bad = "describe('// -- Round 3: W recipe families and the typal plan"
assert bad in s
s = s.replace(bad, "// -- Round 3: W recipe families and the typal plan", 1)

orphan = "\n\\u00a71 plan selection ranks recipes on fit, not on essentials-met count', () => {"
assert orphan in s
s = s.replace(orphan, "\ndescribe('\\u00a71 plan selection ranks recipes on fit, not on essentials-met count', () => {", 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('repaired')
