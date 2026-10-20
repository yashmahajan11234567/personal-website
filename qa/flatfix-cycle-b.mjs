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
// closer oblique + board/entrance detail
for (const [name, cam, target] of [
  ['fix2-oblique-close', [-28, 13, 48], [0, 12, 100]],
  ['fix2-board-detail', [0, 8, 66], [0, 14, 98]],
]) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot:', name);
}
// ALL FOUR category signs + board detail already covered; tunnel walk:
await page.waitForFunction(() => window.__cwAvatar && typeof window.__cwAvatar.position.z === 'number', { timeout: 15000 });
const before = await page.evaluate(() => window.__cwAvatar.position.z);
const walk = async () => {
  for (let i = 0; i < 26; i++) { await page.keyboard.down('w'); await page.waitForTimeout(850); await page.keyboard.up('w'); await page.waitForTimeout(120); }
};
await walk();
const after = await page.evaluate(() => window.__cwAvatar.position.z);
console.log('avatar z before:', before, ' after:', after);
await page.screenshot({ path: `${OUT}/fix2-tunnel-exit.png` });
console.log('shot: fix2-tunnel-exit');
console.log('errors:', JSON.stringify(errors.slice(0, 4)));
await browser.close();
