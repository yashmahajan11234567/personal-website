import { chromium } from '@playwright/test';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000); // loading screen
// scroll to boards-settled point
await page.evaluate(async () => {
  const target = document.body.scrollHeight - window.innerHeight * 2;
  for (let y = 0; y <= target; y += 200) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
  window.scrollTo(0, target);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'qa-screenshots-planaudit/live-idle-1440.png' });
// hover data
await page.mouse.move(300, 450); await page.waitForTimeout(600);
await page.screenshot({ path: 'qa-screenshots-planaudit/live-hover-data.png' });
// hover cloud
await page.mouse.move(1140, 450); await page.waitForTimeout(600);
await page.screenshot({ path: 'qa-screenshots-planaudit/live-hover-cloud.png' });
// measured geometry of panels
const geo = await page.evaluate(() => {
  const out = {};
  for (const p of ['data', 'cloud']) {
    const slot = document.querySelector(`[data-testid="board-slot-${p}"]`);
    const scale = document.querySelector(`[data-plate="${p}"] .cinematic-plate__scale`);
    const body = document.querySelector(`[data-plate="${p}"] .cinematic-plate__body`);
    if (slot && scale) {
      const s = slot.getBoundingClientRect(), c = scale.getBoundingClientRect();
      const cs = getComputedStyle(scale), cb = body ? getComputedStyle(body) : null;
      out[p] = {
        slot: { x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.width), h: Math.round(s.height) },
        scale: { w: Math.round(c.width), h: Math.round(c.height), border: cs.borderTopWidth, bg: cs.backgroundColor },
        bodyFont: cb ? cb.fontSize + ' / ' + cb.fontFamily.slice(0, 40) : null
      };
    }
  }
  return out;
});
console.log(JSON.stringify(geo, null, 2));
await b.close();
