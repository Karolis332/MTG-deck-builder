import { chromium } from 'playwright';
import fs from 'fs';
const orz = JSON.parse(fs.readFileSync('verify-2026-09-07/optimize-orzhov.json','utf8')).text;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto('https://theblackgrimoire.com/optimizer', { waitUntil: 'networkidle' });
await page.fill('textarea#decklist', orz);
await page.getByRole('button', { name: 'Standard', exact: true }).click();
const [resp] = await Promise.all([
  page.waitForResponse((r) => r.url().includes('/api/optimize')),
  page.locator('button:has-text("Optimize deck")').click(),
]);
const body = await resp.json();
await page.waitForTimeout(1500);
const info = await page.evaluate(() => ({
  checkboxes: document.querySelectorAll('input[type=checkbox]').length,
  cutsHeading: (document.body.innerText.match(/Cuts \(\d+ selected\)/) || [])[0],
  addsHeading: (document.body.innerText.match(/Adds \(\d+ selected\)/) || [])[0],
  optimized: (document.body.innerText.match(/Optimized list\s*\n?\s*\d+ cards/) || [])[0],
  nothing: document.body.innerText.includes('Nothing to cut'),
  errorText: (document.body.innerText.match(/unexpected response[^\n]*/) || [])[0],
}));
console.log(JSON.stringify({ status: resp.status(), apiCuts: body.cuts && body.cuts.length, apiAdds: body.adds && body.adds.length, info, errors }));
await browser.close();
