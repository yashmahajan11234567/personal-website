import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 500)));
await page.goto('http://localhost:5210/#/cloud-world-voxel', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(5000);
  const st = await page.evaluate(() => ({ cwv: !!window.__cwv, ready: window.__cwv?.view?.ready }));
  console.log(`t=${(i + 1) * 5}s cwv=${st.cwv} ready=${st.ready}`);
  if (st.cwv) break;
}
await browser.close();
