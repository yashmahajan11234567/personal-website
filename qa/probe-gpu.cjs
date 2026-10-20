const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  await page.goto('http://[::1]:4173/');
  const info = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { error: 'no webgl' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'masked',
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'masked',
    };
  });
  console.log(JSON.stringify(info));
  await browser.close();
})();
