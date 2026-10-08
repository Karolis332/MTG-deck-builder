#!/bin/bash
# usage: src.sh "Card Name" ... -> name | owned qty | decks using it
cd C:/Users/QuLeR/MTG-deck-builder
for n in "$@"; do
  q=$(grep -m1 -F -x -e "1 $n" -e "2 $n" -e "3 $n" -e "4 $n" -e "5 $n" -e "6 $n" -e "7 $n" -e "8 $n" decks/paper/collection.txt | cut -d' ' -f1)
  d=$(grep -l -F "$n" decks/paper/decks/*.txt 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/.txt//' | tr '\n' ',')
  echo "$n | ${q:-0} | ${d:-FREE}"
done
