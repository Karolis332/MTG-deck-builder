import re, json, os, sys

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

def get(pattern, html, flags=re.I | re.S):
    m = re.search(pattern, html, flags)
    return m.group(1).strip() if m else None

def all_matches(pattern, html, flags=re.I | re.S):
    return re.findall(pattern, html, flags)

rows = []
manifest = [l.strip().split("|") for l in open("manifest.txt", encoding="utf-8") if l.strip()]

for idx, url, code in manifest:
    path = f"pages/page_{idx}.html"
    html = open(path, encoding="utf-8", errors="replace").read()

    title = get(r"<title[^>]*>(.*?)</title>", html)
    desc = get(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', html)
    canonical = get(r'<link\s+rel=["\']canonical["\']\s+href=["\'](.*?)["\']', html)
    robots_meta = get(r'<meta\s+name=["\']robots["\']\s+content=["\'](.*?)["\']', html)
    og_title = get(r'<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']', html)
    og_image = get(r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']', html)
    tw_card = get(r'<meta\s+name=["\']twitter:card["\']\s+content=["\'](.*?)["\']', html)
    h1s = all_matches(r"<h1[^>]*>(.*?)</h1>", html)
    h1_text = [re.sub(r"<[^>]+>", "", h).strip() for h in h1s]
    jsonld_blocks = all_matches(r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>', html)
    jsonld_types = []
    for block in jsonld_blocks:
        try:
            data = json.loads(block)
        except Exception:
            jsonld_types.append("PARSE_ERROR")
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if isinstance(item, dict):
                t = item.get("@type")
                if isinstance(t, list):
                    jsonld_types.extend(t)
                elif t:
                    jsonld_types.append(t)
    lang = get(r"<html[^>]*\slang=[\"']([^\"']*)[\"']", html)
    hreflang = all_matches(r'<link\s+rel=["\']alternate["\']\s+hreflang=["\']([^"\']*)["\']', html)
    viewport = get(r'<meta\s+name=["\']viewport["\']\s+content=["\'](.*?)["\']', html)

    # crude main-content word count: strip scripts/styles/tags
    body = html
    body = re.sub(r"<script[^>]*>.*?</script>", " ", body, flags=re.S | re.I)
    body = re.sub(r"<style[^>]*>.*?</style>", " ", body, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", body)
    text = re.sub(r"\s+", " ", text).strip()
    word_count = len(text.split())

    rows.append({
        "url": url,
        "status": code,
        "title": title,
        "title_len": len(title) if title else 0,
        "desc": desc,
        "desc_len": len(desc) if desc else 0,
        "canonical": canonical,
        "robots_meta": robots_meta,
        "og_title": og_title,
        "og_image": bool(og_image),
        "tw_card": tw_card,
        "h1_count": len(h1_text),
        "h1_text": h1_text[:2],
        "jsonld_types": sorted(set(jsonld_types)),
        "lang": lang,
        "hreflang": hreflang,
        "viewport": bool(viewport),
        "word_count": word_count,
    })

with open("extracted.json", "w", encoding="utf-8") as f:
    json.dump(rows, f, indent=2, ensure_ascii=False)

# print quick table
for r in rows:
    print(f"{r['status']} | {r['url']} | title_len={r['title_len']} desc_len={r['desc_len']} canon={r['canonical']} robots={r['robots_meta']} h1={r['h1_count']} words={r['word_count']} jsonld={r['jsonld_types']}")
