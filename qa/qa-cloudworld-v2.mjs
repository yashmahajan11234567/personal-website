// Cloud World QA: screenshots + interaction measurements.
// Usage: node qa/qa-cloudworld-v2.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5195/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-v2');

async function waitScene(page) {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    return gl && c.width > 0 && c.height > 0;
  }, { timeout: 20000 });
  await page.waitForTimeout(3000);
}

// Read the character position from the R3F scene graph via the DOM canvas.
// We expose nothing from the app, so we instead locate the white avatar mesh
// by scanning the scene: THREE is bundled, so we use a r3f-agnostic probe —
// the store attached to the canvas element (__r3f root).
async function sceneState(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const root = canvas && (canvas.__r3f || (canvas.parentNode && canvas.parentNode.__r3f));
    if (!root) return null;
    const scene = root.scene || (root.getState && root.getState().scene);
    if (!scene) return null;
    const camera = root.camera || (root.getState && root.getState().camera);
    const state = { camera: camera ? { x: camera.position.x, y: camera.position.y, z: camera.position.z } : null, objects: [] };
    // Count visible meshes to sanity-check the scene actually rendered.
    let meshes = 0;
    scene.traverse(() => { meshes++; });
    state.meshes = meshes;
    return state;
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await waitScene(page);

  // ---- 1. Default view screenshot ----
  await page.screenshot({ path: path.join(OUT, '01-default.png') });

  // ---- 2. Idle stability: 10s, no input ----
  const before = await sceneState(page);
  await page.waitForTimeout(10000);
  const after = await sceneState(page);
  fs.writeFileSync(
    path.join(OUT, 'idle-test.json'),
    JSON.stringify({ before, after }, null, 2),
  );

  // ---- 3. Movement tests: W / S / A / D and arrows ----
  const results = {};
  for (const [label, key] of [
    ['w', 'w'], ['s', 's'], ['a', 'a'], ['d', 'd'],
    ['ArrowUp', 'ArrowUp'], ['ArrowDown', 'ArrowDown'],
    ['ArrowLeft', 'ArrowLeft'], ['ArrowRight', 'ArrowRight'],
  ]) {
    const p0 = await sceneState(page);
    await page.keyboard.down(key);
    await page.waitForTimeout(1000);
    await page.keyboard.up(key);
    await page.waitForTimeout(600); // let momentum decay
    const p1 = await sceneState(page);
    results[label] = { p0, p1 };
  }
  fs.writeFileSync(path.join(OUT, 'movement-test.json'), JSON.stringify(results, null, 2));

  // ---- 4. Screenshots of key views ----
  await page.keyboard.down('w');
  await page.waitForTimeout(4000);
  await page.keyboard.up('w');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '02-mid-path.png') });

  // Mouse-look test: drag to rotate the camera.
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(920, 450, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const camAfterLook = await sceneState(page);
  fs.writeFileSync(path.join(OUT, 'mouselook-test.json'), JSON.stringify(camAfterLook, null, 2));
  await page.screenshot({ path: path.join(OUT, '03-after-mouselook.png') });

  // ---- 5. Cloud drift: two screenshots 10s apart, no input ----
  await page.screenshot({ path: path.join(OUT, '04-clouds-t0.png') });
  await page.waitForTimeout(10000);
  await page.screenshot({ path: path.join(OUT, '05-clouds-t10s.png') });

  fs.writeFileSync(path.join(OUT, 'console.log'), logs.join('\n'));
  console.log('QA COMPLETE. Screenshots + data in', OUT);
  console.log('--- console logs (last 20) ---');
  logs.slice(-20).forEach((l) => console.log(l));

  await browser.close();
}

main().catch((e) => {
  console.error('QA FAILED:', e);
  process.exit(1);
});
