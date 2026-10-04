import { chromium } from 'playwright';
const b = await chromium.launch();
const motion = process.argv[2] || 'no-preference';
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 },
  reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE: '+m.text()); });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

const STEPS = [0,0.10,0.25,0.40,0.50,0.70,0.90];
console.log(`\n### prefers-reduced-motion: ${motion} ###`);
console.log('%6s %8s | %-34s | %-30s | %s' % ('scroll','scrollY','DATA plate','PORTFOLIO word','figure top'));
const hashes = [];
for (const f of STEPS) {
  await p.evaluate(fr => window.scrollTo(0, Math.round((document.documentElement.scrollHeight-innerHeight)*fr)), f);
  await p.waitForTimeout(650);
  const d = await p.evaluate(() => {
    const q=s=>document.querySelector(s);
    const pl=document.querySelector('[data-plate="data"]');
    const cs=getComputedStyle(pl); const r=pl.getBoundingClientRect();
    const w=q('.cinematic-type__word--right');
    const fig=q('.cinematic-figure')||q('[class*="figure"] img');
    return {
      scrollY: Math.round(scrollY),
      data: cs.visibility==='hidden' ? 'HIDDEN' : `vis y=${(r.top/innerHeight).toFixed(3)}`,
      word: w ? `y=${w.getBoundingClientRect().top.toFixed(0)} op=${(+getComputedStyle(w).opacity).toFixed(2)}` : 'n/a',
      fig: fig ? (fig.getBoundingClientRect().top/innerHeight).toFixed(4) : 'n/a',
    };
  });
  hashes.push(d);
  const tag = `seq-${motion}-${String(Math.round(f*100)).padStart(3,'0')}.png`;
  await p.screenshot({ path: `qa-screenshots/${tag}` });
  console.log(`${(f*100).toFixed(0).padStart(5)}% ${String(d.scrollY).padStart(8)} | ${d.data.padEnd(34)} | ${d.word.padEnd(30)} | ${d.fig}`);
}
// reverse check
await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(650);
const back = await p.evaluate(()=>getComputedStyle(document.querySelector('[data-plate="data"]')).visibility);
console.log('\nscroll BACK to 0 -> data plate:', back);

// distinctness check
const uniq = new Set(hashes.map(h=>JSON.stringify(h))).size;
console.log(`distinct states across the 7 samples: ${uniq}/7 ${uniq===7?'(all different -> cinematic progresses)':'(DUPLICATES -> broken)'}`);
console.log('errors:', errs.length?errs.join('\n'):'none');
await b.close();