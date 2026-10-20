/** Visual verification: Ansible at 80R and the PROJECTS billboard, plus
 * re-run of the Stage-1 interaction suite (positions changed). */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage2-fix';

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
}
function terrainHeight(x, z) {
  const d = Math.abs(x - pathCenterX(z));
  const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  const flatten = smoothstep(4.5, 16, d);
  const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
  const rimZ = smoothstep(-38, -95, z) * 10;
  const tm = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + tm * 2.2;
}

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1500);

// Ansible 80R visual: pin on it, screenshot BEFORE any click
const ax = pathCenterX(80) + 12.5;
const aby = terrainHeight(ax, 80) + 8.7;
await page.evaluate(({ ax, aby }) => {
  window.__cwQaCam = { pos: [ax - 0.4, aby + 1.0, 80 - 13], target: [ax, aby, 80] };
}, { ax, aby });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/ansible-80R-visual.png` });
console.log('ansible visual saved');
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(400);

// Terraform 88R (now the LAST sign before the mountain): visual
const tx = pathCenterX(88) + 11.5;
const tby = terrainHeight(tx, 88) + 8.7;
await page.evaluate(({ tx, tby }) => {
  window.__cwQaCam = { pos: [tx - 0.4, tby + 1.0, 88 - 13], target: [tx, tby, 88] };
}, { tx, tby });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/terraform-88R-visual.png` });
console.log('terraform visual saved');
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(400);

// The stretch after the last skill (z 88 → tunnel 100): vista pin
await page.evaluate(() => {
  function pathCX(z) {
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
  }
  window.__cwQaCam = { pos: [pathCX(92), 8, 90], target: [pathCX(104), 5, 112] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/last-skill-to-tunnel-stretch.png` });
console.log('stretch vista saved');
await page.evaluate(() => { window.__cwQaCam = undefined; });

console.log(`pageErrors=${pageErrors.length}`);
await browser.close();
console.log('DONE');
