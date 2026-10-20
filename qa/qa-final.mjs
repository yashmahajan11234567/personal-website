// Stage 7 final functional regression: markers, overlay, exit, journey shots.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-final');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '0' ? false : true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => Array.isArray(window.__cwAvatarHist) && window.__cwAvatarHist.length > 10, { timeout: 60000 });
  await page.bringToFront();
  await page.waitForTimeout(2500);

  const results = {};

  // 1. Skill marker click → overlay content updates.
  // Markers live at (±4, z -20..70). The nearest pair to spawn is (±4, -20)
  // — behind spawn (camera looks +Z). Walk forward ~25s? Too slow headless;
  // instead verify via DOM after clicking the projected marker. Simpler and
  // robust: check the overlay elements exist and labels are rendered.
  const overlayOk = await page.evaluate(() => {
    const title = document.getElementById('overlay-title');
    const body = document.getElementById('overlay-body');
    const labels = document.querySelectorAll('.skill-label-content');
    return {
      title: title ? title.textContent : null,
      bodyExists: !!body,
      skillLabelCount: labels.length,
      exitButton: !!document.querySelector('.exit-button'),
    };
  });
  results.overlay = overlayOk;

  // 2. Click a skill marker via raycast: move mouse to where the first
  //    visible marker projects. Robust approach: walk to markers.
  //    Walk forward (W) ~8s to reach the z=10 marker pair, then click center.
  await page.keyboard.down('w');
  await page.waitForTimeout(8000);
  await page.keyboard.up('w');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'f1-mid-valley.png') });

  // Click near center-frame where a marker should be visible after walking.
  await page.mouse.click(720, 430);
  await page.waitForTimeout(400);
  const overlayAfterClick = await page.evaluate(() => ({
    title: document.getElementById('overlay-title')?.textContent,
    bodySnippet: document.getElementById('overlay-body')?.textContent?.slice(0, 80),
  }));
  results.overlayAfterClick = overlayAfterClick;

  // 3. Escape exits to hero.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  const exited = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const hero = document.querySelector('h1');
    return {
      canvasGone: !canvas,
      heroText: hero ? hero.textContent : null,
      url: location.hash,
    };
  });
  results.escapeExit = exited;

  results.errors = errors;
  fs.writeFileSync(path.join(OUT, 'final-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error('FINAL QA FAILED:', e.message); process.exit(1); });
