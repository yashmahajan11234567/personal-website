import { chromium } from 'playwright';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[err]', m.text()); });
  await page.goto('http://localhost:5173/#/data-world');
  await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
  await page.keyboard.press('Enter');
  await sleep(500);
  await page.click('[data-testid="world-index-toggle"]');
  await page.click('[data-testid^="index-skill-"]');
  await page.waitForSelector('[data-testid="panel-back"]', { timeout: 15000 });
  await sleep(400);

  const m = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="panel-back"]');
    const panel = document.querySelector('[data-testid="info-panel"]');
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      text: el.innerText.trim(),
      color: cs.color,
      bg: cs.backgroundColor,
      lineHeight: cs.lineHeight,
      h: Math.round(r.height),
      w: Math.round(r.width),
      html: el.outerHTML.slice(0, 500),
    };
  });
  console.log(JSON.stringify(m, null, 2));
  await page.screenshot({ path: 'qa/_scratch-e/back-contrast-check.png' });
  await browser.close();
})();
