/**
 * Cloud World Voxel — runtime audit harness (game-expert pass), v2.
 */
import { chromium } from 'playwright';

const PORT = process.env.PORT || '5210';
const BASE = `http://localhost:${PORT}/?qa=1#/cloud-world-voxel`;
const OUT = 'qa-voxel/';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const consoleMsgs = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`[${m.type()}] ${m.text()}`);
});
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__cwv, { timeout: 60000 });
await page.waitForTimeout(4000); // warmup: shader compile etc.

await page.evaluate(() => {
  const w = window;
  w.__fpsSamples = [];
  w.__longTasks = [];
  w.__frameTimes = [];
  let last = performance.now();
  let frames = 0;
  let ftAccum = 0;
  const loop = (t) => {
    frames++;
    const dt = t - last;
    ftAccum += dt;
    if (ftAccum >= 1000) {
      w.__fpsSamples.push({ fps: Math.round((frames * 1000) / ftAccum), avgMs: Math.round((ftAccum / frames) * 10) / 10 });
      frames = 0;
      ftAccum = 0;
    }
    last = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__longTasks.push(Math.round(e.duration));
    }).observe({ entryTypes: ['longtask'] });
  } catch {}
});

async function sample(label) {
  await page.waitForTimeout(2600);
  const r = await page.evaluate(() => {
    const i = window.__cwv.renderer.info;
    const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1;
    const cam = window.__cwv.camera.position.toArray().map((v) => Math.round(v * 10) / 10);
    return {
      fps: window.__fpsSamples.slice(-2),
      calls: i.render.calls,
      tris: i.render.triangles,
      geoms: i.memory.geometries,
      progs: i.programs.length,
      heapMB: mem,
      longTasks: window.__longTasks.splice(0),
      mode: window.__cwv.pilot.mode,
      pos: window.__cwv.pilot.pos.toArray().map((v) => Math.round(v * 10) / 10),
      cam,
      camGroundH: window.__cwv.groundAt ? window.__cwv.groundAt(cam[0], cam[2]) : null,
    };
  });
  console.log(`### ${label}: fps=${JSON.stringify(r.fps)} calls=${r.calls} tris=${r.tris} progs=${r.progs} heap=${r.heapMB}MB longTasks=${JSON.stringify(r.longTasks)} mode=${r.mode} pos=${JSON.stringify(r.pos)} cam=${JSON.stringify(r.cam)}`);
  return r;
}

async function shot(name) {
  await page.screenshot({ path: OUT + name + '.png' });
  console.log('shot:', name);
}

const results = {};

results.spawn = await sample('SPAWN idle');
await shot('a-spawn');

await page.keyboard.down('w');
await page.waitForTimeout(2000);
await page.keyboard.up('w');
results.walk = await sample('WALK W 2s');
const walkPos = results.walk.pos;
const walkDelta = results.walk.pos.map((v, i) => v - [-45.5, 2, -47.5][i]);
// camera-relative check: at orbit 0 the camera offset is (+21,+21), so screen-
// forward must move BOTH x and z negative — a pure -z move means the old bug
console.log('WALK DELTA (expect x<0 AND z<0):', JSON.stringify(walkDelta.map((v) => Math.round(v * 100) / 100)));
await shot('a-walk');

await page.keyboard.down('Shift');
await page.keyboard.down('w');
await page.waitForTimeout(1500);
await page.keyboard.up('w');
await page.keyboard.up('Shift');
results.run = await sample('RUN Shift+W 1.5s');

// board at arrival dock
await page.evaluate(() => window.__cwv.teleport(-33, -47.5, 'walk'));
await page.waitForTimeout(700);
const prompt1 = await page.evaluate(() => document.querySelector('.cwv-prompt')?.textContent ?? null);
console.log('dock prompt:', JSON.stringify(prompt1));
await page.keyboard.press('e');
await page.waitForTimeout(250);
const midBoard = await page.evaluate(() => ({ mode: window.__cwv.pilot.mode, pos: window.__cwv.pilot.pos.toArray().map((v) => Math.round(v * 10) / 10), boardFrom: !!window.__cwv.pilot.boardFrom }));
console.log('mid-glide after E (expect boardFrom=true, pos still near pier):', JSON.stringify(midBoard));
await page.waitForTimeout(900);
const afterBoard = await page.evaluate(() => ({ mode: window.__cwv.pilot.mode, pos: window.__cwv.pilot.pos.toArray().map((v) => Math.round(v * 10) / 10), boardFrom: !!window.__cwv.pilot.boardFrom }));
console.log('after E (board, glide done):', JSON.stringify(afterBoard));
await shot('a-aboard');
results.aboard = await sample('ABOARD idle');

await page.keyboard.down('w');
await page.waitForTimeout(3000);
await page.keyboard.up('w');
results.sail = await sample('SAIL W 3s');
await shot('a-sailing');

// disembark at harbour pier
await page.evaluate(() => window.__cwv.teleport(-16, 36, 'boat'));
await page.waitForTimeout(700);
await page.keyboard.press('e');
await page.waitForTimeout(900);
const afterDis = await page.evaluate(() => ({ mode: window.__cwv.pilot.mode, pos: window.__cwv.pilot.pos.toArray().map((v) => Math.round(v * 10) / 10) }));
console.log('after E (disembark):', JSON.stringify(afterDis));
results.harbour = await sample('HARBOUR walk idle');
await shot('a-harbour');

// village sign -> panel
await page.evaluate(() => window.__cwv.teleport(27, 49, 'walk'));
await page.waitForTimeout(800);
const prompt2 = await page.evaluate(() => document.querySelector('.cwv-prompt')?.textContent ?? null);
console.log('village prompt:', JSON.stringify(prompt2));
await page.keyboard.press('e');
await page.waitForTimeout(700);
const panel1 = await page.evaluate(() => document.querySelector('.cwv-panel__title')?.textContent ?? null);
console.log('panel opened:', JSON.stringify(panel1));
await shot('a-panel');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const panel2 = await page.evaluate(() => document.querySelector('.cwv-panel__title')?.textContent ?? null);
console.log('after ArrowRight:', JSON.stringify(panel2));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const closed = await page.evaluate(() => !document.querySelector('.cwv-panel'));
console.log('closed after Esc:', closed);

// village perf + camera clip sweep
await page.evaluate(() => window.__cwv.teleport(47, 42, 'walk'));
results.village = await sample('VILLAGE idle');
await shot('a-village');

let minCamClearance = Infinity;
for (const orbit of [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6]) {
  for (const zoom of [0.5, 1.0, 2.1]) {
    await page.evaluate(([o, z]) => window.__cwv.look(o, z), [orbit, zoom]);
    await page.waitForTimeout(450);
    const c = await page.evaluate(() => {
      const cam = window.__cwv.camera.position.toArray();
      const g = window.__cwv.groundAt ? window.__cwv.groundAt(cam[0], cam[2]) : null;
      return { cam, g };
    });
    if (c.g !== null && c.g !== undefined) {
      const clearance = c.cam[1] - c.g;
      if (clearance < minCamClearance) minCamClearance = Math.round(clearance * 100) / 100;
    }
  }
}
console.log('MIN CAMERA-TO-GROUND CLEARANCE over sweep:', minCamClearance);
await page.evaluate(() => window.__cwv.look(0, 1));
await shot('a-orbit-back');

console.log('\n=== CONSOLE ERRORS/WARNINGS ===');
console.log(consoleMsgs.length ? consoleMsgs.join('\n') : 'none');
console.log('=== PAGE ERRORS ===');
console.log(pageErrors.length ? pageErrors.join('\n') : 'none');
console.log('\n=== JOURNEY ===');
console.log('walk moved:', JSON.stringify(walkPos), '| board:', afterBoard.mode, '| disembark:', afterDis.mode, '| panel:', panel1, '->', panel2, '| closed:', closed);

await browser.close();
