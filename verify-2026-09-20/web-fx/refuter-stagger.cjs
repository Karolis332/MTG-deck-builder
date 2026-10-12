const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3331';
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const path of ['/commanders', '/']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base + path, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.tome-stagger').forEach((grid, gi) => {
        const kids = Array.from(grid.children);
        const inView = kids.filter(k => { const b = k.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0; }).length;
        // replicate the shipped formula
        const delays = kids.map((_, i) => (i < 12 ? i * 35 : 0));
        out.push({ grid: gi, children: kids.length, inViewInitially: inView, delaysFirst15: delays.slice(0, 15), tailDelay: delays[delays.length - 1] });
      });
      return out;
    });
    console.log(path, JSON.stringify(r));
    await ctx.close();
  }
  await browser.close();
})();
