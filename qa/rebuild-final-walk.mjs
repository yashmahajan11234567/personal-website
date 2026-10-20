import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);
// player's real approach view
await page.evaluate(() => { window.__cwQaCam = { pos: [0, 9, 50], target: [0, 12, 96] }; });
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa-screenshots-polish/final-player-approach.png' });
console.log('shot: final-player-approach');
// walk the tunnel
const walk = async () => {
  for (let i = 0; i < 24; i++) {
    await page.keyboard.down('w');
    await page.waitForTimeout(900);
    await page.keyboard.up('w');
    await page.waitForTimeout(150);
  }
};
await walk();
const end = await page.evaluate(() => {
  const h = window.__cwAvatarHist || [];
  return h.length ? h[h.length - 1] : null;
});
console.log('avatar end:', JSON.stringify(end));
console.log('errors:', JSON.stringify(errors.slice(0, 5)));
await browser.close();
