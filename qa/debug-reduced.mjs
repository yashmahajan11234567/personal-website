import { chromium } from 'playwright';
const b = await chromium.launch();

// Hypothesis: prefers-reduced-motion forces the SETTLED composition at load,
// which would show the final Data/Cloud boards immediately with no scroll.
for (const motion of ['no-preference', 'reduce']) {
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference',
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  const d = await p.evaluate(() => {
    const q = s => document.querySelector(s);
    const plate = s => {
      const el = q(`[data-plate="${s}"]`);
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return `${cs.visibility} y=${(r.top / innerHeight).toFixed(3)}`;
    };
    return {
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      boardsSettled: q('.cinematic-boards')?.getAttribute('data-settled'),
      heroAttrs: q('.cinematic-hero') ? Array.from(q('.cinematic-hero').attributes).map(a=>a.name).join(',') : null,
      data: plate('data'), cloud: plate('cloud'),
      scrollable: document.documentElement.scrollHeight - window.innerHeight,
      personalRight: (() => { const w=q('.cinematic-type__word--left'); return w? Math.round(w.getBoundingClientRect().left):null; })(),
    };
  });
  console.log(`\n=== prefers-reduced-motion: ${motion} ===`);
  console.log(JSON.stringify(d, null, 1));
  if (errs.length) console.log('errors:', errs);
  await p.screenshot({ path: `qa-screenshots/dbg-motion-${motion}.png` });
  await ctx.close();
}
await b.close();