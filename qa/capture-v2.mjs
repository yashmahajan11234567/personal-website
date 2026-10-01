/*
 * Capture the hero OPENING (scroll 0) separately from the selection hold.
 *
 * qa/verify-v2.mjs screenshots at the END of its run, after scrolling to the
 * hold, so its v2-*.png files show the plates rather than the headline. These
 * captures are taken at scroll 0 with a fresh page per viewport.
 */
import { chromium } from 'playwright';

const VPS = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1024, height: 768, name: '1024-tablet' },
  { width: 390, height: 844, name: '390-mobile' },
];

const b = await chromium.launch();
for (const vp of VPS) {
  const p = await b.newPage({ viewport: vp });
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1100);
  await p.screenshot({ path: `qa-screenshots/v2-open-${vp.name}.png` });

  // Selection hold, same fresh page.
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `qa-screenshots/v2-hold-${vp.name}.png` });
  await p.close();
  console.log('captured', vp.name);
}
await b.close();
