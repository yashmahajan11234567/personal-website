import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:720}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
const d=await p.evaluate(()=>Array.from(document.querySelectorAll('.cinematic-type__word')).map(box=>{
  const fit=box.querySelector('.cinematic-type__fit');
  const g=box.querySelector('.cinematic-type__glyphs');
  const gr=g.getBoundingClientRect();
  const fr=fit.getBoundingClientRect();
  const br=box.getBoundingClientRect();
  return {
    text:g.textContent.trim(),
    boxRect:[br.left,br.right].map(v=>Math.round(v)),
    fitRect:[fr.left,fr.right].map(v=>Math.round(v)),
    fitOffsetLeft:Math.round(fit.offsetLeft),
    fitWidth:fit.offsetWidth,
    glyphLayoutW:g.offsetWidth,
    glyphScrollW:g.scrollWidth,
    glyphRect:[gr.left,gr.right].map(v=>Math.round(v)),
    transform:getComputedStyle(g).transform,
    // is the glyph rect inside the frame?
    overflowsFrame: gr.right > window.innerWidth,
  };
}));
console.log(JSON.stringify(d,null,1));
await b.close();
