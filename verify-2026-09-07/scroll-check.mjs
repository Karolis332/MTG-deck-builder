import { chromium } from 'playwright';
import fs from 'fs';
const PORT = process.env.PORT || '3010';
const pw = fs.readFileSync('verify-2026-09-07/.readtest-pass', 'utf8').trim();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1890, height: 900 } });
const page = await ctx.newPage();
await page.request.post(`http://127.0.0.1:${PORT}/api/auth/login`, { data: { username: 'readtest', password: pw } });
await page.goto(`http://127.0.0.1:${PORT}/deck/123`, { waitUntil: 'networkidle', timeout: 180000 });
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('*')).filter((el) => { const s = getComputedStyle(el); return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 100 && el.offsetParent !== null; });
  return els.map((el) => { const before = el.scrollTop; el.scrollTop = 99999; const after = el.scrollTop; return { cls: el.className.toString().slice(0, 60), h: el.clientHeight, sh: el.scrollHeight, scrolled: after > before }; });
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'verify-2026-09-07/editor-scrolled-bottom.png', fullPage: false });
console.log(JSON.stringify(info));
await browser.close();
