import { chromium } from 'playwright';
import fs from 'fs';
const PORT = process.env.PORT || '3010';
const pw = fs.readFileSync('verify-2026-09-07/.readtest-pass', 'utf8').trim();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1890, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
const login = await page.request.post(`http://127.0.0.1:${PORT}/api/auth/login`, { data: { username: 'readtest', password: pw } });
console.log('login', login.status());
await page.goto(`http://127.0.0.1:${PORT}/deck/123`, { waitUntil: 'networkidle', timeout: 180000 });
await page.waitForTimeout(5000);
const info = await page.evaluate(() => {
  const txt = document.body.innerText;
  const card = document.querySelector('.animate-slide-up');
  const fonts = card ? Array.from(card.querySelectorAll('span,div,button')).filter((e) => e.children.length === 0 && e.textContent.trim()).map((e) => parseFloat(getComputedStyle(e).fontSize)) : [];
  const railLabels = Array.from(document.querySelectorAll('[class*="uppercase"]')).map((e) => parseFloat(getComputedStyle(e).fontSize));
  const scrollables = Array.from(document.querySelectorAll('.overflow-y-auto')).map((el) => ({ h: el.clientHeight, sh: el.scrollHeight })).filter((s) => s.sh > s.h + 4);
  const center = document.querySelector('.min-h-0.min-w-0.overflow-y-auto');
  let centerScrolled = null;
  if (center) { center.scrollTop = 400; centerScrolled = center.scrollTop; }
  return {
    bracketTile: /BRACKET/.test(txt),
    commanderSynergyRow: /Commander Synergy/.test(txt),
    bracketButtons: document.querySelectorAll('[title="Target bracket"] button').length,
    feedCards: document.querySelectorAll('.animate-slide-up').length,
    feedFontMin: fonts.length ? Math.min(...fonts) : null,
    feedFontMax: fonts.length ? Math.max(...fonts) : null,
    railLabelFontMin: railLabels.length ? Math.min(...railLabels) : null,
    scrollableCount: scrollables.length,
    centerScrolled,
    bodyScrollHeight: document.documentElement.scrollHeight,
    viewportH: window.innerHeight,
  };
});
await page.screenshot({ path: 'verify-2026-09-07/editor-after-readability.png', fullPage: false });
console.log(JSON.stringify({ info, errors: errors.slice(0, 5) }));
await browser.close();
