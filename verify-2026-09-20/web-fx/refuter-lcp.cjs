const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3331';
const RUNS = Number(process.argv[2] || 5);
(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = [];
  for (const theme of ['light', 'dark']) for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(({ theme }) => {
      localStorage.setItem('grimoire-theme', theme);
      window.__lcp = { t: 0, el: '', size: 0, url: '' };
      new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__lcp = { t: e.startTime, el: e.element ? e.element.tagName + '.' + (e.element.className?.toString().slice(0, 50) || '') : '(none)', size: e.size, url: e.url || '' }; } }).observe({ type: 'largest-contentful-paint', buffered: true });
    }, { theme });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => ({ ...window.__lcp, html: document.documentElement.outerHTML.length, svgs: document.querySelectorAll('svg.rune-glyph').length, paths: document.querySelectorAll('svg.rune-glyph path').length }));
    out.push({ theme, run: i, lcp: Math.round(r.t), el: r.el, size: r.size, html: r.html, svgs: r.svgs, paths: r.paths });
    console.log(JSON.stringify(out[out.length - 1]));
    await ctx.close();
  }
  for (const theme of ['light', 'dark']) {
    const v = out.filter(o => o.theme === theme).map(o => o.lcp).sort((a, b) => a - b);
    console.log(`SUMMARY ${theme}: min=${v[0]} median=${v[Math.floor(v.length / 2)]} max=${v[v.length - 1]} all=${v.join(',')}`);
  }
  await browser.close();
})();
