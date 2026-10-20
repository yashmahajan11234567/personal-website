const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:4173/');
  const out = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 1024;
    const ctx = c.getContext('2d');
    const FONT = "Georgia, 'Times New Roman', serif";
    function wrapTitle(title, maxW, maxLines) {
      const words = title.split(/\s+/);
      const lines = []; let cur = '';
      for (const wd of words) {
        const cand = cur ? cur + ' ' + wd : wd;
        if (ctx.measureText(cand).width <= maxW || !cur) cur = cand;
        else { lines.push(cur); cur = wd; if (lines.length === maxLines - 1) break; }
      }
      if (cur) lines.push(cur);
      return lines;
    }
    const titles = ['RxVerify — Digital Prescription Verification','MediGen — OCR Document Pipeline','Go Microservices — Real-Time Balance Visibility','Full-Stack AI DevOps Masterclass'];
    const maxW = 2048 * 0.74, maxH = 1024 * 0.84, floor = 300;
    const res = [];
    for (const t of titles) {
      let layout = null;
      for (const n of [1, 2, 3]) {
        let s = 520;
        for (let i = 0; i < 60; i++) {
          ctx.font = 'bold ' + s + 'px ' + FONT;
          const wrapped = n === 1 ? [t] : wrapTitle(t, maxW, n);
          const widest = Math.max(...wrapped.map(l => ctx.measureText(l).width));
          const totalH = s * 1.08 * wrapped.length;
          if (widest <= maxW && totalH <= maxH) { layout = { n: wrapped.length, s, wrapped }; break; }
          if (s <= floor) { if (totalH <= maxH) layout = { n: wrapped.length, s, wrapped }; break; }
          s -= 12;
        }
        if (layout) break;
      }
      res.push({ t, layout });
    }
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
