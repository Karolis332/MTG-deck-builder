const {chromium}=require('playwright');const fs=require('fs');const {instrument,openPage}=require('./measure.cjs');
(async()=>{const browser=await chromium.launch();const results=[];
for(const width of [1280,390])for(const theme of ['light','dark'])for(const name of ['home','builder','commanders','dashboard/fx-check','optimizer','download','commanders/the-ur-dragon']){
 const page=await browser.newPage({viewport:{width,height:width===390?844:800}});await instrument(page,theme);await openPage(page,name);
 await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
 const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,offenders:Array.from(document.querySelectorAll('body *')).filter(el=>{const b=el.getBoundingClientRect();return b.width&&b.height&&!el.closest('svg')&&getComputedStyle(el).position!=='absolute'&&(b.right>innerWidth+1||b.left< -1)}).slice(0,6).map(el=>({tag:el.tagName,class:el.className,text:el.textContent.slice(0,60)}))}));
 let violations=[];
 if(width===390){await page.addScriptTag({path:'C:/Users/QuLeR/black-grimoire-web/node_modules/axe-core/axe.min.js'});violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:['color-contrast']});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});}
 const label=name==='dashboard/fx-check'?'dashboard':name.replaceAll('/','-');
 await page.screenshot({path:__dirname+'/'+(label==='dashboard'?'':'review-')+label+'-'+theme+'-'+width+'.png'});
 const row={page:name,width,theme,overflow,violations};results.push(row);fs.writeFileSync(__dirname+'/responsive.json',JSON.stringify(results,null,2));console.log(JSON.stringify({page:name,width,theme,overflow:overflow.width>width,violations:violations.flatMap(v=>v.nodes).length,offenders:overflow.offenders}));await page.close();
}
 const table=await browser.newPage({viewport:{width:1720,height:960}});await instrument(table,'dark');await openPage(table,'dashboard/fx-matches');await table.addStyleTag({content:'nextjs-portal{display:none!important}'});
 const tableAfter=await table.evaluate(()=>({width:document.documentElement.scrollWidth,tableWidth:document.querySelector('table').scrollWidth,containerWidth:document.querySelector('table').parentElement.clientWidth}));
 await table.screenshot({path:__dirname+'/dashboard-table-dark-1720.png'});
 await table.addStyleTag({content:'.dashboard-content,.dashboard-content.parent{min-width:auto!important}.dashboard-content{padding:24px!important}'});await table.evaluate(()=>document.querySelector('.dashboard-content').parentElement.style.minWidth='auto');
 const tableBefore=await table.evaluate(()=>document.documentElement.scrollWidth);fs.writeFileSync(__dirname+'/dashboard-table.json',JSON.stringify({after:tableAfter,beforeWithOriginalFlex:tableBefore},null,2));console.log(JSON.stringify({tableAfter,tableBefore}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
