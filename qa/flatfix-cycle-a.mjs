import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = 'qa-screenshots-flatfix';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene && Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(2500);
for (const [name, cam, target] of [
  ['fix1-approach', [0, 9, 50], [0, 11, 96]],
  ['fix1-frontal', [0, 10, 62], [0, 9, 102]],
  ['fix1-oblique', [-32, 14, 58], [0, 10, 105]],
]) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot:', name);
}
// Closed-mesh probe: pick the LARGEST vertexColors mesh (mountain > terrain by tris now?) —
// better: identify by triangle count AFTER counting all; also sample both LEFT and RIGHT slopes.
const probe = await page.evaluate(() => {
  const scene = window.__cwScene;
  const meshes = [];
  scene.traverse((o) => {
    if (o.type === 'Mesh' && o.material?.vertexColors && o.geometry?.attributes?.position?.count > 1000) {
      meshes.push({ name: o.parent?.type, tris: o.geometry.attributes.position.count / 3 });
    }
  });
  const fp = window.__cwMountainFootprint;
  return { meshes, fp };
});
console.log(JSON.stringify(probe));
console.log('errors:', JSON.stringify(errors.slice(0, 4)));
await browser.close();
