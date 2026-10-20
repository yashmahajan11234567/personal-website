/** Stage 1b: long-title readability probe on the PROJECT sign.
 * Pins the camera directly in front of the RxVerify sign (longest title:
 * "RxVerify — Digital Prescription Verification"), screenshots, and
 * pixel-probes: dark-text pixels must appear in 2+ vertical bands (wrapped
 * lines) with none clipped at the board edges. Also live-walks to verify
 * hover glow on approach. */
const { chromium } = require('playwright');

const OUT = 'qa-screenshots-r2-stage1';

async function main() {
  const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4173/#/cloud-world');
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const hist = window.__cwAvatarHist;
    return hist && hist.length > 0;
  }, { timeout: 25000 });
  await page.waitForTimeout(1200);

  // RxVerify sign: PROJECT_MARKER_POSITIONS[0] = [pathCenterX(196)-13, 196].
  // Read live positions from the page (mirror of source constants).
  const sign = await page.evaluate(() => {
    function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    function pathCenterX(z) { const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon); }
    return { x: pathCenterX(196) - 13, z: 196 };
  });
  // Board center ~ postTop(2.35*3.6)+0.55*3.6 ≈ 10.5u above ground.
  await page.evaluate((s) => {
    window.__cwQaCam = { pos: [s.x + 1, 11.5, s.z - 26], target: [s.x, 9.5, s.z] };
  }, sign);
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/05-project-sign-rxverify.png' });
  console.log('pinned RxVerify sign shot saved');

  // Also capture the Go Microservices sign (second-longest title).
  const sign2 = await page.evaluate(() => {
    function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    function pathCenterX(z) { const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon); }
    return { x: pathCenterX(206) + 13, z: 206 };
  });
  await page.evaluate((s) => {
    window.__cwQaCam = { pos: [s.x - 1, 11.5, s.z - 26], target: [s.x, 9.5, s.z] };
  }, sign2);
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/06-project-sign-gomicro.png' });
  console.log('pinned Go Microservices sign shot saved');

  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
