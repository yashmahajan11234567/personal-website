/** Stage 3b: re-verify the two failed checks with corrected framing.
 * 1) Git sign card — pin the camera directly in front of the Git sign so
 *    only it is in scan range. 2) Narrow viewport — pin the camera to frame
 *    a sign before scanning. */
import { chromium } from 'playwright';

const OUT = 'qa-screenshots-stage3-newreq';
const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push({ t: m.type(), x: m.text() }));
page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));

await page.goto('http://localhost:4173/#/cloud-world');
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  const gl = c?.getContext('webgl2') || c?.getContext('webgl');
  return gl && c.width > 0 && window.__PORTFOLIO__;
}, { timeout: 20000 });
await page.waitForTimeout(2000);

async function openCardByScan(x0, x1, y0, y1) {
  for (let y = y0; y <= y1; y += 40) {
    for (let x = x0; x <= x1; x += 40) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(90);
      const has = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
      if (has) return { x, y };
    }
  }
  return null;
}

console.log('=== Git sign card (camera directly in front, sign fills center) ===');
// Git sign: x=-5.40, z=12, yaw ~153°. Stand the camera on the path ~8u before
// it, looking straight at the board center (~2.9u up).
await page.evaluate(() => {
  window.__cwQaCam = { pos: [-2.2, 3.4, 4.5], target: [-5.4, 2.9, 12] };
});
await page.waitForTimeout(700);
const hit = await openCardByScan(560, 880, 300, 620); // center-only scan
console.log('hit:', hit);
if (hit) {
  const c = await page.evaluate(() => ({
    title: document.querySelector('.cloud-card-title')?.textContent,
    desc: document.querySelector('.cloud-card-desc')?.textContent,
    buttons: document.querySelectorAll('.cloud-card button').length,
    links: document.querySelectorAll('.cloud-card a').length,
  }));
  const expected = await page.evaluate(() => ({
    title: window.__PORTFOLIO__.skills.git.name,
    desc: window.__PORTFOLIO__.skills.git.summary,
  }));
  console.log('card:', JSON.stringify(c));
  console.log('expected:', JSON.stringify(expected));
  console.log(c.title === expected.title && c.desc === expected.desc && c.buttons === 1 && c.links === 0
    ? '✅ GIT CARD PASS (title+desc exact, 1 button, 0 links)'
    : '❌ GIT CARD FAIL');
  await page.screenshot({ path: `${OUT}/01-skill-card-git.png` });
  await page.locator('.cloud-card-return').click();
  await page.waitForTimeout(350);
}

console.log('=== Narrow viewport 390x844 (camera pinned on Docker sign) ===');
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => {
  // Docker sign: x=7.59, z=27, right side. Camera on path looking at it.
  window.__cwQaCam = { pos: [3.4, 3.4, 20], target: [7.6, 2.9, 27] };
});
await page.waitForTimeout(800);
const hit2 = await openCardByScan(60, 340, 200, 640);
console.log('narrow hit:', hit2);
if (hit2) {
  const c = await page.evaluate(() => ({
    title: document.querySelector('.cloud-card-title')?.textContent,
    scrimW: document.querySelector('.cloud-card-scrim')?.getBoundingClientRect().width,
    scrimH: document.querySelector('.cloud-card-scrim')?.getBoundingClientRect().height,
    buttons: document.querySelectorAll('.cloud-card button').length,
  }));
  console.log('narrow card:', JSON.stringify(c));
  console.log(c.scrimW === 390 && c.scrimH === 844 && c.buttons === 1
    ? '✅ NARROW VIEWPORT PASS (scrim covers 390x844, card readable)'
    : '❌ NARROW FAIL');
  await page.screenshot({ path: `${OUT}/04-card-390x844.png` });
  await page.locator('.cloud-card-return').click();
} else {
  console.log('❌ narrow scan missed — saving what the camera sees for diagnosis');
  await page.screenshot({ path: `${OUT}/04-narrow-diagnostic.png` });
}

const errs = logs.filter((l) => l.t === 'error');
console.log(`console: ${logs.length} msgs, ${errs.length} errors`);
await browser.close();
console.log('DONE');
