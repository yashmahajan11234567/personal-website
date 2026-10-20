// Full journey walkthrough: valley → passage → sunset rings, with a
// screenshot at each stage. Also teleports via debug keys are NOT used; the
// avatar walks the whole path so grounding/visibility is verified en route.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-v2');

async function holdWalk(page, seconds) {
  await page.keyboard.down('w');
  await page.waitForTimeout(seconds * 1000);
  await page.keyboard.up('w');
  await page.waitForTimeout(700); // momentum decay
}

async function pos(page) {
  return page.evaluate(() => {
    const h = window.__cwAvatarHist || [];
    return h.length ? h[h.length - 1] : null;
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '0' ? false : true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 160)}`));
  page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text().slice(0, 160)}`); });

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => Array.isArray(window.__cwAvatarHist) && window.__cwAvatarHist.length > 30, { timeout: 30000 });
  await page.waitForTimeout(1000);

  const shots = [];
  async function snap(name) {
    const p = await pos(page);
    await page.screenshot({ path: path.join(OUT, name) });
    shots.push({ name, z: p ? +p.z.toFixed(1) : null });
    console.log(name, 'at z =', p ? p.z.toFixed(1) : '?');
  }

  await snap('j0-spawn.png');
  await holdWalk(page, 5);   // z ≈ -2 → ~28
  await snap('j1-valley.png');
  await holdWalk(page, 5);   // ~60
  await snap('j2-passage-entry.png');
  await holdWalk(page, 4);   // ~90
  await snap('j3-passage-mid.png');
  await holdWalk(page, 5);   // ~125
  await snap('j4-passage-deep.png');
  await holdWalk(page, 5);   // ~160
  await snap('j5-passage-exit.png');
  await holdWalk(page, 5);   // ~195
  await snap('j6-sunset-entry.png');
  await holdWalk(page, 4);   // ~220 (rings center z=208)
  await snap('j7-sunset-rings.png');

  fs.writeFileSync(path.join(OUT, 'journey.json'), JSON.stringify({ shots, errors: logs }, null, 2));
  console.log('page errors:', logs.length);
  await browser.close();
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
