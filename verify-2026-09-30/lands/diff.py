import json, sys
keys = ['tam','tatyova','aeve','meren','jhoira','atraxa','niv','krenko','tymna-thrasios','ygra']
for k in keys:
    b = json.load(open(f'verify-2026-09-30/lands/out-base/{k}.json', encoding='utf8'))
    t = json.load(open(f'verify-2026-09-30/lands/out-tip/{k}.json', encoding='utf8'))
    bn = {l['name']: l for l in b['lands']}; tn = {l['name']: l for l in t['lands']}
    def fmt(l): return f"{l['name']} [{l.get('colors','')}{'' if l.get('untapped') else ' TAPPED'} {l.get('cat','')}]"
    outs = [fmt(bn[n]) for n in bn if n not in tn and bn[n].get('cat') != 'basic']
    ins = [fmt(tn[n]) for n in tn if n not in bn and tn[n].get('cat') != 'basic']
    bb = {n: l['qty'] for n, l in bn.items() if l.get('cat') == 'basic'}; tb = {n: l['qty'] for n, l in tn.items() if l.get('cat') == 'basic'}
    print(f"== {k}: basics {bb} -> {tb}")
    print("  OUT:", '; '.join(outs) or '-')
    print("  IN: ", '; '.join(ins) or '-')
