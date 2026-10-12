const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3331';
const dir = __dirname;
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const width of [1720]) for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(t => localStorage.setItem('grimoire-theme', t), theme);
    await page.goto(base + '/methodology', { waitUntil: 'networkidle', timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/methodology-${theme}-${width}.png` });
    const t = await page.evaluate(() => document.body.innerText.slice(0, 700));
    console.log(theme, width, JSON.stringify((t.match(/Last updated[^\n]*/) || [])[0]), JSON.stringify((t.match(/[\d,]{7,} public decklists/) || [])[0]));
    await ctx.close();
  }
  await browser.close();
})();
