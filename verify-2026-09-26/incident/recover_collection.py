"""Carve deleted `collection` rows out of a SQLite file's free pages.

Incident 2026-09-26: build-api tests ran `DELETE FROM collection` against the live
APPDATA DB. auto_vacuum=0 and secure_delete=0, so freed table-leaf pages keep their cells.
Reads the file as raw bytes (never opens it with SQLite for writing).

Usage: py recover_collection.py <db-file> <out.csv>
Record shape (sqlite_master): id INTEGER PK (rowid, NULL in record), card_id TEXT,
quantity INT, foil INT, source TEXT, imported_at TEXT, user_id INT.
"""
import csv
import re
import sys

UUID = re.compile(rb'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
TS = re.compile(rb'^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$')


def varint(buf, i):
    v = 0
    for k in range(9):
        b = buf[i + k]
        if k == 8:
            return (v << 8) | b, i + 9
        v = (v << 7) | (b & 0x7F)
        if b < 0x80:
            return v, i + k + 1
    raise ValueError


def value(buf, i, t):
    if t == 0:
        return None, i
    if t in (8, 9):
        return t - 8, i
    if 1 <= t <= 6:
        n = (1, 2, 3, 4, 6, 8)[t - 1]
        return int.from_bytes(buf[i:i + n], 'big', signed=True), i + n
    if t == 7:
        raise ValueError('float')
    n = (t - 12) // 2 if t % 2 == 0 else (t - 13) // 2
    raw = bytes(buf[i:i + n])
    return (raw if t % 2 == 0 else raw.decode('utf-8')), i + n


def parse_cell(page, off):
    _size, i = varint(page, off)
    rowid, i = varint(page, i)
    hdr_len, j = varint(page, i)
    end = i + hdr_len
    types = []
    while j < end:
        t, j = varint(page, j)
        types.append(t)
    if len(types) != 7 or types[0] != 0:
        return None
    vals, k = [], end
    for t in types[1:]:
        v, k = value(page, k, t)
        vals.append(v)
    card_id, qty, foil, source, ts, user_id = vals
    if not (isinstance(card_id, str) and UUID.match(card_id.encode())):
        return None
    if not (isinstance(source, str) and isinstance(ts, str) and TS.match(ts.encode())):
        return None
    if not all(isinstance(x, int) for x in (qty, foil)) or not (user_id is None or isinstance(user_id, int)):
        return None
    return rowid, card_id, qty, foil, source, ts, user_id


def main(path, out):
    data = open(path, 'rb').read()
    psize = int.from_bytes(data[16:18], 'big') or 65536
    rows = {}
    pages_hit = 0
    for p in range(len(data) // psize):
        base = p * psize
        hdr = base + (100 if p == 0 else 0)
        if data[hdr] != 0x0D:
            continue
        ncell = int.from_bytes(data[hdr + 3:hdr + 5], 'big')
        page = memoryview(data)[base:base + psize]
        got = 0
        for c in range(ncell):
            ptr = int.from_bytes(data[hdr + 8 + 2 * c:hdr + 10 + 2 * c], 'big')
            if not 0 < ptr < psize:
                continue
            try:
                r = parse_cell(page, ptr)
            except (ValueError, IndexError, UnicodeDecodeError):
                r = None
            if r:
                got += 1
                prev = rows.get(r[0])
                if prev and prev != r:
                    rows[r[0]] = max(prev, r, key=lambda x: x[5])  # same rowid, newer timestamp wins
                else:
                    rows[r[0]] = r
        pages_hit += got > 0
    with open(out, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['id', 'card_id', 'quantity', 'foil', 'source', 'imported_at', 'user_id'])
        for r in sorted(rows.values()):
            w.writerow(r)
    print(f'pages with collection cells: {pages_hit}; distinct rowids: {len(rows)}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
