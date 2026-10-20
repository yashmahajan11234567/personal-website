/** Test instancing and draw calls */
import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', msg => {
  const log = { type: msg.type(), text: msg.text() };
  consoleLogs.push(log);
  console.log(`  [${log.type}] ${log.text}`);
});
page.on('pageerror', err => {
  console.log(`  [error] ${err.message}`);
});

console.log('\n=== Navigating to Cloud World ===');
await page.goto('http://localhost:5195/#/cloud-world');
await page.waitForTimeout(3000);
await page.waitForTimeout(5000);

console.log('\n=== Checking renderer info ===');
const rendererInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return { error: 'No WebGL context' };
  
  // Get draw call info
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (ext) {
    return {
      vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
      renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
    };
  }
  return { vendor: 'N/A', renderer: 'N/A' };
});
console.log('Renderer info:', rendererInfo);

console.log('\n=== Checking for InstancedMesh usage ===');
const instancingCheck = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  
  // We can't directly access three.js internals from here easily
  // But we can check if the scene has instanced meshes by looking at the FPS
  return { timestamp: Date.now() };
});

console.log('\n=== Capture screenshot ===');
await page.screenshot({ path: 'qa-screenshots/instancing-verify.png', fullPage: true });
console.log('Screenshot saved');

console.log('\n=== FrameDriver logs ===');
const frameDriverLogs = consoleLogs.filter(l => l.text.includes('FrameDriver'));
for (const log of frameDriverLogs) {
  console.log(`  [${log.type}] ${log.text}`);
}

console.log('\n=== Composer logs ===');
const composerLogs = consoleLogs.filter(l => l.text.includes('Composer'));
for (const log of composerLogs) {
  console.log(`  [${log.type}] ${log.text}`);
}

console.log('\n=== All logs ===');
for (const log of consoleLogs) {
  console.log(`  [${log.type}] ${log.text}`);
}

await browser.close();
