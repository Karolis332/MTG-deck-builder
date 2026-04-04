#!/usr/bin/env node
/**
 * generate_screenshots.js
 *
 * Generates polished marketing screenshots of The Black Grimoire app
 * using Playwright. Used for Overwolf store listing, landing page,
 * Reddit posts, and social media.
 *
 * Usage:
 *   node scripts/generate_screenshots.js              # basic screenshots
 *   node scripts/generate_screenshots.js --with-frames # macOS-style window frames
 *
 * Prerequisites:
 *   - App must be running: npm run dev
 *   - Playwright chromium: npx playwright install chromium
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/* ── Configuration ───────────────────────────────────────────────────── */

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'marketing', 'screenshots');
const VIEWPORT = { width: 1920, height: 1080 };
const LOGIN_CREDENTIALS = { username: 'QuLeR', password: 'grimoire123' };
const WITH_FRAMES = process.argv.includes('--with-frames');

/* ── Page definitions ────────────────────────────────────────────────── */

const PAGES = [
  {
    name: 'login',
    path: '/login',
    requiresAuth: false,
    description: 'Login page — grimoire theme showcase',
    waitForSelector: 'form',
  },
  {
    name: 'landing',
    path: '/landing',
    requiresAuth: false,
    description: 'Marketing landing page',
    waitForSelector: 'h1',
    fullPage: true,
  },
  {
    name: 'deck-builder',
    path: '/deck-builder',
    requiresAuth: true,
    description: 'Main deck list view',
    waitForSelector: 'main',
  },
  {
    name: 'deck-editor',
    path: null, // resolved dynamically from /api/decks
    requiresAuth: true,
    description: 'Deck editor with cards',
    waitForSelector: 'main',
    resolvePath: true,
  },
  {
    name: 'collection',
    path: '/collection',
    requiresAuth: true,
    description: 'Card collection browser',
    waitForSelector: 'main',
  },
  {
    name: 'analytics',
    path: '/analytics',
    requiresAuth: true,
    description: 'Match analytics dashboard',
    waitForSelector: 'main',
  },
  {
    name: 'overlay-game',
    path: '/overlay-game',
    requiresAuth: false,
    description: 'Game overlay (non-Electron preview)',
    waitForSelector: 'main',
  },
];

/* ── Feature crop definitions ────────────────────────────────────────── */

const FEATURE_CROPS = [
  {
    name: 'feature-deck-stats',
    sourcePage: 'deck-editor',
    description: 'Deck stats section',
    // Crop the right-side stats panel — typically in the right third of the screen
    selector: '[class*="deck-stats"], [class*="DeckStats"]',
    // Fallback: crop from coordinates if selector not found
    fallbackClip: { x: 1280, y: 100, width: 600, height: 700 },
  },
  {
    name: 'feature-mana-curve',
    sourcePage: 'deck-editor',
    description: 'Mana curve visualization',
    selector: '[class*="mana-curve"], [class*="ManaCurve"]',
    fallbackClip: { x: 1280, y: 400, width: 600, height: 300 },
  },
  {
    name: 'feature-landing-hero',
    sourcePage: 'landing',
    description: 'Landing page hero section',
    fallbackClip: { x: 0, y: 0, width: 1920, height: 900 },
  },
  {
    name: 'feature-landing-features',
    sourcePage: 'landing',
    description: 'Features grid section',
    selector: '#features',
    fallbackClip: { x: 0, y: 900, width: 1920, height: 700 },
  },
  {
    name: 'feature-landing-pricing',
    sourcePage: 'landing',
    description: 'Pricing cards section',
    selector: '#pricing',
    fallbackClip: { x: 0, y: 2200, width: 1920, height: 700 },
  },
];

/* ── Utilities ───────────────────────────────────────────────────────── */

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.error(`[${ts}] ERROR: ${msg}`);
}

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created directory: ${dir}`);
  }
}

async function checkServerRunning() {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
    return response.ok || response.status === 307 || response.status === 302;
  } catch {
    return false;
  }
}

/* ── macOS Window Frame Renderer ─────────────────────────────────────── */

const FRAME_CONFIG = {
  titleBarHeight: 40,
  borderRadius: 12,
  buttonSize: 12,
  buttonSpacing: 8,
  buttonLeftPad: 16,
  titleFont: '13px -apple-system, "SF Pro Display", "Segoe UI", sans-serif',
  bgColor: '#1e1e1e',
  titleBarBg: '#2d2d2d',
  borderColor: '#3d3d3d',
  shadowBlur: 30,
  shadowOffsetY: 10,
  shadowColor: 'rgba(0, 0, 0, 0.5)',
  padding: 40, // space around the window for shadow
};

/**
 * Wraps a screenshot buffer in a macOS-style window frame using node-canvas.
 * Falls back to raw screenshot if canvas is not available.
 */
async function addWindowFrame(screenshotBuffer, title) {
  let createCanvasFn, loadImageFn;
  try {
    const canvasModule = require('canvas');
    createCanvasFn = canvasModule.createCanvas;
    loadImageFn = canvasModule.loadImage;
  } catch {
    log('  canvas module not available, skipping frame. Install with: npm install canvas');
    return screenshotBuffer;
  }

  const cfg = FRAME_CONFIG;
  const img = await loadImageFn(screenshotBuffer);
  const fw = img.width + cfg.padding * 2;
  const fh = img.height + cfg.titleBarHeight + cfg.padding * 2;

  const canvas = createCanvasFn(fw, fh);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, fw, fh);

  // Drop shadow
  ctx.shadowColor = cfg.shadowColor;
  ctx.shadowBlur = cfg.shadowBlur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = cfg.shadowOffsetY;

  // Window frame background
  const wx = cfg.padding;
  const wy = cfg.padding;
  const ww = img.width;
  const wh = img.height + cfg.titleBarHeight;

  // Rounded rect path
  ctx.beginPath();
  ctx.moveTo(wx + cfg.borderRadius, wy);
  ctx.lineTo(wx + ww - cfg.borderRadius, wy);
  ctx.quadraticCurveTo(wx + ww, wy, wx + ww, wy + cfg.borderRadius);
  ctx.lineTo(wx + ww, wy + wh - cfg.borderRadius);
  ctx.quadraticCurveTo(wx + ww, wy + wh, wx + ww - cfg.borderRadius, wy + wh);
  ctx.lineTo(wx + cfg.borderRadius, wy + wh);
  ctx.quadraticCurveTo(wx, wy + wh, wx, wy + wh - cfg.borderRadius);
  ctx.lineTo(wx, wy + cfg.borderRadius);
  ctx.quadraticCurveTo(wx, wy, wx + cfg.borderRadius, wy);
  ctx.closePath();

  ctx.fillStyle = cfg.bgColor;
  ctx.fill();

  // Reset shadow for subsequent draws
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Title bar
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(wx + cfg.borderRadius, wy);
  ctx.lineTo(wx + ww - cfg.borderRadius, wy);
  ctx.quadraticCurveTo(wx + ww, wy, wx + ww, wy + cfg.borderRadius);
  ctx.lineTo(wx + ww, wy + cfg.titleBarHeight);
  ctx.lineTo(wx, wy + cfg.titleBarHeight);
  ctx.lineTo(wx, wy + cfg.borderRadius);
  ctx.quadraticCurveTo(wx, wy, wx + cfg.borderRadius, wy);
  ctx.closePath();
  ctx.fillStyle = cfg.titleBarBg;
  ctx.fill();
  ctx.restore();

  // Traffic lights (close, minimize, maximize)
  const colors = ['#ff5f57', '#febc2e', '#28c840'];
  const btnY = wy + cfg.titleBarHeight / 2;
  for (let i = 0; i < 3; i++) {
    const btnX = wx + cfg.buttonLeftPad + i * (cfg.buttonSize + cfg.buttonSpacing);
    ctx.beginPath();
    ctx.arc(btnX + cfg.buttonSize / 2, btnY, cfg.buttonSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = colors[i];
    ctx.fill();
  }

  // Title text
  ctx.font = cfg.titleFont;
  ctx.fillStyle = '#aaaaaa';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, wx + ww / 2, btnY);

  // Title bar bottom border
  ctx.strokeStyle = cfg.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(wx, wy + cfg.titleBarHeight);
  ctx.lineTo(wx + ww, wy + cfg.titleBarHeight);
  ctx.stroke();

  // Screenshot content — clip to rounded bottom
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(wx, wy + cfg.titleBarHeight);
  ctx.lineTo(wx + ww, wy + cfg.titleBarHeight);
  ctx.lineTo(wx + ww, wy + wh - cfg.borderRadius);
  ctx.quadraticCurveTo(wx + ww, wy + wh, wx + ww - cfg.borderRadius, wy + wh);
  ctx.lineTo(wx + cfg.borderRadius, wy + wh);
  ctx.quadraticCurveTo(wx, wy + wh, wx, wy + wh - cfg.borderRadius);
  ctx.lineTo(wx, wy + cfg.titleBarHeight);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, wx, wy + cfg.titleBarHeight);
  ctx.restore();

  // Window border
  ctx.strokeStyle = cfg.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(wx + cfg.borderRadius, wy);
  ctx.lineTo(wx + ww - cfg.borderRadius, wy);
  ctx.quadraticCurveTo(wx + ww, wy, wx + ww, wy + cfg.borderRadius);
  ctx.lineTo(wx + ww, wy + wh - cfg.borderRadius);
  ctx.quadraticCurveTo(wx + ww, wy + wh, wx + ww - cfg.borderRadius, wy + wh);
  ctx.lineTo(wx + cfg.borderRadius, wy + wh);
  ctx.quadraticCurveTo(wx, wy + wh, wx, wy + wh - cfg.borderRadius);
  ctx.lineTo(wx, wy + cfg.borderRadius);
  ctx.quadraticCurveTo(wx, wy, wx + cfg.borderRadius, wy);
  ctx.closePath();
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

/* ── Authentication ──────────────────────────────────────────────────── */

async function authenticate(context) {
  log('Authenticating...');
  const page = await context.newPage();

  try {
    const response = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: LOGIN_CREDENTIALS,
    });

    if (!response.ok()) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`Login failed (${response.status()}): ${body.error || 'unknown'}`);
    }

    // The Set-Cookie header from the login response is automatically stored
    // in the browser context by Playwright
    const data = await response.json();
    log(`Authenticated as: ${data.user?.username || 'unknown'}`);
  } finally {
    await page.close();
  }
}

/* ── Screenshot Capture ──────────────────────────────────────────────── */

async function captureScreenshot(context, pageConfig, savedPages) {
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);

  let targetPath = pageConfig.path;
  let navigated = false;

  if (!targetPath) {
    log('  Path not resolved, skipping.');
    await page.close();
    return null;
  }

  // Try primary path, then fallbacks
  const pathsToTry = [pageConfig.path, ...(pageConfig.fallbackPaths || [])];

  for (const tryPath of pathsToTry) {
    try {
      log(`  Navigating to ${tryPath}...`);
      const response = await page.goto(`${BASE_URL}${tryPath}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Check for redirect to login (auth failure) or 404
      const finalUrl = page.url();
      if (pageConfig.requiresAuth && finalUrl.includes('/login')) {
        throw new Error('Redirected to login — auth may have failed');
      }

      // Wait for the main content selector
      if (pageConfig.waitForSelector) {
        await page.waitForSelector(pageConfig.waitForSelector, { timeout: 10000 })
          .catch(() => log(`  Warning: selector "${pageConfig.waitForSelector}" not found, continuing anyway`));
      }

      // Additional wait for dynamic content (charts, images, animations)
      await page.waitForTimeout(2000);

      targetPath = tryPath;
      navigated = true;
      break;
    } catch (err) {
      if (tryPath === pathsToTry[pathsToTry.length - 1]) {
        throw err; // last attempt, propagate
      }
      log(`  Path ${tryPath} failed, trying next fallback...`);
    }
  }

  if (!navigated) {
    await page.close();
    return null;
  }

  // Hide any scrollbars for clean screenshots
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
    `,
  });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Take the screenshot
  const screenshotOpts = {
    type: 'png',
    fullPage: pageConfig.fullPage || false,
  };

  const buffer = await page.screenshot(screenshotOpts);

  // Store page reference for feature crops later
  savedPages[pageConfig.name] = page;

  return buffer;
}

async function captureFeatureCrop(savedPages, cropConfig) {
  const sourceName = cropConfig.sourcePage;

  // Try to find the source page — if it was captured, it should still be open
  const page = savedPages[sourceName];
  if (!page) {
    log(`  Skipping "${cropConfig.name}" — source page "${sourceName}" not available`);
    return null;
  }

  try {
    let clip = null;

    // Try to find element by selector
    if (cropConfig.selector) {
      const element = await page.$(cropConfig.selector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          // Add some padding around the element
          const pad = 20;
          clip = {
            x: Math.max(0, box.x - pad),
            y: Math.max(0, box.y - pad),
            width: box.width + pad * 2,
            height: box.height + pad * 2,
          };
          log(`  Found element "${cropConfig.selector}" at ${Math.round(box.x)},${Math.round(box.y)} (${Math.round(box.width)}x${Math.round(box.height)})`);
        }
      }
    }

    // Fall back to coordinate-based clip
    if (!clip && cropConfig.fallbackClip) {
      clip = cropConfig.fallbackClip;
      log(`  Using fallback clip: ${clip.x},${clip.y} ${clip.width}x${clip.height}`);
    }

    if (!clip) {
      log(`  No clip region found for "${cropConfig.name}"`);
      return null;
    }

    // Use fullPage: true so clips below the viewport fold are captured
    return await page.screenshot({ type: 'png', clip, fullPage: true });
  } catch (err) {
    logError(`  Failed to crop "${cropConfig.name}": ${err.message}`);
    return null;
  }
}

/* ── Dynamic Path Resolution ─────────────────────────────────────────── */

async function resolveDynamicPaths(context) {
  const page = await context.newPage();
  try {
    // Find the deck with the most cards for the best-looking screenshot
    const response = await page.request.get(`${BASE_URL}/api/decks`);
    if (response.ok()) {
      const data = await response.json();
      const decks = data.decks || [];
      if (decks.length > 0) {
        // Pick the deck with the highest card count
        const best = decks.reduce((a, b) => (b.cardCount > a.cardCount ? b : a), decks[0]);
        const deckPage = PAGES.find((p) => p.resolvePath);
        if (deckPage) {
          deckPage.path = `/deck/${best.id}`;
          log(`Resolved deck editor path: /deck/${best.id} (${best.name}, ${best.cardCount} cards)`);
        }
      }
    }
  } catch (err) {
    log(`Warning: Could not resolve dynamic paths: ${err.message}`);
    // Fallback — use deck ID 1
    const deckPage = PAGES.find((p) => p.resolvePath);
    if (deckPage && !deckPage.path) {
      deckPage.path = '/deck/1';
    }
  } finally {
    await page.close();
  }
}

/* ── Main ────────────────────────────────────────────────────────────── */

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  The Black Grimoire — Marketing Screenshot Generator');
  console.log('='.repeat(60));
  console.log('');

  // Check server is running
  log('Checking dev server at ' + BASE_URL + '...');
  const serverUp = await checkServerRunning();
  if (!serverUp) {
    logError('Dev server is not running at ' + BASE_URL);
    logError('Start it first with: npm run dev');
    process.exit(1);
  }
  log('Dev server is running.');

  // Ensure output directory
  await ensureDir(OUTPUT_DIR);
  if (WITH_FRAMES) {
    await ensureDir(path.join(OUTPUT_DIR, 'framed'));
  }

  // Launch browser
  log('Launching Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--force-dark-mode',
      '--disable-gpu',
    ],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    locale: 'en-US',
  });

  const savedPages = {};
  const results = { success: [], failed: [], skipped: [] };

  try {
    // Authenticate
    await authenticate(context);

    // Resolve dynamic paths (e.g., deck editor needs a real deck ID)
    await resolveDynamicPaths(context);

    // Capture each page
    for (const pageConfig of PAGES) {
      const label = `${pageConfig.name} (${pageConfig.path})`;
      log(`Capturing: ${pageConfig.description}...`);

      try {
        const buffer = await captureScreenshot(context, pageConfig, savedPages);
        if (!buffer) {
          results.skipped.push(label);
          log(`  Skipped: ${label}`);
          continue;
        }

        // Save raw screenshot
        const filename = `${pageConfig.name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        log(`  Saved: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
        results.success.push(label);

        // Save framed version
        if (WITH_FRAMES) {
          const title = `The Black Grimoire — ${pageConfig.description}`;
          const framedBuffer = await addWindowFrame(buffer, title);
          const framedPath = path.join(OUTPUT_DIR, 'framed', filename);
          fs.writeFileSync(framedPath, framedBuffer);
          log(`  Saved framed: framed/${filename} (${(framedBuffer.length / 1024).toFixed(0)} KB)`);
        }
      } catch (err) {
        logError(`  Failed "${label}": ${err.message}`);
        results.failed.push(label);
      }
    }

    // Capture feature crops
    log('');
    log('Capturing feature highlights...');

    for (const cropConfig of FEATURE_CROPS) {
      log(`Cropping: ${cropConfig.description}...`);

      try {
        const buffer = await captureFeatureCrop(savedPages, cropConfig);
        if (!buffer) {
          results.skipped.push(`crop:${cropConfig.name}`);
          continue;
        }

        const filename = `${cropConfig.name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        log(`  Saved: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
        results.success.push(`crop:${cropConfig.name}`);

        if (WITH_FRAMES) {
          const title = cropConfig.description;
          const framedBuffer = await addWindowFrame(buffer, title);
          const framedPath = path.join(OUTPUT_DIR, 'framed', filename);
          fs.writeFileSync(framedPath, framedBuffer);
          log(`  Saved framed: framed/${filename}`);
        }
      } catch (err) {
        logError(`  Failed crop "${cropConfig.name}": ${err.message}`);
        results.failed.push(`crop:${cropConfig.name}`);
      }
    }
  } finally {
    // Close all saved pages
    for (const page of Object.values(savedPages)) {
      await page.close().catch(() => {});
    }
    await browser.close();
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('  Summary');
  console.log('='.repeat(60));
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log(`  Successful: ${results.success.length}`);
  console.log(`  Failed:     ${results.failed.length}`);
  console.log(`  Skipped:    ${results.skipped.length}`);
  if (WITH_FRAMES) {
    console.log(`  Framed copies saved to: ${path.join(OUTPUT_DIR, 'framed')}`);
  }
  if (results.failed.length > 0) {
    console.log('');
    console.log('  Failed pages:');
    for (const f of results.failed) {
      console.log(`    - ${f}`);
    }
  }
  console.log('');

  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  logError(`Fatal: ${err.message}`);
  process.exit(1);
});
