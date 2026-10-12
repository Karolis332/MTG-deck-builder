const { chromium } = require('playwright');
const fs = require('node:fs');
const base = 'http://127.0.0.1:3331';
const dir = __dirname;
const out = {};
const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return p.slice(0, 3); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  // 1. Reduced motion
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(t => localStorage.setItem('grimoire-theme', t), theme);
    await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(3000);
    const r = await page.evaluate(() => ({
      animations: document.getAnimations().length,
      running: document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.constructor.name) + ':' + (a.effect?.target?.tagName || '')),
      canvases: document.querySelectorAll('.ember-field canvas').length,
      emberFields: document.querySelectorAll('.ember-field').length,
      emberBg: document.querySelector('.ember-field') ? getComputedStyle(document.querySelector('.ember-field')).backgroundImage.slice(0, 40) : null,
      runeOrbitWillChange: document.querySelector('.rune-orbit') ? getComputedStyle(document.querySelector('.rune-orbit')).willChange : null,
      runeOrbitAnim: document.querySelector('.rune-orbit') ? getComputedStyle(document.querySelector('.rune-orbit')).animationName : null,
      energyAnim: document.querySelector('.rune-energy') ? getComputedStyle(document.querySelector('.rune-energy')).animationName : null,
      fireAnim: document.querySelector('.fx-fire') ? getComputedStyle(document.querySelector('.fx-fire'), '::after').animationName : null,
    }));
    // page transition under reduced motion
    await page.click('a[href="/commanders"]').catch(() => {});
    await page.waitForTimeout(150);
    const mid = await page.evaluate(() => ({ cls: document.querySelector('.fx-route')?.className || '', anims: document.getAnimations().filter(a => a.playState === 'running').length }));
    out['reduced-' + theme] = { ...r, afterNavClass: mid.cls, afterNavRunning: mid.anims };
    console.log('REDUCED', theme, JSON.stringify(out['reduced-' + theme]));
    await ctx.close();
  }
  // 2. Contrast + focus
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(t => localStorage.setItem('grimoire-theme', t), theme);
    await page.goto(base + '/methodology', { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(600);
    const c = await page.evaluate(() => {
      const bgOf = el => { let n = el; while (n) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba?\(0, 0, 0, 0\)|transparent/.test(b)) return b; n = n.parentElement; } return getComputedStyle(document.body).backgroundColor; };
      const pick = sel => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { sel, fg: s.color, bg: bgOf(el), size: s.fontSize, weight: s.fontWeight }; };
      const glyph = document.querySelector('.glyph-divider .rune-glyph path:last-of-type');
      const glyphBgEl = document.querySelector('.tome-folio-page');
      const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      return {
        muted: pick('p.text-muted-foreground'),
        body: pick('.tome-dropcap'),
        footer: pick('footer .text-muted-foreground'),
        glyphStroke: glyph ? getComputedStyle(glyph).stroke : null,
        glyphBg: glyphBgEl ? getComputedStyle(glyphBgEl).backgroundColor : null,
        fxCore: cssVar('--fx-core'), fxEmber: cssVar('--fx-ember'), fxViolet: cssVar('--fx-violet'),
      };
    });
    const conv = async (hex) => page.evaluate(h => { const d = document.createElement('div'); d.style.color = h; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, hex);
    const bgPage = await page.evaluate(() => { const f = document.querySelector('.tome-folio-page'); return getComputedStyle(f || document.body).backgroundColor; });
    const rows = [];
    for (const k of ['muted', 'body', 'footer']) if (c[k]) rows.push({ what: k, fg: c[k].fg, bg: c[k].bg, size: c[k].size, ratio: ratio(parse(c[k].fg), parse(c[k].bg)) });
    for (const k of ['fxCore', 'fxEmber', 'fxViolet']) { const rgb = parse(await conv(c[k])); rows.push({ what: k + ' glyph', fg: c[k], bg: bgPage, ratio: ratio(rgb, parse(bgPage)) }); }
    // focus rings on new interactive elements
    const focus = await page.evaluate(async () => {
      const res = [];
      for (const sel of ['.header-nav-link', '.fx-fire', '.tome-lift']) {
        const el = document.querySelector(sel); if (!el) { res.push({ sel, found: false }); continue; }
        const before = getComputedStyle(el).outlineWidth + '|' + getComputedStyle(el).boxShadow.slice(0, 30);
        el.focus();
        await new Promise(r => setTimeout(r, 60));
        const s = getComputedStyle(el);
        res.push({ sel, found: true, tag: el.tagName, before, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, outlineStyle: s.outlineStyle, offset: s.outlineOffset, isFocused: document.activeElement === el });
      }
      return res;
    });
    out['a11y-' + theme] = { contrast: rows, focus };
    console.log('CONTRAST', theme, JSON.stringify(rows));
    console.log('FOCUS', theme, JSON.stringify(focus));
    await ctx.close();
  }
  fs.writeFileSync(dir + '/refuter-a11y.json', JSON.stringify(out, null, 2));
  await browser.close();
})();
