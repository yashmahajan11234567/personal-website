// Stage 4 acceptance: tree variety, framing, detail, draw calls, FPS, grounding.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-stage4');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '0' ? false : true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => Array.isArray(window.__cwAvatarHist) && window.__cwAvatarHist.length > 10, { timeout: 60000 });
  await page.bringToFront();
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(OUT, 's4-01-default.png') });

  // Look left/right for framing-tree views.
  await page.mouse.move(720, 450); await page.mouse.down();
  await page.mouse.move(520, 450, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 's4-02-look-left.png') });

  await page.mouse.move(720, 450); await page.mouse.down();
  await page.mouse.move(920, 450, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 's4-03-look-right.png') });

  // Draw calls + triangles via FrameDriver DOM instrumentation.
  const perf = await page.evaluate(() => ({
    calls: document.documentElement.dataset.cwDrawCalls
      ? parseInt(document.documentElement.dataset.cwDrawCalls, 10)
      : null,
    tris: document.documentElement.dataset.cwTriangles
      ? parseInt(document.documentElement.dataset.cwTriangles, 10)
      : null,
  }));

  // FPS over 5s (headed only is meaningful).
  const fps = await page.evaluate(async () => {
    const h0 = window.__cwAvatarHist.length;
    await new Promise((r) => setTimeout(r, 5000));
    const h1 = window.__cwAvatarHist.length;
    return ((h1 - h0) / 5).toFixed(1);
  });

  const results = { perf, fps, errors };
  fs.writeFileSync(path.join(OUT, 'stage4-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error('STAGE4 QA FAILED:', e.message); process.exit(1); });
