import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

const fracs = [0, 0.10, 0.25, 0.40, 0.50, 0.70, 0.90];
const rows = [];
for (const f of fracs) {
  await p.evaluate((fr) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(max * fr));
  }, f);
  await p.waitForTimeout(700); // let scrub settle
  const d = await p.evaluate(() => {
    const q = s => document.querySelector(s);
    const plate = s => {
      const el = q(`[data-plate="${s}"]`);
      if (!el) return 'missing';
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return `${cs.visibility === 'hidden' ? 'HIDDEN' : 'vis'} y=${(r.top / innerHeight).toFixed(3)}`;
    };
    const word = s => {
      const el = q(`.cinematic-type__word--${s}`);
      if (!el) return 'missing';
      const r = el.getBoundingClientRect();
      return `y=${r.top.toFixed(0)} op=${getComputedStyle(el).opacity} l=${r.left.toFixed(0)} r=${r.right.toFixed(0)}`;
    };
    const hero = q('.cinematic-hero');
    return {
      scrollY: Math.round(scrollY),
      data: plate('data'), cloud: plate('cloud'),
      personal: word('left'), portfolio: word('right'),
      selection: hero?.getAttribute('data-selection'),
      heroTop: hero ? Math.round(hero.getBoundingClientRect().top) : null,
    };
  });
  rows.push([f, d]);
  await p.screenshot({ path: `qa-screenshots/dbg-scroll-${String(Math.round(f*100)).padStart(2,'0')}.png` });
}
console.log('frac  scrollY | DATA plate            | CLOUD plate           | PERSONAL                    | PORTFOLIO');
for (const [f, d] of rows) {
  console.log(`${(f*100).toFixed(0).padStart(4)}%  ${String(d.scrollY).padStart(6)}  | ${d.data.padEnd(21)} | ${d.cloud.padEnd(21)} | ${d.personal.padEnd(26)} | ${d.portfolio}`);
}

// Reverse: scroll back to 0 and check it reverses
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(700);
const back = await p.evaluate(() => {
  const el = document.querySelector('[data-plate="data"]');
  return { vis: getComputedStyle(el).visibility,
           top: +(el.getBoundingClientRect().top / innerHeight).toFixed(3) };
});
console.log('\nAfter scrolling BACK to 0:', JSON.stringify(back));
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();