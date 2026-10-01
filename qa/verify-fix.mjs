import { chromium } from 'playwright';
const b = await chromium.launch();

const VIEWPORTS = [
  { w: 1920, h: 1080, name: '1920x1080' },
  { w: 1440, h: 900,  name: '1440x900' },
  { w: 1280, h: 720,  name: '1280x720' },
  { w: 1024, h: 768,  name: '1024x768' },
  { w: 390,  h: 844,  name: '390x844' },
];

const measure = async (p) => p.evaluate(() => {
  const out = { words: [], scrollable: document.documentElement.scrollHeight - innerHeight };
  for (const side of ['left','right']) {
    const el = document.querySelector(`.cinematic-type__word--${side}`);
    if (!el) { out.words.push({side, missing:true}); continue; }
    const r = el.getBoundingClientRect();
    out.words.push({
      side,
      left: +(r.left/innerWidth).toFixed(4),
      right: +(r.right/innerWidth).toFixed(4),
      clippedL: r.left < -0.5,
      clippedR: r.right > innerWidth + 0.5,
      fontPx: Math.round(parseFloat(getComputedStyle(el).fontSize)),
    });
  }
  const d = document.querySelector('[data-plate="data"]');
  out.dataPlateVisibility = getComputedStyle(d).visibility;
  return out;
});

for (const motion of ['no-preference','reduce']) {
  console.log(`\n################ prefers-reduced-motion: ${motion} ################`);
  for (const v of VIEWPORTS) {
    const ctx = await b.newContext({ viewport: { width: v.w, height: v.h },
      reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    const load = await measure(p);
    await p.screenshot({ path: `qa-screenshots/fix-${motion}-${v.name}-load.png` });

    // scroll to the selection hold and re-measure
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight));
    await p.waitForTimeout(900);
    const end = await measure(p);
    await p.screenshot({ path: `qa-screenshots/fix-${motion}-${v.name}-end.png` });

    console.log(`\n--- ${v.name} ---  scrollable=${load.scrollable}px`);
    for (const w of load.words)
      console.log(`  load ${w.side.padEnd(5)} x ${w.left}..${w.right} font ${w.fontPx}px ` +
        (w.clippedL||w.clippedR ? '*** CLIPPED ***' : 'ok'));
    console.log(`  load data-plate visibility: ${load.dataPlateVisibility}`);
    for (const w of end.words)
      console.log(`  end  ${w.side.padEnd(5)} x ${w.left}..${w.right} font ${w.fontPx}px ` +
        (w.clippedL||w.clippedR ? '*** CLIPPED ***' : 'ok'));
    if (errs.length) console.log('  ERRORS:', errs.join(' | '));
    await ctx.close();
  }
}
await b.close();