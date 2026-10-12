const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3331';
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.addInitScript(t => localStorage.setItem('grimoire-theme', t), theme);
    await page.goto(base + '/methodology', { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(700);
    await page.locator('.glyph-divider').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    const box = await page.locator('.glyph-divider').first().boundingBox();
    const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
    const b64 = shot.toString('base64');
    const r = await page.evaluate(async (b64) => {
      const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
      const bmp = await createImageBitmap(blob);
      const cv = new OffscreenCanvas(bmp.width, bmp.height);
      const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0);
      const d = cx.getImageData(0, 0, bmp.width, bmp.height).data;
      const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
      // Background = modal colour of the strip (the divider is mostly background).
      const counts = new Map();
      for (let i = 0; i < d.length; i += 4) { const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; counts.set(k, (counts.get(k) || 0) + 1); }
      const bgKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const bg = bgKey.split(',').map(Number);
      const lbg = lum(...bg);
      const rat = c => { const l = lum(...c); return (Math.max(l, lbg) + 0.05) / (Math.min(l, lbg) + 0.05); };
      let max = 0, maxC = null; const all = [];
      for (let i = 0; i < d.length; i += 4) { const c = [d[i], d[i + 1], d[i + 2]]; const v = rat(c); all.push(v); if (v > max) { max = v; maxC = c; } }
      all.sort((a, b) => b - a);
      const round = n => Math.round(n * 100) / 100;
      return { bg, px: all.length, max: round(max), maxColor: maxC, top1pct: round(all[Math.floor(all.length * 0.01)]), top5pct: round(all[Math.floor(all.length * 0.05)]), pctAbove3: round(100 * all.filter(v => v >= 3).length / all.length) };
    }, b64);
    console.log(JSON.stringify({ theme, ...r }));
    await ctx.close();
  }
  await browser.close();
})();
