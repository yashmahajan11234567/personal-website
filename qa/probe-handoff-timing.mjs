import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

await p.goto('http://localhost:5173/');
await p.waitForTimeout(600);
const track = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
await p.evaluate((y) => window.scrollTo(0, y), Math.round(track * 0.95));
await p.waitForTimeout(900);

const before = await p.evaluate(() => {
  const hero = document.querySelector('.cinematic-hero');
  return {
    handoffVar: getComputedStyle(hero).getPropertyValue('--handoff-ms'),
    veilDuration: getComputedStyle(document.querySelector('.cinematic-handoff')).animationDuration,
  };
});

await p.click('[data-testid="world-board-data"]');
await p.waitForTimeout(80);

const during = await p.evaluate(() => {
  const hero = document.querySelector('.cinematic-hero');
  const veil = document.querySelector('.cinematic-handoff');
  const slot = document.querySelector('.cinematic-boards__slot--data');
  const vs = getComputedStyle(veil);
  const ss = getComputedStyle(slot);
  return {
    heroVar: getComputedStyle(hero).getPropertyValue('--handoff-ms'),
    veilDuration: vs.animationDuration,
    veilName: vs.animationName,
    veilOpacity: vs.opacity,
    slotDuration: ss.animationDuration,
    slotName: ss.animationName,
    heroPosition: getComputedStyle(hero).position,
  };
});

// Track the veil via rAF inside the page — no screenshot latency.
const curve = await p.evaluate(async () => {
  const veil = document.querySelector('.cinematic-handoff');
  const out = [];
  const t0 = performance.now();
  return await new Promise((resolve) => {
    function tick() {
      const t = performance.now() - t0;
      out.push([Math.round(t), Number(getComputedStyle(veil).opacity).toFixed(3)]);
      if (t < 1000) requestAnimationFrame(tick);
      else resolve(out);
    }
    requestAnimationFrame(tick);
  });
});

console.log('BEFORE:', JSON.stringify(before));
console.log('DURING:', JSON.stringify(during, null, 2));
console.log('\nveil opacity curve (ms -> opacity):');
for (const [t, o] of curve.filter((_, i) => i % 6 === 0)) console.log(`  ${String(t).padStart(4)}  ${o}`);
const full = curve.find(([, o]) => Number(o) >= 0.99);
console.log('\nreaches ~1.0 at:', full ? full[0] + 'ms' : 'never');
await b.close();