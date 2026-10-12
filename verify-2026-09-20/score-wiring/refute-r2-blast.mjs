import { chromium } from 'playwright';
const OUT='C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-20/score-wiring';
const lum=(r,g,b)=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
const px=s=>s.match(/\d+/g).slice(0,3).map(Number);
const cr=(a,b)=>{const l1=lum(...px(a)),l2=lum(...px(b));return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))).toFixed(2)};
const probe=()=>{
  const g=(sel,prop)=>{const e=document.querySelector(sel);return e?getComputedStyle(e)[prop]:null};
  const btn=document.querySelector('a[class*="bg-primary"],button[class*="bg-primary"],[data-slot="button"]');
  return {
    token: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
    btnBg: btn?getComputedStyle(btn).backgroundColor:null,
    btnFg: btn?getComputedStyle(btn).color:null,
    btnText: btn?btn.textContent.trim().slice(0,24):null,
    headerLink: g('header a[class*="text-primary"], header [class*="text-primary"]','color'),
    anyTextPrimary: (()=>{const e=document.querySelector('[class*="text-primary"]:not([class*="text-primary-foreground"])');return e?{color:getComputedStyle(e).color,cls:e.className.toString().slice(0,50)}:null})(),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
};
const b=await chromium.launch();
const res={};
for(const [name,url] of [['home','http://localhost:3342/'],['builder','http://localhost:3342/builder']]){
  for(const variant of ['after-22','before-28']){
    const ctx=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
    await ctx.addInitScript(`try{localStorage.setItem('grimoire-theme','light')}catch{}`);
    const p=await ctx.newPage();
    await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(900);
    if(variant==='before-28') { await p.addStyleTag({content:':root{--primary:hsl(43 70% 28%) !important}'}); await p.waitForTimeout(300); }
    res[`${name}-${variant}`]=await p.evaluate(probe);
    await p.screenshot({path:`${OUT}/refute-r2-${name}-light-${variant}.png`});
    await ctx.close();
  }
}
for(const k of Object.keys(res)){const r=res[k]; if(r.btnBg&&r.btnFg) r.btnContrast=cr(r.btnFg,r.btnBg); if(r.anyTextPrimary) r.textPrimaryVsBody=cr(r.anyTextPrimary.color,r.bodyBg);}
console.log(JSON.stringify(res,null,1));
await b.close();
