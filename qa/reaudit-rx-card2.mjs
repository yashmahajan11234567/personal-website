import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);
const pos = await page.evaluate(() => {
  let hit = null;
  window.__cwScene.traverse((o) => {
    if (o.material?.map?.isCanvasTexture && o.material.map.image?.width === 2048) {
      const wp = new (Object.getPrototypeOf(o.position).constructor)();
      o.getWorldPosition(wp);
      if (o.scale.x > 6.7 && wp.z > 190 && wp.z < 200) hit = { x: wp.x, y: wp.y, z: wp.z };
    }
  });
  return hit;
});
console.log('rxverify sign:', JSON.stringify(pos));
await page.evaluate(([p]) => {
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3-2*t); };
  const pcx = (z) => { const c = ss(92,108,z)*(1-ss(168,184,z)); return (2.5*Math.sin(z*0.05)+1.5*Math.sin(z*0.13+2.0))*(1-0.75*c); };
  window.__cwQaCam = { pos: [pcx(p.z - 14), 5.5, p.z - 14], target: [p.x, p.y, p.z] };
}, [pos]);
await page.waitForTimeout(900);
for (const [dy, dx] of [[0,0],[-60,0],[60,0],[0,-60],[0,60]]) {
  await page.mouse.click(720 + dx, 450 + dy);
  await page.waitForTimeout(600);
  if (await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'))) break;
}
const card = await page.evaluate(() => ({
  title: document.querySelector('.cloud-card-title')?.textContent,
  desc: document.querySelector('.cloud-card-desc')?.textContent?.slice(0, 160),
  chips: document.querySelector('.cloud-card-chips')?.textContent,
  link: document.querySelector('.cloud-card-github')?.href,
}));
console.log(JSON.stringify(card, null, 1));
await page.screenshot({ path: 'qa-screenshots-redesign/reaudit-rxverify-card.png' });
await browser.close();
