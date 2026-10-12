const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const browser=await chromium.launch();const rows=[];
for(const state of ['signed-out','signed-in'])for(const width of [1280,1440,1720,1920]){
 const page=await browser.newPage({viewport:{width,height:800}});
 await page.goto('http://127.0.0.1:3330/fx-check?state='+state,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const row=await page.evaluate(()=>{const header=document.querySelector('header'),r=header.getBoundingClientRect();return {headerWidth:r.width,overflow:document.documentElement.scrollWidth>innerWidth,escaped:Array.from(header.querySelectorAll('a,button')).filter(el=>{const b=el.getBoundingClientRect();return b.width&&(b.right>r.right+.5||b.left<r.left-.5)}).map(e=>e.textContent),labels:Array.from(document.querySelectorAll('.header-nav-label')).map(e=>({text:e.textContent,height:e.getBoundingClientRect().height,display:getComputedStyle(e).display}))}});
 await page.screenshot({path:__dirname+'/header-'+state+'-'+width+'.png'});rows.push({state,width,...row});console.log(JSON.stringify(rows.at(-1)));await page.close();
}fs.writeFileSync(__dirname+'/headers.json',JSON.stringify(rows,null,2));await browser.close()})().catch(e=>{console.error(e);process.exit(1)});
