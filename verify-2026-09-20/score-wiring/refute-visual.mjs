import { chromium } from 'playwright';
const OUT = 'C:/Users/QuLeR/MTG-deck-builder/verify-2026-09-20/score-wiring';
const URL = 'http://localhost:3341/deck-score-preview-refute';

const probe = `(() => {
  const lum = (r,g,b)=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
  const parse = s => { const m = (s||'').match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(x=>parseFloat(x)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
  const bgOf = el => { let c={r:255,g:255,b:255,a:0}; let n=el; const stack=[];
    while(n){ const cs=getComputedStyle(n); const p=parse(cs.backgroundColor); if(p&&p.a>0) stack.push(p); if(p&&p.a>=1) break; n=n.parentElement; }
    if(!stack.length) return {r:255,g:255,b:255};
    let out=stack[stack.length-1];
    for(let i=stack.length-2;i>=0;i--){const t=stack[i];out={r:t.r*t.a+out.r*(1-t.a),g:t.g*t.a+out.g*(1-t.a),b:t.b*t.a+out.b*(1-t.a)};}
    return out; };
  const contrast = el => { const cs=getComputedStyle(el); const fg=parse(cs.color); const bg=bgOf(el);
    const l1=lum(fg.r,fg.g,fg.b), l2=lum(bg.r,bg.g,bg.b);
    return { ratio: +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))).toFixed(2), fg: cs.color, bg: 'rgb('+[bg.r,bg.g,bg.b].map(Math.round).join(',')+')', size: cs.fontSize, weight: cs.fontWeight };
  };
  const sec = id => document.querySelector('#'+id);
  const cm = sec('case-commander');
  const num = cm.querySelector('[aria-label="Deck Score"]');
  const label = num.nextElementSibling;
  const rows = [...cm.querySelectorAll('li')];
  const val = rows[0].lastElementChild;
  const badge = cm.querySelector('[title]');
  const anim = el => { const a=[getComputedStyle(el).animationName, getComputedStyle(el,'::after').animationName, getComputedStyle(el,'::before').animationName];
    const inner=[...el.querySelectorAll('*')].flatMap(x=>[getComputedStyle(x).animationName,getComputedStyle(x,'::after').animationName]);
    return [...new Set([...a,...inner])].filter(x=>x&&x!=='none'); };
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    bodyScrollWidth: document.body.scrollWidth,
    numberText: num.textContent,
    labelText: label.textContent,
    rowLabels: rows.map(r=>r.firstElementChild.textContent),
    rowTitles: rows.map(r=>r.getAttribute('title')),
    rowTabIndex: rows.map(r=>r.getAttribute('tabindex')),
    badgeTitle: badge ? badge.getAttribute('title') : null,
    badgeTabIndex: badge ? badge.getAttribute('tabindex') : null,
    contrastNumber: contrast(num),
    contrastLabel: contrast(label),
    contrastRowName: contrast(rows[0].firstElementChild),
    contrastRowValue: contrast(val),
    standardText: sec('case-standard').textContent,
    standardHasDigit: /\d/.test(sec('case-standard').textContent),
    standardBrawlText: sec('case-standardbrawl').textContent.slice(0,40),
    undefinedText: sec('case-undefined').textContent.slice(0,40),
    unknownText: sec('case-unknown').textContent.slice(0,40),
    nullHTML: sec('case-null').innerHTML,
    failLabel: sec('case-fail').querySelector('[aria-label="Deck Score"]').nextElementSibling.textContent,
    animations: anim(cm.firstElementChild),
    issNoScore: (()=>{const g=sec('iss-without-score').querySelector('.grid'); const k=g.firstElementChild.getBoundingClientRect(); const p=g.getBoundingClientRect();
      return {children:g.children.length, cols:getComputedStyle(g).gridTemplateColumns, issLeft:Math.round(k.left-p.left), issRight:Math.round(p.right-k.right), parentW:Math.round(p.width), childW:Math.round(k.width)};})(),
    issWithScore: (()=>{const g=sec('iss-with-score').querySelector('.grid'); return {children:g.children.length, cols:getComputedStyle(g).gridTemplateColumns};})(),
  };
})()`;

const b = await chromium.launch();
const results = {};
for (const theme of ['dark','light']) {
  for (const width of [1280, 390]) {
    const ctx = await b.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(`try{localStorage.setItem('grimoire-theme','${theme}')}catch{}`);
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    results[`${theme}-${width}`] = await p.evaluate(probe);
    await p.locator('#case-commander').screenshot({ path: `${OUT}/refute-card-${theme}-${width}.png` });
    if (width === 1280) {
      await p.locator('#case-standard').screenshot({ path: `${OUT}/refute-standard-${theme}.png` });
      await p.locator('#iss-without-score').screenshot({ path: `${OUT}/refute-iss-noscore-${theme}.png` });
      await p.locator('#iss-with-score').screenshot({ path: `${OUT}/refute-iss-withscore-${theme}.png` });
    }
    await ctx.close();
  }
}
// reduced motion
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
await ctx.addInitScript(`try{localStorage.setItem('grimoire-theme','dark')}catch{}`);
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
await p.locator('#case-commander').hover();
await p.waitForTimeout(300);
results['reduced-motion'] = await p.evaluate(probe);
await ctx.close();
await b.close();
console.log(JSON.stringify(results, null, 1));
