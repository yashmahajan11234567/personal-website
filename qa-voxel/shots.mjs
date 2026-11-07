/**
 * Cloud World Voxel — visual QA harness.
 *
 * Loads the PRODUCTION build over http and captures real framebuffer output.
 * Nothing here is a promise that the world looks right; it is the evidence that
 * lets a human decide.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || '5210';
const OUT = new URL('./', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const shots = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(`http://localhost:${PORT}/#/cloud-world-voxel`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__cwv, { timeout: 40000 });
await page.waitForTimeout(3000);

const shot = async (name) => {
  const path = OUT + name + '.png';
  await page.screenshot({ path });
  shots.push(name);
  return path;
};

const stats = async () => page.evaluate(() => {
  const r = window.__cwv.renderer;
  return {
    calls: r.info.render.calls,
    triangles: r.info.render.triangles,
    geometries: r.info.memory.geometries,
    textures: r.info.memory.textures,
    programs: r.info.programs?.length ?? -1,
    pixel: [r.domElement.width, r.domElement.height],
  };
});

const fps = async (ms = 2500) => page.evaluate(async (d) => {
  return await new Promise((res) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => {
      n++;
      if (performance.now() - t0 < d) requestAnimationFrame(tick);
      else res(Math.round((n * 1000) / (performance.now() - t0)));
    };
    requestAnimationFrame(tick);
  });
}, ms);

const place = async (x, z, mode = 'walk', orbit, zoom) => {
  await page.evaluate(([x, z, mode, orbit, zoom]) => {
    window.__cwv.teleport(x, z, mode);
    if (orbit !== null) window.__cwv.view.orbit = orbit;
    if (zoom !== null) window.__cwv.view.zoom = zoom;
  }, [x, z, mode, orbit ?? null, zoom ?? null]);
  await page.waitForTimeout(1600);
};

console.log('--- spawn ---');
await shot('m1-spawn');
console.log('render stats:', JSON.stringify(await stats()));

console.log('--- spawn, zoomed out ---');
await page.evaluate(() => { window.__cwv.view.zoom = 1.7; window.__cwv.view.orbit = 0.5; });
await page.waitForTimeout(1400);
await shot('m1-spawn-wide');

console.log('--- arrival dock / whale ---');
await place(-32, -47.5, 'walk', 1.1, 1.05);
await shot('m1-dock-whale');

console.log('--- ocean crossing (aboard) ---');
await place(-45, -5, 'boat', 0.35, 1.15);
await shot('m1-ocean-travel');

console.log('--- harbour approach ---');
await place(-30, 36, 'boat', -1.5, 1.25);
await shot('m1-harbour-approach');

console.log('--- harbour pier ---');
await place(2, 36, 'walk', -1.3, 1.0);
await shot('m1-harbour-pier');

console.log('--- harbour square / hall ---');
await place(20, 39, 'walk', -2.0, 0.95);
await shot('m1-harbour-square');

console.log('--- gateway + village ---');
await place(33, 42, 'walk', 1.4, 0.85);
await shot('m1-gateway');

console.log('--- village plaza ---');
await place(47, 42, 'walk', 0.6, 0.8);
await shot('m1-village-plaza');

console.log('--- village wide ---');
await place(48, 42, 'walk', 0.75, 1.55);
await shot('m1-village-wide');

console.log('--- skills house front ---');
await place(41, 38, 'walk', 0.1, 0.7);
await shot('m1-skills-house');

console.log('--- beacon islet ---');
await place(64, -37, 'walk', 0.9, 1.0);
await shot('m1-beacon-islet');

console.log('--- panel open ---');
await place(47, 42, 'walk', 0.6, 0.8);
await page.evaluate(() => window.__cwv.open('skills'));
await page.waitForTimeout(900);
await shot('m1-panel-skills');
await page.evaluate(() => window.__cwv.open('projects'));
await page.waitForTimeout(700);
await shot('m1-panel-projects');
await page.evaluate(() => window.__cwv.close());
await page.waitForTimeout(400);

console.log('--- mobile viewport ---');
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await mob.newPage();
const mobErrors = [];
mp.on('pageerror', (e) => mobErrors.push(e.message));
await mp.goto(`http://localhost:${PORT}/#/cloud-world-voxel`, { waitUntil: 'domcontentloaded' });
await mp.waitForFunction(() => window.__cwv, { timeout: 40000 });
await mp.waitForTimeout(3500);
await mp.screenshot({ path: OUT + 'm1-mobile-spawn.png' });
await mp.evaluate(() => { window.__cwv.view.zoom = 1.2; });
await mp.waitForTimeout(1200);
await mp.screenshot({ path: OUT + 'm1-mobile-wide.png' });
const mstats = await mp.evaluate(() => {
  const r = window.__cwv.renderer;
  return { calls: r.info.render.calls, triangles: r.info.render.triangles, pixel: [r.domElement.width, r.domElement.height] };
});
shots.push('m1-mobile-spawn', 'm1-mobile-wide');

console.log('\n=== FPS (desktop 1440x900) ===', await fps(), 'fps');
console.log('=== render stats ===', JSON.stringify(await stats()));
console.log('=== mobile stats ===', JSON.stringify(mstats));
console.log('=== console errors ===', errors.length ? JSON.stringify(errors, null, 1) : 'none');
console.log('=== mobile page errors ===', mobErrors.length ? JSON.stringify(mobErrors) : 'none');
console.log('=== shots ===', shots.join(', '));

await browser.close();
