import json, sys, time, urllib.request, urllib.parse
names = sys.argv[1:]
for n in names:
    url = 'https://api.scryfall.com/cards/named?exact=' + urllib.parse.quote(n)
    req = urllib.request.Request(url, headers={'User-Agent': 'grimoire-review/1.0', 'Accept': 'application/json'})
    card = json.load(urllib.request.urlopen(req)); time.sleep(0.15)
    req = urllib.request.Request(card['rulings_uri'], headers={'User-Agent': 'grimoire-review/1.0', 'Accept': 'application/json'})
    rs = json.load(urllib.request.urlopen(req)); time.sleep(0.15)
    print(f'### {n}')
    for r in rs['data']: print(f"- {r['published_at']}: {r['comment']}")
    print()
