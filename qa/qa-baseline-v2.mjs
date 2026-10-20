// Stage 0 baseline: consistent-position screenshots + console + movement spot-check.
// Positions mirror the original audit capture set (01-default..05-look-up).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-baseline-v2');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') logs.push(`[${t}] ${m.text().slice(0, 140)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 140)}`));

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(
    () => Array.isArray(window.__cwAvatarHist) && window.__cwAvatarHist.length > 10,
    { timeout: 60000 },
  );
  await page.waitForTimeout(2000);

  // 01 default (spawn, camera behind avatar)
  await page.screenshot({ path: path.join(OUT, '01-default.png') });

  // 02 look left / 03 look right / 04 look down / 05 look up — mouse drags from default
  const reset = async () => {
    await page.mouse.move(720, 450);
  };
  await reset();
  await page.mouse.down();
  await page.mouse.move(500, 450, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '02-look-left.png') });

  await reset();
  await page.mouse.down();
  await page.mouse.move(940, 450, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '03-look-right.png') });

  await reset();
  await page.mouse.down();
  await page.mouse.move(720, 640, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '04-look-down.png') });

  await reset();
  await page.mouse.down();
  await page.mouse.move(720, 260, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '05-look-up.png') });

  // Movement spot-check: W hold 1s (camera-relative, expect +Z into the world)
  const p0 = await page.evaluate(() => {
    const h = window.__cwAvatarHist;
    return h[h.length - 1];
  });
  await page.keyboard.down('w');
  await page.waitForTimeout(1000);
  await page.keyboard.up('w');
  const p1 = await page.evaluate(() => {
    const h = window.__cwAvatarHist;
    return h[h.length - 1];
  });

  const summary = {
    base: BASE,
    move: {
      from: { x: +p0.x.toFixed(2), z: +p0.z.toFixed(2) },
      to: { x: +p1.x.toFixed(2), z: +p1.z.toFixed(2) },
      distIn1s: +Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2),
    },
    consoleIssues: logs,
  };
  fs.writeFileSync(path.join(OUT, 'baseline-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
}

main().catch((e) => { console.error('BASELINE FAILED:', e.message); process.exit(1); });
