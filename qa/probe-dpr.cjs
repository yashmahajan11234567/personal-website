const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://[::1]:4173/');
  const d = await page.evaluate(() => ({ dpr: window.devicePixelRatio, screen: `${screen.width}x${screen.height}` }));
  console.log(JSON.stringify(d));
  await browser.close();
})();
