import sharp from 'sharp';
const O='C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-20/score-wiring';
for (const n of ['home','builder']) {
  const [a,b]=await Promise.all([`${O}/refute-r2-${n}-light-before-28.png`,`${O}/refute-r2-${n}-light-after-22.png`].map(f=>sharp(f).raw().toBuffer({resolveWithObject:true})));
  let diff=0,max=0; const N=Math.min(a.data.length,b.data.length);
  for(let i=0;i<N;i++){const d=Math.abs(a.data[i]-b.data[i]); if(d>2){diff++; if(d>max)max=d;}}
  console.log(`${n}: channels differing >2 = ${diff} / ${N} (${(100*diff/N).toFixed(2)}%), max channel delta ${max}`);
}
