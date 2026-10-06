from math import comb
N, n = 99, 7
def hyp_ge(K, k): return sum(comb(K,i)*comb(N-K,n-i) for i in range(k, min(K,n)+1))/comb(N,n)
print('P(>=2 of 8 MV6+)', round(hyp_ge(8,2),4), 'P(>=3)', round(hyp_ge(8,3),4))
# lands 35 (incl Seat etc), Sink MDFC 1, rocks/reducers 2-3 MV: 10
L, S, R = 35, 1, 10
O = N - L - S - R
tot = keep = keep_sink = 0
for l in range(8):
  for s in range(2):
    for r in range(8):
      o = n - l - s - r
      if o < 0: continue
      w = comb(L,l)*comb(S,s)*comb(R,r)*comb(O,o)
      tot += w
      if 2 <= l <= 4 and r >= 1: keep += w
      if 2 <= l + s <= 4 and r >= 1: keep_sink += w
print('total', tot == comb(N,n))
print('P(2-4 lands & >=1 rock/reducer)', round(keep/tot,4), 'counting Sink as land', round(keep_sink/tot,4))
print('P(no rock/reducer)', round(comb(N-R,n)/comb(N,n),4))
print('P(lands 2-4)', round(sum(comb(L,l)*comb(N-L,n-l) for l in range(2,5))/comb(N,n),4))
# no rock and no 2-drop: 2-MV nonland cards
# new rule: lands incl. Sink (36); keep 3-4 lands, or 2 lands + >=1 of 10 rocks/reducers
L2, R2 = 36, 10
O2 = N - L2 - R2
k3_4 = sum(comb(L2,l)*comb(N-L2,n-l) for l in (3,4))/comb(N,n)
k2r = sum(comb(L2,2)*comb(R2,r)*comb(O2,n-2-r) for r in range(1,6))/comb(N,n)
print('NEW keep 3-4 lands', round(k3_4,4), '2 lands + rock', round(k2r,4), 'total keep', round(k3_4+k2r,4))
print('2 lands, no rock', round(comb(L2,2)*comb(N-L2-R2,5)/comb(N,n),4))
print('0-1 lands', round(sum(comb(L2,l)*comb(N-L2,n-l) for l in (0,1))/comb(N,n),4), '5+ lands', round(sum(comb(L2,l)*comb(N-L2,n-l) for l in range(5,8))/comb(N,n),4))
