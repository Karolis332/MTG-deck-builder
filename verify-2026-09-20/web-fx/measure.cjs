const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const fixture = require('./fixture.cjs');
const dir = __dirname;
const phase = process.argv[2] || 'baseline';
const base = 'http://127.0.0.1:3330';
const pages = process.env.FX_PAGES?.split(',') || ['home','builder','commanders'];
const metrics = [];
const round = n=>Math.round(n*100)/100;
async function instrument(page, theme) {
  await page.addInitScript(({theme})=>{
    localStorage.setItem('grimoire-theme',theme);
    window.fxMetrics={lcp:0,cls:0,tasks:[],shifts:[],canvas:[]};
    new PerformanceObserver(l=>{for(const e of l.getEntries()) window.fxMetrics.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput){window.fxMetrics.cls+=e.value;window.fxMetrics.shifts.push({t:e.startTime,v:e.value});}}).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries()) window.fxMetrics.tasks.push({t:e.startTime,d:e.duration});}).observe({type:'longtask',buffered:true});
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=cb=>raf(t=>{const start=performance.now();cb(t);if(cb.name==='drawEmbers')window.fxMetrics.canvas.push(performance.now()-start);});
  }, {theme});
  await page.route('**/api/**',async route=>{
    const p=new URL(route.request().url()).pathname;
    if(route.request().method()==='POST'){
      if(p==='/api/build') return route.fulfill({json:fixture.result});
      if(p==='/api/analyze') return route.fulfill({json:fixture.analysis});
      return route.abort();
    }
    return route.continue();
  });
}
async function openPage(page,name){
  await page.goto(base+(name==='home'?'/':'/'+name),{waitUntil:'networkidle',timeout:90000});
  await page.evaluate(()=>document.fonts.ready);
  if(name==='builder'){
    await page.getByRole('combobox').first().fill(fixture.result.commander);
    await page.getByRole('combobox').first().press('Escape');
    await page.getByRole('button',{name:/^Build Deck$/i}).click();
    await page.getByRole('heading',{name:fixture.result.commander,exact:true}).waitFor();
    await page.getByRole('heading',{name:fixture.result.commander,exact:true}).evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-150));
  }
  await page.waitForTimeout(2200);
}
async function main(){
  const browser=await chromium.launch({headless:true});
  for(const name of pages) for(const width of [1280,390]) for(const theme of ['light','dark']){
    const context=await browser.newContext({viewport:{width,height:width===390?844:800},deviceScaleFactor:1,reducedMotion:'no-preference'});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const assets=new Map();const bodies=[];
    page.on('response',res=>{
      if(res.url().startsWith(base+'/_next/static/')&&/\.(js|css)(\?|$)/.test(res.url())) bodies.push(res.body().then(b=>assets.set(res.url(),{type:res.url().includes('.css')?'css':'js',raw:b.length,gzip:zlib.gzipSync(b).length})).catch(()=>{}));
    });
    await instrument(page,theme);
    const cdp=await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await openPage(page,name);
    const perf=await page.evaluate(()=>new Promise(resolve=>{
      const times=[];let prev=0;const start=performance.now();const cls=window.fxMetrics.cls;const canvas=window.fxMetrics.canvas.length;
      function frame(now){if(prev)times.push(now-prev);prev=now;if(now-start<6000){requestAnimationFrame(frame);return;}
        times.sort((a,b)=>a-b);const work=window.fxMetrics.canvas.slice(canvas).sort((a,b)=>a-b);
        const all=Array.from(document.querySelectorAll('body *'));
        resolve({p95:times[Math.floor(times.length*.95)],frames:times.length,longTasks:window.fxMetrics.tasks.filter(x=>x.t>=start),cls:window.fxMetrics.cls,idleCls:window.fxMetrics.cls-cls,lcp:window.fxMetrics.lcp,canvasP95:work[Math.floor(work.length*.95)]||0,canvasMax:Math.max(0,...work),willChange:all.filter(el=>getComputedStyle(el).willChange!=='auto').length,overflow:document.documentElement.scrollWidth>innerWidth,offenders:all.filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)&&getComputedStyle(el).position!=='absolute';}).slice(0,6).map(el=>({tag:el.tagName,cls:el.className?.toString().slice(0,100)}))});
      }requestAnimationFrame(frame);
    }));
    await Promise.all(bodies);
    const bytes={js:0,css:0,jsRaw:0,cssRaw:0};for(const a of assets.values()){bytes[a.type]+=a.gzip;bytes[a.type+'Raw']+=a.raw;}
    const row={phase,page:name,width,theme,...perf,p95:round(perf.p95),lcp:round(perf.lcp),canvasP95:round(perf.canvasP95),canvasMax:round(perf.canvasMax),bytes,errors};
    metrics.push(row);fs.writeFileSync(path.join(dir,phase+'-metrics.json'),JSON.stringify(metrics,null,2));
    await page.screenshot({path:path.join(dir,`${phase==='baseline'?'before-':''}${name}-${theme}-${width}.png`),fullPage:false});
    console.log(JSON.stringify(row));
    await context.close();
  }
  await browser.close();
}
module.exports={instrument,openPage};
if(require.main===module)main().catch(e=>{console.error(e);process.exit(1)});

