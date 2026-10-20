/** In-page layout probe with REAL Georgia metrics: replicate the FIXED
 * getTitleTexture algorithm and report line layouts for the 3 project
 * titles + 7 skill titles. Also validates nothing exceeds maxW/maxH. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1000);

const layout = await page.evaluate(() => {
  const TITLE_FONT = "Georgia, 'Times New Roman', serif";
  const w = 2048, h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const floorBig = 120, floorSmall = 96;
  const maxW = w * 0.74, maxH = h * 0.84;

  function wrapTitle(c, title, mw, maxLines) {
    const words = title.split(/\s+/);
    const lines = [];
    let current = '';
    for (const wd of words) {
      const candidate = current ? current + ' ' + wd : wd;
      if (c.measureText(candidate).width <= mw || !current) current = candidate;
      else { lines.push(current); current = wd; if (lines.length === maxLines - 1) break; }
    }
    if (current) lines.push(current);
    if (lines.join(' ') !== title) {
      const rest = words.slice(lines.reduce((n, l) => n + l.split(/\s+/).length, 0)).join(' ');
      if (rest) lines[lines.length - 1] += ' ' + rest;
    }
    return lines;
  }

  function fit(c, title, size, n, floor) {
    let s = size;
    for (let i = 0; i < 60; i++) {
      c.font = `bold ${s}px ${TITLE_FONT}`;
      const wrapped = n === 1 ? [title] : wrapTitle(c, title, maxW, n);
      if (wrapped.length > n) return null;
      const widest = Math.max(...wrapped.map((l) => c.measureText(l).width));
      const totalH = s * 1.08 * wrapped.length;
      if (widest <= maxW && totalH <= maxH) return { lines: wrapped, size: s };
      if (s <= floor) {
        if (widest <= maxW) return { lines: wrapped, size: s };
        return null;
      }
      s -= 12;
    }
    return null;
  }

  function solve(title, big) {
    const floor = big ? floorBig : floorSmall;
    const startSize = big ? 520 : 420;
    let layout = null;
    for (const n of [1, 2, 3]) {
      layout = fit(ctx, title, startSize, n, floor);
      if (layout) break;
    }
    if (!layout) {
      ctx.font = `bold ${floor}px ${TITLE_FONT}`;
      layout = { lines: wrapTitle(ctx, title, maxW, 3), size: floor };
    }
    ctx.font = `bold ${layout.size}px ${TITLE_FONT}`;
    const widest = Math.max(...layout.lines.map((l) => ctx.measureText(l).width));
    const totalH = layout.size * 1.08 * layout.lines.length;
    return { title, size: layout.size, lines: layout.lines, widest: Math.round(widest), fitsW: widest <= maxW, totalH: Math.round(totalH), fitsH: totalH <= maxH, marginPx: Math.round(maxW - widest) };
  }

  const out = [];
  for (const t of [
    'RxVerify — Digital Prescription Verification',
    'Full-Stack AI DevOps Masterclass',
    'Go Microservices — Real-Time Balance Visibility',
  ]) out.push(solve(t, true));
  for (const t of ['Git', 'Docker', 'Health Checks', 'Docker Compose', 'CI/CD', 'Terraform', 'Ansible']) out.push(solve(t, false));
  return out;
});
let allFit = true;
for (const l of layout) {
  const ok = l.fitsW && l.fitsH;
  if (!ok) allFit = false;
  console.log(`${ok ? '✅' : '❌'} ${l.title} — ${l.size}px, ${l.lines.length} line(s), widest ${l.widest} (margin ${l.marginPx}px), totalH ${l.totalH} | ${l.lines.join(' / ')}`);
}
console.log(allFit ? 'ALL LAYOUTS FIT' : 'SOME LAYOUTS OVERFLOW');

await browser.close();
console.log('DONE');
