/** Stage 0 baseline capture: fresh build, current world state at 1440x900.
 * Uses __cwQaCam pins for reproducible camera positions (A/B against later stages).
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-newreq-baseline';

const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', (msg) => {
  const log = { type: msg.type(), text: msg.text() };
  consoleLogs.push(log);
});
page.on('pageerror', (err) => console.log(`  [pageerror] ${err.message}`));

await page.goto(BASE);
// Wait for canvas + WebGL ready, then settle for post-processing/animation.
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(
  () => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    return gl && canvas.width > 0 && canvas.height > 0;
  },
  { timeout: 20000 },
);
await page.waitForTimeout(3000);

console.log('=== 1. Spawn view (default camera) ===');
await page.screenshot({ path: `${OUT}/01-spawn-default.png` });

// Pin camera above/behind spawn looking down-path for a repeatable wide shot.
console.log('=== 2. Pinned wide view of the start area ===');
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 26, -34], target: [0, 1, 14] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/02-start-wide-pinned.png` });

console.log('=== 3. Skill sign approach views (first two signs) ===');
// Walk to the first sign region and capture approach framing.
await page.evaluate(() => {
  window.__cwQaCam = undefined;
});
// Teleport-ish: hold W to travel down path briefly, capture mid-motion.
await page.keyboard.down('w');
await page.waitForTimeout(2500);
await page.keyboard.up('w');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/03-first-signs-approach.png` });

console.log('=== 4. Mountain approach (teleport avatar via hist) ===');
// Use the QA cam to look at the mountain/tunnel entrance from the valley.
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 30, 60], target: [0, 2, 130] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/04-mountain-approach.png` });

console.log('=== 5. Tunnel entrance close (PROJECTS sign + lanterns) ===');
await page.evaluate(() => {
  window.__cwQaCam = { pos: [pathCX(88), 16, 82], target: [pathCX(100), 4, 102] };
  function pathCX(z) {
    const t = Math.min(1, Math.max(0, (z - 92) / (108 - 92)));
    const s = t * t * (3 - 2 * t);
    const out = 1 - s;
    const canyonEnd = Math.min(1, Math.max(0, (z - 168) / (184 - 168)));
    const out2 = 1 - canyonEnd * canyonEnd * (3 - 2 * canyonEnd);
    const amp = out * out2;
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
  }
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/05-tunnel-entrance.png` });

console.log('=== 6. Popup open (skill sign) — grid-scan click ===');
await page.evaluate(() => {
  window.__cwQaCam = undefined;
});
await page.waitForTimeout(500);
// Grid-scan click over the center band until the card title changes.
const found = await page.evaluate(() => {
  const titleEl = document.querySelector('#overlay-title');
  return titleEl ? titleEl.textContent : null;
});
console.log('overlay title before clicks:', found);

// Scan a coarse grid; stop when the cloud card appears in DOM.
let opened = false;
outer: for (let y = 200; y <= 640; y += 60) {
  for (let x = 380; x <= 1100; x += 60) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(120);
    const has = await page.evaluate(
      () => !!document.querySelector('.cloud-card-scrim'),
    );
    if (has) {
      opened = true;
      console.log(`card opened at click (${x},${y})`);
      break outer;
    }
  }
}
if (opened) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/06-skill-card-open.png` });
  const info = await page.evaluate(() => {
    const t = document.querySelector('.cloud-card-title')?.textContent;
    const d = document.querySelector('.cloud-card-desc')?.textContent;
    const btns = Array.from(
      document.querySelectorAll('.cloud-card button, .cloud-card a'),
    ).map((b) => b.textContent?.trim());
    return { t, d, btns };
  });
  console.log('card contents:', JSON.stringify(info, null, 2));
  // Close via Return to World
  const btn = page.locator('.cloud-card-return');
  if ((await btn.count()) > 0) {
    await btn.click();
    await page.waitForTimeout(400);
    const closed = await page.evaluate(
      () => !document.querySelector('.cloud-card-scrim'),
    );
    console.log('card closed after Return to World:', closed);
  }
} else {
  console.log('WARN: no card opened during grid scan');
}

console.log('=== Console summary ===');
const errors = consoleLogs.filter((l) => l.type === 'error');
console.log(`total console msgs: ${consoleLogs.length}, errors: ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log('  [error]', e.text.slice(0, 200)));

await browser.close();
console.log('DONE');
