import { chromium } from 'playwright';
import sharp from 'sharp';
const OUT='C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-20/score-wiring';
const URL='http://localhost:3341/deck-score-preview-refute';
const lum=(r,g,b)=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
const cr=(a,b)=>{const l1=lum(...a),l2=lum(...b);return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))).toFixed(2)};
const b=await chromium.launch();
const report={};
for(const theme of ['dark','light']){
  const ctx=await b.newContext({viewport:{width:1280,height:1200},deviceScaleFactor:1});
  await ctx.addInitScript(`try{localStorage.setItem('grimoire-theme','${theme}')}catch{}`);
  const p=await ctx.newPage();
  await p.goto(URL,{waitUntil:'networkidle'}); await p.waitForTimeout(600);
  const buf=await p.locator('#case-commander').screenshot({path:`${OUT}/refute-card-${theme}-1280.png`});
  const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const px=(x,y)=>{x=Math.max(0,Math.min(info.width-1,Math.round(x)));y=Math.max(0,Math.min(info.height-1,Math.round(y)));const i=(y*info.width+x)*4;return [data[i],data[i+1],data[i+2]]};
  const targets=await p.evaluate(()=>{
    const card=document.querySelector('#case-commander').firstElementChild;
    const cb=card.getBoundingClientRect();
    const pick=(el,name)=>{const r=el.getBoundingClientRect();return{name,color:getComputedStyle(el).color,fontSize:getComputedStyle(el).fontSize,fontWeight:getComputedStyle(el).fontWeight,x:r.left-cb.left,y:r.top-cb.top,w:r.width,h:r.height}};
    const num=card.querySelector('[aria-label="Deck Score"]');
    const rows=[...card.querySelectorAll('li')];
    return [pick(num,'number'),pick(num.nextElementSibling,'label'),pick(rows[0].firstElementChild,'rowName'),pick(rows[0].lastElementChild,'rowValue'),pick(card.querySelector('[title]'),'provisionalBadge')];
  });
  report[theme]=targets.map(t=>{
    const col=t.color.match(/\d+/g).slice(0,3).map(Number);
    const samples=[];
    for(let dx=0;dx<Math.max(4,t.w);dx+=3){for(const dy of [-5,-4,t.h+3,t.h+4]){samples.push(px(t.x+dx,t.y+dy))}}
    const sorted=[...samples].sort((a,b)=>lum(...a)-lum(...b));
    const med=sorted[Math.floor(sorted.length/2)];
    const worst=samples.map(s=>cr(col,s)).sort((a,b)=>a-b)[0];
    return {el:t.name,fg:t.color,bgMedian:`rgb(${med.join(',')})`,ratioMedian:cr(col,med),ratioWorstSample:worst,fontSize:t.fontSize,weight:t.fontWeight};
  });
  await ctx.close();
}
console.log(JSON.stringify(report,null,1));
await b.close();
