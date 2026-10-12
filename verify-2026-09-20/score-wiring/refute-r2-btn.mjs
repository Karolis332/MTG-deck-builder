import { chromium } from 'playwright';
const lum=(r,g,b)=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
const px=s=>(s.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(Number);
const cr=(a,b)=>{const l1=lum(...px(a)),l2=lum(...px(b));return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))).toFixed(2)};
const b=await chromium.launch(); const out={};
for(const v of ['after-22','before-28']){
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  await ctx.addInitScript(`try{localStorage.setItem('grimoire-theme','light')}catch{}`);
  const p=await ctx.newPage(); await p.goto('http://localhost:3342/builder',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
  if(v==='before-28'){await p.addStyleTag({content:':root{--primary:hsl(43 70% 28%) !important}'});await p.waitForTimeout(300);}
  out[v]=await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>/(^|\s)bg-primary(\s|$)/.test(e.className.toString?.()||'')).slice(0,4)
    .map(e=>({txt:e.textContent.trim().slice(0,20),bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color})));
  await ctx.close();
}
for(const k in out) out[k]=out[k].map(o=>({...o,contrast:cr(o.fg,o.bg)}));
console.log(JSON.stringify(out,null,1));
await b.close();
