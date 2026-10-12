"""Convergence review: Thran Portal (modelled as an untapped UR dual by mana_sim) vs a basic.
Measures the ceiling of Portal's colour flexibility; the sim does not model tapped lands or life.
Usage: py review_variants.py [trials]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mana_sim as M

base = M.load(os.path.join(M.D, 'final.txt'))
assert len(base) == 99, len(base)

def swap(deck, out, inn):
    d = list(deck); d.remove(out); d.append(inn); return d

M.report('final as-is (Portal = untapped UR dual)', base)
M.report('Portal -> Island', swap(base, 'Thran Portal', 'Island'))
M.report('Portal -> Mountain', swap(base, 'Thran Portal', 'Mountain'))
