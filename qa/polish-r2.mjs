import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = 'qa-screenshots-polish';
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
const shots = [
  ['r2-vista', [0, 9, 50], [0, 11, 98]],
  ['r2-frontal', [0, 10, 62], [0, 9, 102]],
  ['r2-entrance', [0, 7, 84], [0, 8, 102]],
];
for (const [name, cam, target] of shots) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot:', name);
}
// live clearance audit
const audit = await page.evaluate(() => {
  const boxes = window.__cwMountainDomes || [];
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3-2*t); };
  const pcx = (z) => { const c = ss(92,108,z)*(1-ss(168,184,z)); return (2.5*Math.sin(z*0.05)+1.5*Math.sin(z*0.13+2.0))*(1-0.75*c); };
  const th = (x, z) => { const d = Math.abs(x - pcx(z));
    const sw = 2.6*Math.sin(x*0.021+1.3)*Math.cos(z*0.017-0.7) + 1.9*Math.sin(x*0.043-2.1)*Math.sin(z*0.036+1.1);
    const md = 0.55*Math.sin(x*0.11+1.7)*Math.sin(z*0.09+0.6) + 0.4*Math.cos(z*0.16+x*0.05+0.8);
    const fn = 0.18*Math.sin(x*0.37+z*0.31)*Math.sin(z*0.23-x*0.19);
    const fl = ss(4.5, 16, d); const rx = ss(55,105,Math.abs(x))*14; const rz = ss(-38,-95,z)*10;
    return (sw + md*0.55 + fn)*fl + rx + rz + (1 - ss(-95,-72,z))*2.2; };
  const margin = 5.2*0.22 + 0.5;
  let blockers = 0;
  for (const b of boxes) {
    for (let z = 98; z <= 172; z += 2) {
      const cx = pcx(z);
      for (const dx of [0, -4.4, 4.4]) for (const h of [0.5, 2.5, 4.5]) {
        const gy = th(cx, z);
        if (Math.abs(cx+dx-b.x) < b.sx + margin && Math.abs(z-b.z) < b.sz + margin &&
            gy + h > b.y - b.sy - margin && gy + h < b.y + b.sy + margin) { blockers++; z = 999; break; }
      }
      if (z === 999) break;
    }
  }
  return { masses: boxes.length, blockers, mountFace: window.__cwMountFace };
});
console.log(JSON.stringify(audit));
console.log('errors:', JSON.stringify(errors.slice(0, 5)));
await browser.close();
