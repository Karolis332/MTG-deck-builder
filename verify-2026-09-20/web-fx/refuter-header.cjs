const { chromium } = require('playwright');
const fs = require('node:fs');
const base = 'http://127.0.0.1:3331';
const dir = __dirname;
const WIDTHS = [1280, 1440, 1720, 1920];
const results = [];
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const state of ['signed-out', 'signed-in']) for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('grimoire-theme', 'dark'));
    await page.goto(`${base}/fx-check${state === 'signed-in' ? '?state=signed-in' : ''}`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const header = document.querySelector('.site-header');
      const row = document.querySelector('.header-row');
      const hb = header.getBoundingClientRect(), rb = row.getBoundingClientRect();
      const rowStyle = getComputedStyle(row);
      const padL = parseFloat(rowStyle.paddingLeft), padR = parseFloat(rowStyle.paddingRight);
      const innerL = rb.left + padL, innerR = rb.right - padR;
      const kids = Array.from(row.children);
      const navLinks = Array.from(document.querySelectorAll('.header-nav-link'));
      const lineH = navLinks.length ? parseFloat(getComputedStyle(navLinks[0]).lineHeight) : 0;
      const detail = kids.map(el => { const b = el.getBoundingClientRect(); return { cls: el.className.toString().slice(0, 30), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; });
      // A wrapped label is taller than one line box.
      const wrapped = navLinks.concat(Array.from(row.querySelectorAll('a,button,span')))
        .filter(el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 44 && el.childElementCount === 0 && el.textContent.trim(); })
        .map(el => el.textContent.trim().slice(0, 20) + '@' + Math.round(el.getBoundingClientRect().height));
      const escaped = kids.filter(el => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.right > innerR + 0.5 || b.left < innerL - 0.5); })
        .map(el => { const b = el.getBoundingClientRect(); return { cls: el.className.toString().slice(0, 40), overflowRight: Math.round((b.right - innerR) * 10) / 10, overflowLeft: Math.round((innerL - b.left) * 10) / 10 }; });
      return {
        headerLeft: Math.round(hb.left), headerRight: Math.round(hb.right), headerW: Math.round(hb.width),
        rowScrollW: row.scrollWidth, rowClientW: row.clientWidth,
        rowOverflowPx: row.scrollWidth - row.clientWidth,
        docOverflow: document.documentElement.scrollWidth - innerWidth,
        navVisible: navLinks.filter(el => el.getBoundingClientRect().width > 0).length,
        labelsVisible: Array.from(document.querySelectorAll('.header-nav-label')).filter(el => el.getBoundingClientRect().width > 0).map(el => el.textContent),
        headerRowHeight: Math.round(rb.height), lineH, wrapped, escaped, detail,
      };
    });
    results.push({ state, width, ...r });
    console.log(JSON.stringify({ state, width, headerW: r.headerW, hdrL: r.headerLeft, hdrR: r.headerRight, rowOverflowPx: r.rowOverflowPx, docOverflow: r.docOverflow, rowH: r.headerRowHeight, nav: r.navVisible, labels: r.labelsVisible.join('/'), wrapped: r.wrapped.length, escaped: r.escaped.length }));
    if (r.escaped.length) console.log('   ESCAPED:', JSON.stringify(r.escaped));
    if (r.wrapped.length) console.log('   WRAPPED:', JSON.stringify(r.wrapped));
    await page.locator('.site-header').screenshot({ path: `${dir}/header-${state}-${width}.png` }).catch(() => {});
    await ctx.close();
  }
  // Header vs the real tome frame on a folio route.
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base + '/methodology', { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(300);
    const f = await page.evaluate(() => {
      const h = document.querySelector('.site-header').getBoundingClientRect();
      const frame = document.querySelector('.tome-folio-page');
      const fb = frame ? frame.getBoundingClientRect() : null;
      return { hL: Math.round(h.left), hR: Math.round(h.right), fL: fb ? Math.round(fb.left) : null, fR: fb ? Math.round(fb.right) : null, doc: document.documentElement.scrollWidth - innerWidth, corpus: (document.body.innerText.match(/(\d[\d,]{6,})\s+public decklists/) || [])[1] || null, updated: (document.body.innerText.match(/Last updated\s+([0-9-]+)/) || [])[1] || null };
    });
    console.log(JSON.stringify({ frameCheck: width, headerL: f.hL, headerR: f.hR, frameL: f.fL, frameR: f.fR, headerInsideFrame: f.fL !== null ? (f.hL >= f.fL && f.hR <= f.fR) : 'no-frame', docOverflow: f.doc, corpus: f.corpus, updated: f.updated }));
    results.push({ state: 'methodology-frame', width, ...f });
    await ctx.close();
  }
  fs.writeFileSync(dir + '/refuter-headers.json', JSON.stringify(results, null, 2));
  await browser.close();
})();
