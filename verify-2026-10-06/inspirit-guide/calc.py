from math import comb
N=99; L=38
def p_ge(k, K, n=7):  # P(at least k of K successes in n draws from N)
    return sum(comb(K,i)*comb(N-K,n-i) for i in range(k, min(K,n)+1))/comb(N,n)
cheap = ['Sol Ring','Arcane Signet','Fellwar Stone','Everflowing Chalice','Pentad Prism','Ornithopter of Paradise','Steelswarm Operator','Zookeeper Mechan','Etherium Sculptor','Enthusiastic Mechanaut']
print('lands 3-5 in 7:', round(sum(comb(L,i)*comb(N-L,7-i) for i in range(3,6))/comb(N,7),3))
print('lands 2 in 7:', round(comb(L,2)*comb(N-L,5)/comb(N,7),3))
print('>=1 cheap mana (10) in 7:', round(p_ge(1,len(cheap)),3))
# Bygone or Traxos seen by T4 on the play: 7 + 3 draws = 10 cards
print('Bygone/Traxos by T4 (10 cards):', round(1-comb(N-2,10)/comb(N,10),3))
# station pieces power>=3 seen: Bygone, Traxos, Kilo, Craterclaw, Depthshaker, Alibou, Cyberdrive, Jhoira, Tekuthal, Skate, Thunderhulk, Surge
print('>=1 of 12 power-3+ bodies by T4:', round(1-comb(N-12,10)/comb(N,10),3))
# Line maths on the reference board
ref = dict(Inspirit=5, Traxos=7, Kilo=3, Sculptor=1)
spares_A = 5  # Sol Ring, Signet, Fellwar, Insight Engine, Seat of the Synod
A = sum(v+3 for v in ref.values()) + (5+3) + spares_A*(3+3) + 1 + 1   # +Depthshaker, +Inspirit +1/+1, +Kilo proliferate
print('Line A Depthshaker:', A, 'x2 Historian:', 2*A)
X = 12  # 10 board artifacts + Bay + Craterclaw
B = sum(v+X for v in ref.values()) + 4*(4+X) + (5+X) + 1
print('Line B Cyberdrive->Bay->Craterclaw X=12:', B)
Xc = 11
C = sum(v+Xc for v in ref.values()) + (5+Xc) + 1
print('Hard-cast Craterclaw X=11:', C)
# commander damage
for n in range(5,13):
    print(n, 'artifacts: Arsenal', 5+n, 'Arsenal+Charm', 2*(5+n), 'Arsenal+Glitters', 5+n+(n+1))
