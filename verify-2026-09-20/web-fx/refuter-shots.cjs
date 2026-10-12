const { chromium } = require('playwright');
const fs = require('node:fs');
const fixture = require('./fixture.cjs');
const base = 'http://127.0.0.1:3331';
const dir = __dirname;
const made = [];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const routes = { home: '/', builder: '/builder', commanders: '/commanders', dashboard: '/dashboard' };
  for (const [name, path] of Object.entries(routes)) for (const width of [1280, 390]) for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(t => localStorage.setItem('grimoire-theme', t), theme);
    await page.route('**/api/**', async r => {
      const p = new URL(r.request().url()).pathname;
      if (r.request().method() === 'POST') {
        if (p === '/api/build') return r.fulfill({ json: fixture.result });
        if (p === '/api/analyze') return r.fulfill({ json: fixture.analysis });
        return r.abort();
      }
      return r.continue();
    });
    let status = 'ok';
    try {
      const resp = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 120000 });
      status = 'HTTP ' + (resp ? resp.status() : '?') + ' @ ' + new URL(page.url()).pathname;
      await page.evaluate(() => document.fonts.ready);
      if (name === 'builder') {
        await page.getByRole('combobox').first().fill(fixture.result.commander);
        await page.getByRole('combobox').first().press('Escape');
        await page.getByRole('button', { name: /^Build Deck$/i }).click();
        await page.getByRole('heading', { name: fixture.result.commander, exact: true }).waitFor({ timeout: 60000 });
      }
      await page.waitForTimeout(1800);
      const f = `${dir}/${name}-${theme}-${width}.png`;
      await page.screenshot({ path: f, fullPage: false });
      made.push(`${name}-${theme}-${width}.png (${status})`);
    } catch (e) { made.push(`${name}-${theme}-${width}.png FAILED: ${String(e).split('\n')[0].slice(0, 90)}`); }
    console.log(name, width, theme, status);
    await ctx.close();
  }
  // 6 s hero video, dark, 1280
  const vctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, recordVideo: { dir: dir + '/video-tmp', size: { width: 1280, height: 800 } } });
  const vp = await vctx.newPage();
  await vp.addInitScript(() => localStorage.setItem('grimoire-theme', 'dark'));
  await vp.goto(base + '/', { waitUntil: 'networkidle', timeout: 120000 });
  await vp.evaluate(() => document.fonts.ready);
  await vp.waitForTimeout(6000);
  const video = vp.video();
  await vctx.close();
  const src = await video.path();
  fs.copyFileSync(src, dir + '/hero-dark.webm');
  fs.rmSync(dir + '/video-tmp', { recursive: true, force: true });
  made.push('hero-dark.webm (' + Math.round(fs.statSync(dir + '/hero-dark.webm').size / 1024) + ' KB)');
  console.log(made.join('\n'));
  await browser.close();
})();
