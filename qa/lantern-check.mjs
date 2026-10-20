import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://[::1]:4173/#/cloud-world');
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => !!window.__cwLanternMat, { timeout: 20000 });
await page.waitForTimeout(2000);
const pulse = await page.evaluate(async () => {
  const mat = window.__cwLanternMat;
  const samples = [];
  for (let i = 0; i < 16; i++) {
    samples.push(+mat.emissiveIntensity.toFixed(3));
    await new Promise((r) => setTimeout(r, 200));
  }
  return { min: Math.min(...samples), max: Math.max(...samples), n: samples.length, samples };
});
console.log('lantern pulse ~3.2s:', JSON.stringify(pulse));
await browser.close();
