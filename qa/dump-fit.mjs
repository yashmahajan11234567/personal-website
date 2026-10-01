import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:720}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
const d=await p.evaluate(()=>Array.from(document.querySelectorAll('.cinematic-type__word')).map(box=>{
  const fit=box.querySelector('.cinematic-type__fit');
  const g=box.querySelector('.cinematic-type__glyphs');
  const r=document.createRange(); r.selectNodeContents(g);
  return {
    text:g.textContent.trim(),
    boxW:box.getBoundingClientRect().width,
    fitClientW:fit.clientWidth,
    inlineStyle:g.getAttribute('style'),
    computedTransform:getComputedStyle(g).transform,
    rangeInkW:r.getBoundingClientRect().width,
    renderedW:g.getBoundingClientRect().width,
  };
}));
console.log(JSON.stringify(d,null,1));
console.log("pageerrors:", errs);
await b.close();
