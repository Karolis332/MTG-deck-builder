import { chromium } from 'playwright';
import sharp from 'sharp';
const OUT='C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-20/score-wiring';
const URL='http://localhost:3342/deck-score-preview-refute';
const lum=(r,g,b)=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
const cr=(a,b)=>{const l1=lum(...a),l2=lum(...b);return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))).toFixed(2)};
const b=await chromium.launch(); const out={};
for(const theme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:1280,height:1200},deviceScaleFactor:1});
  await ctx.addInitScript(`try{localStorage.setItem('grimoire-theme','${theme}')}catch{}`);
  const p=await ctx.newPage(); await p.goto(URL,{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  out[theme]=await p.evaluate(()=>{
    const card=document.querySelector('#r2-card');
    const fmt={};
    document.querySelectorAll('[data-format]').forEach(s=>{const t=s.textContent||'';fmt[s.dataset.format]=/calibrating/.test(t)?'CALIBRATING:'+t.replace('Deck Score is still calibrating for ',''):('NUMBER:'+(t.match(/\d+\/100/)||[''])[0])});
    const grid=id=>{const g=document.querySelector('#'+id+' .grid.gap-4');if(!g)return null;const cs=getComputedStyle(g);const k=g.firstElementChild.getBoundingClientRect();const pr=g.getBoundingClientRect();
      return{children:g.children.length,cols:cs.gridTemplateColumns,leftGap:Math.round(k.left-pr.left),rightGap:Math.round(pr.right-k.right),hasCard:!!document.querySelector('#'+id+' [aria-label="Deck Score"]')}};
    return {
      tabStops: card.querySelectorAll('[tabindex]').length,
      titleAttrs: card.querySelectorAll('[title]').length,
      reasonsVisible: [...card.querySelectorAll('li > p')].map(p=>p.textContent).slice(0,2),
      reasonCount: card.querySelectorAll('li > p').length,
      provisionalNote: (card.querySelector('#deck-score-provisional-note')||{}).textContent||null,
      badgeDescribedBy: (card.querySelector('[aria-describedby]')||{}).getAttribute?.('aria-describedby')||null,
      undefinedFmt: (document.querySelector('#r2-undefined').textContent.match(/\d+\/100/)||[''])[0],
      nullHTML: document.querySelector('#r2-null').innerHTML,
      formats: fmt,
      issNoScore: grid('r2-iss-noscore'), issWithScore: grid('r2-iss-withscore'), issHidden: grid('r2-iss-hidden'),
      primaryToken: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
      isDark: document.documentElement.classList.contains('dark'),
    };
  });
  const buf=await p.locator('#r2-card').screenshot({path:`${OUT}/refute-r2-card-${theme}-1280.png`});
  const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const px=(x,y)=>{x=Math.max(0,Math.min(info.width-1,Math.round(x)));y=Math.max(0,Math.min(info.height-1,Math.round(y)));const i=(y*info.width+x)*4;return [data[i],data[i+1],data[i+2]]};
  const t=await p.evaluate(()=>{const c=document.querySelector('#r2-card').firstElementChild;const cb=c.getBoundingClientRect();const n=c.querySelector('[aria-label="Deck Score"]');const r=n.getBoundingClientRect();
    return{color:getComputedStyle(n).color,x:r.left-cb.left,y:r.top-cb.top,w:r.width,h:r.height}});
  const col=t.color.match(/\d+/g).slice(0,3).map(Number); const samples=[];
  for(let dx=0;dx<Math.max(4,t.w);dx+=3) for(const dy of [-5,-4,t.h+3,t.h+4]) samples.push(px(t.x+dx,t.y+dy));
  const sorted=[...samples].sort((a,x)=>lum(...a)-lum(...x)); const med=sorted[Math.floor(sorted.length/2)];
  out[theme].headline={fg:t.color,bg:`rgb(${med.join(',')})`,ratioMedian:cr(col,med),ratioWorst:samples.map(s=>cr(col,s)).sort((a,x)=>a-x)[0]};
  await p.locator('#r2-iss-noscore').screenshot({path:`${OUT}/refute-r2-iss-noscore-${theme}.png`});
  await ctx.close();
}
// 390 overflow
for(const theme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:900},deviceScaleFactor:1});
  await ctx.addInitScript(`try{localStorage.setItem('grimoire-theme','${theme}')}catch{}`);
  const p=await ctx.newPage(); await p.goto(URL,{waitUntil:'networkidle'}); await p.waitForTimeout(500);
  out[theme].scrollWidth390=await p.evaluate(()=>document.documentElement.scrollWidth);
  await p.locator('#r2-card').screenshot({path:`${OUT}/refute-r2-card-${theme}-390.png`});
  await ctx.close();
}
console.log(JSON.stringify(out,null,1));
await b.close();
