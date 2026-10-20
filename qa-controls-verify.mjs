// POST-FIX VERIFICATION: all movement keys with direction checks, release-stop,
// mouse-look (OrbitControls), marker clicks, and Escape exit.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

await page.goto('http://localhost:5173/#/cloud-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(4500);

await page.evaluate(async () => {
  const res = performance.getEntriesByType('resource').map((r) => r.name);
  const fiberUrl = res.find((n) => n.includes('@react-three_fiber'));
  const mod = await import(/* @vite-ignore */ fiberUrl);
  for (const [, root] of mod._roots) {
    if (root && root.store) { globalThis.__cwStore = root.store; break; }
  }
  window.__findChar = () => {
    const st = globalThis.__cwStore.getState();
    let char = null;
    st.scene.traverse((obj) => {
      if (char || obj.type !== 'Group') return;
      const kids = obj.children.filter((c) => c.type === 'Mesh');
      if (kids.length !== 4) return;
      const tiny = kids.filter((c) => c.scale.x === 0.15).length;
      if (tiny < 2) return;
      const e = obj.matrixWorld.elements;
      char = { x: +e[12].toFixed(2), y: +e[13].toFixed(2), z: +e[14].toFixed(2) };
    });
    return char;
  };
});

await page.mouse.click(720, 450); // click the game area first, as a player would
await page.waitForTimeout(400);

async function testKey(key, expect) {
  const s0 = await page.evaluate(() => window.__findChar());
  await page.keyboard.down(key);
  await page.waitForTimeout(900);
  const s1 = await page.evaluate(() => window.__findChar());
  await page.keyboard.up(key);
  await page.waitForTimeout(900);
  const s2 = await page.evaluate(() => window.__findChar());
  const dx = +(s1.x - s0.x).toFixed(2);
  const dz = +(s1.z - s0.z).toFixed(2);
  const dist = +Math.hypot(dx, dz).toFixed(2);
  const drift = +Math.hypot(s2.x - s1.x, s2.z - s1.z).toFixed(2);
  const ok = expect === 'none' ? dist < 0.3 : dist > 0.5;
  const dirOk = expect === 'none' || (
    (expect.includes('z-') ? dz < 0 : true) &&
    (expect.includes('z+') ? dz > 0 : true) &&
    (expect.includes('x-') ? dx < 0 : true) &&
    (expect.includes('x+') ? dx > 0 : true)
  );
  const line = `${key}: dist=${dist} (dx=${dx}, dz=${dz}) driftAfterRelease=${drift} => ${ok && dirOk ? 'PASS' : 'FAIL'} (expected ${expect})`;
  console.log(line);
  return ok && dirOk && drift < 0.5;
}

let pass = true;
pass = (await testKey('w', 'z-')) && pass;
pass = (await testKey('s', 'z+')) && pass;
pass = (await testKey('a', 'x-')) && pass;
pass = (await testKey('d', 'x+')) && pass;
pass = (await testKey('ArrowUp', 'z-')) && pass;
pass = (await testKey('ArrowDown', 'z+')) && pass;
pass = (await testKey('ArrowLeft', 'x-')) && pass;
pass = (await testKey('ArrowRight', 'x+')) && pass;
pass = (await testKey('Space', 'none')) && pass;

// Mouse-look: drag rotates the camera (OrbitControls)
const cam0 = await page.evaluate(() => {
  const c = globalThis.__cwStore.getState().camera;
  return { p: c.position.toArray().map((v) => +v.toFixed(3)) };
});
await page.mouse.move(720, 450);
await page.mouse.down();
await page.mouse.move(850, 400, { steps: 15 });
await page.mouse.up();
await page.waitForTimeout(700);
const cam1 = await page.evaluate(() => {
  const c = globalThis.__cwStore.getState().camera;
  return { p: c.position.toArray().map((v) => +v.toFixed(3)) };
});
const camDist = Math.hypot(cam1.p[0] - cam0.p[0], cam1.p[1] - cam0.p[1], cam1.p[2] - cam0.p[2]);
console.log(`MOUSELOOK: cam ${JSON.stringify(cam0.p)} -> ${JSON.stringify(cam1.p)} dist=${camDist.toFixed(3)} => ${camDist > 0.2 ? 'PASS' : 'FAIL'}`);
pass = camDist > 0.2 && pass;

// Marker click still works (overlay child pointer-events) — click the exit button
const exitVisible = await page.evaluate(() => {
  const btn = document.querySelector('.overlay-header .exit-button');
  if (!btn) return false;
  const r = btn.getBoundingClientRect();
  const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return el === btn || btn.contains(el);
});
console.log('EXIT BUTTON clickable:', exitVisible ? 'PASS' : 'FAIL');
pass = exitVisible && pass;

// Escape exits to hero
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
const exited = await page.evaluate(() => !location.hash.includes('cloud-world') && !!document.querySelector('.cloud-world-container') === false);
console.log('ESCAPE exit:', exited ? 'PASS' : `FAIL (hash=${location.hash})`);
pass = exited && pass;

console.log('=== OVERALL:', pass ? 'ALL PASS' : 'FAILURES PRESENT', '===');
console.log('console errors (unique):', [...new Set(consoleErrors)].slice(0, 8));
await page.screenshot({ path: 'D:/Yash/personal-website/qa-screenshots-controls/after-fix.png' });
await browser.close();
