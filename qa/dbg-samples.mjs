import { chromium } from 'playwright';
const b = await chromium.launch();
for (const motion of ['no-preference','reduce']) {
  const ctx = await b.newContext({ viewport:{width:1280,height:720},
    reducedMotion: motion==='reduce'?'reduce':'no-preference' });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/', { waitUntil:'networkidle' });
  await p.waitForTimeout(900);
  console.log(`\n=== ${motion} ===`);
  for (const f of [0,0.2,0.25,0.3,0.4,0.5,0.75,1.0]) {
    await p.evaluate(fr=>window.scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)*fr)), f);
    await p.waitForTimeout(650);
    const d = await p.evaluate(() => {
      const el=document.querySelector('[data-plate="data"]');
      const r=el.getBoundingClientRect();
      return {
        rectTop:+(r.top/window.innerHeight).toFixed(4),
        bboxY: null,
        vis:getComputedStyle(el).visibility,
        tf:getComputedStyle(el).transform.slice(0,38),
        scrollY: Math.round(window.scrollY),
        st: (window.ScrollTrigger?window.ScrollTrigger.getAll():[]).map(t=>+t.progress.toFixed(3)),
      };
    });
    const bb = await p.locator('[data-plate="data"]').boundingBox();
    console.log(`  f=${f}  rectTop=${d.rectTop}  bboxY=${(bb.y/p.viewportSize().height).toFixed(4)}  vis=${d.vis}  st=${JSON.stringify(d.st)}  ${d.tf}`);
  }
  await ctx.close();
}
await b.close();