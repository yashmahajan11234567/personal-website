/** Inspect the ACTUAL title texture layout computed by the app: open the
 * page, replicate getTitleTexture() in the page's own canvas context with
 * real Georgia metrics, and report the line layout + sizes for each project
 * title. Also dump the real canvas texture from a live sign by finding the
 * THREE texture in the scene and reading its image. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1200);

const layout = await page.evaluate(() => {
  const titles = [
    'RxVerify — Digital Prescription Verification',
    'MediGen — OCR Document Pipeline',
    'Go Microservices — Real-Time Balance Visibility',
  ];
  const TITLE_FONT = "Georgia, 'Times New Roman', serif";
  const w = 2048, h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const floor = 300, maxW = w * 0.74, maxH = h * 0.84;

  function wrapTitle(c, title, maxW, maxLines) {
    const words = title.split(/\s+/);
    const lines = [];
    let current = '';
    for (const wd of words) {
      const candidate = current ? current + ' ' + wd : wd;
      if (c.measureText(candidate).width <= maxW || !current) current = candidate;
      else { lines.push(current); current = wd; if (lines.length === maxLines - 1) break; }
    }
    if (current) lines.push(current);
    if (lines.join(' ') !== title) {
      const rest = words.slice(lines.reduce((n, l) => n + l.split(/\s+/).length, 0)).join(' ');
      if (rest) lines[lines.length - 1] += ' ' + rest;
    }
    return lines;
  }

  function fitVertically(c, title, size, n) {
    let s = size;
    for (let i = 0; i < 60; i++) {
      c.font = `bold ${s}px ${TITLE_FONT}`;
      const wrapped = n === 1 ? [title] : wrapTitle(c, title, maxW, n);
      if (wrapped.length > n) return null;
      const widest = Math.max(...wrapped.map((l) => c.measureText(l).width));
      const totalH = s * 1.08 * wrapped.length;
      if (widest <= maxW && totalH <= maxH) return { lines: wrapped, size: s };
      if (s <= floor) {
        if (totalH <= maxH) return { lines: wrapped, size: s };
        return null;
      }
      s -= 12;
    }
    return null;
  }

  const out = [];
  for (const title of titles) {
    let layout = null;
    for (const n of [1, 2, 3]) {
      layout = fitVertically(ctx, title, 520, n);
      if (layout) break;
    }
    if (!layout) {
      ctx.font = `bold ${floor}px ${TITLE_FONT}`;
      layout = { lines: wrapTitle(ctx, title, maxW, 3), size: floor };
    }
    out.push({ title, size: layout.size, lines: layout.lines, widths: layout.lines.map((l) => Math.round(ctx.measureText(l).width)) });
  }
  return out;
});
console.log(JSON.stringify(layout, null, 2));

// Now find the REAL texture on a live project sign and measure its canvas.
const texInfo = await page.evaluate(() => {
  const results = [];
  // Find the scene through the R3F fiber tree
  const canvasEl = document.querySelector('canvas');
  const fiberKey = Object.keys(canvasEl).find((k) => k.startsWith('__reactFiber'));
  let fiber = canvasEl[fiberKey];
  let store = null;
  let depth = 0;
  while (fiber && depth < 30 && !store) {
    let hook = fiber.memoizedState;
    while (hook) {
      if (hook.memoizedState && typeof hook.memoizedState.getState === 'function') { store = hook.memoizedState; break; }
      hook = hook.next;
    }
    fiber = fiber.return; depth++;
  }
  if (!store) return { error: 'no store' };
  const scene = store.getState().scene;
  scene.traverse((obj) => {
    if (obj.isMesh && obj.material && obj.material.map && obj.material.transparent && obj.material.depthWrite === false) {
      const img = obj.material.map.image;
      if (img && img.width === 2048) {
        // This is a title texture. Draw it to a small canvas and read pixels.
        const c2 = document.createElement('canvas');
        c2.width = 512; c2.height = 256;
        const cx2 = c2.getContext('2d');
        cx2.drawImage(img, 0, 0, 512, 256);
        const d = cx2.getImageData(0, 0, 512, 256).data;
        // dark text pixel bbox in the 512x256 downscale
        let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
        const rowHist = new Array(256).fill(0);
        for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
          const i = (y * 512 + x) * 4;
          if (d[i + 3] > 100 && d[i] < 90 && d[i + 1] < 80) { n++; rowHist[y]++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        }
        // count bands
        const bands = [];
        let run = 0;
        for (let y = 0; y <= 256; y++) { if (rowHist[y] > 2) run++; else if (run > 0) { bands.push(run); run = 0; } }
        results.push({ n, bbox: [minX, minY, maxX, maxY], bands, planeScale: [obj.scale.x, obj.scale.y].map((v) => +v.toFixed(2)), worldPos: obj.getWorldPosition(new (Object.getPrototypeOf(obj.position).constructor)()).toArray().map((v) => +v.toFixed(1)) });
      }
    }
  });
  return results;
});
console.log('LIVE title textures:', JSON.stringify(texInfo, null, 2));

await browser.close();
console.log('DONE');
