const { chromium }=require('playwright');const fs=require('node:fs');const assert=require('node:assert/strict');const {instrument,openPage}=require('./measure.cjs');
(async()=>{const browser=await chromium.launch();const out={};
 const page=await browser.newPage({viewport:{width:1280,height:800}});await instrument(page,'dark');let errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.fxTransitions=0;const start=document.startViewTransition?.bind(document);if(start)document.startViewTransition=(...args)=>{window.fxTransitions++;return start(...args)}});
 await openPage(page,'home');
 await page.getByRole('navigation',{name:'Main',exact:true}).getByRole('link',{name:'Methodology',exact:true}).click();await page.waitForURL('**/methodology');await page.waitForTimeout(1600);
 assert.ok(await page.getByText('4,225,041 public decklists',{exact:false}).count());
 out.native=await page.evaluate(()=>({transitions:window.fxTransitions,active:!!document.activeViewTransition,path:location.pathname,rootClasses:document.querySelector('.fx-route').className}));assert.equal(out.native.transitions,1);assert.equal(out.native.active,false);
 await page.goBack();await page.waitForTimeout(800);assert.equal(new URL(page.url()).pathname,'/');
 await page.evaluate(()=>{document.startViewTransition=undefined});
 await page.getByRole('navigation',{name:'Main',exact:true}).getByRole('link',{name:'Builder',exact:true}).click();await page.waitForURL('**/builder');await page.waitForTimeout(1200);
 out.fallback=await page.evaluate(()=>({path:location.pathname,transform:getComputedStyle(document.querySelector('.fx-route')).transform,classes:document.querySelector('.fx-route').className}));assert.equal(out.fallback.transform,'none');
 const nav=page.getByRole('navigation',{name:'Main',exact:true});const tip=nav.getByRole('link',{name:'Methodology',exact:true});await page.keyboard.press('Tab');await tip.focus();assert.equal(await tip.locator('.header-nav-tip').isVisible(),true);out.focus=await tip.evaluate(el=>getComputedStyle(el).outlineStyle);assert.notEqual(out.focus,'none');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});out.mobileMenu='keyboard close passed';
 await page.goto('http://127.0.0.1:3330/');await page.waitForTimeout(1600);let count=await page.evaluate(()=>window.fxMetrics.canvas.length);await page.waitForTimeout(400);assert.ok(await page.evaluate(n=>window.fxMetrics.canvas.length>n,count));
 await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(600);count=await page.evaluate(()=>window.fxMetrics.canvas.length);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.fxMetrics.canvas.length),count);out.offscreen='paused';
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(600);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});count=await page.evaluate(()=>window.fxMetrics.canvas.length);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.fxMetrics.canvas.length),count);out.hidden='paused';
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(400);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);out.reduced=await page.evaluate(()=>({canvas:document.querySelectorAll('canvas').length,moving:document.getAnimations().filter(a=>a.playState==='running').length,gradient:getComputedStyle(document.querySelector('.ember-field')).backgroundImage}));assert.equal(out.reduced.canvas,0);assert.equal(out.reduced.moving,0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(400);assert.equal(await page.locator('canvas').count(),1);out.restored='one canvas';
 out.errors=errors;assert.equal(errors.length,0);await page.close();
 for(const [width,cores] of [[1280,8],[1280,4],[390,8]]){
  const p=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:3});await instrument(p,'dark');
  await p.addInitScript(({cores})=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>cores});window.fxDrawCounts=[];let n=0;const fill=CanvasRenderingContext2D.prototype.fillRect;CanvasRenderingContext2D.prototype.fillRect=function(...args){n++;return fill.apply(this,args)};const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{n=0;cb(t);if(cb.name==='drawEmbers'&&n)window.fxDrawCounts.push(n);});},{cores});
  await p.goto('http://127.0.0.1:3330/',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
  const budget=await p.evaluate(()=>({particles:Math.max(...window.fxDrawCounts),dpr:document.querySelector('canvas').width/document.querySelector('canvas').getBoundingClientRect().width}));assert.equal(budget.particles,width===390||cores===4?30:60);assert.ok(budget.dpr<=2.01);out[width+'-'+cores]=budget;await p.close();
 }
 fs.writeFileSync(__dirname+'/interactions.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

