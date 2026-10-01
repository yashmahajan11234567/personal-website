import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);

const probe = async (label) => {
  const d = await p.evaluate(() => {
    const hero = document.querySelector('.cinematic-hero');
    const track = document.querySelector('.cinematic-track') ||
                  document.querySelector('[class*="track"]');
    const plates = ['data','cloud'].map(s => {
      const el = document.querySelector(`[data-plate="${s}"]`);
      if (!el) return { side: s, missing: true };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { side: s, vis: cs.visibility, op: cs.opacity,
               tf: cs.transform.slice(0, 40),
               top: +(r.top / window.innerHeight).toFixed(3),
               h: Math.round(r.height) };
    });
    const words = Array.from(document.querySelectorAll('[class*="word"]')).map(w => {
      const r = w.getBoundingClientRect();
      const cs = getComputedStyle(w);
      return { cls: w.className.slice(0,40), left: Math.round(r.left), right: Math.round(r.right),
               top: Math.round(r.top), op: cs.opacity, tf: cs.transform.slice(0,30) };
    });
    return {
      scrollY: Math.round(window.scrollY),
      docScrollH: document.documentElement.scrollHeight,
      innerH: window.innerHeight,
      scrollable: document.documentElement.scrollHeight - window.innerHeight,
      heroClass: hero?.className,
      heroPos: hero ? getComputedStyle(hero).position : null,
      heroH: hero ? Math.round(hero.getBoundingClientRect().height) : null,
      trackH: track ? Math.round(track.getBoundingClientRect().height) : null,
      heroAttrs: hero ? Array.from(hero.attributes).map(a=>`${a.name}=${a.value}`) : [],
      plates, words,
    };
  });
  console.log(`\n===== ${label} =====`);
  console.log(JSON.stringify(d, null, 1));
};

await probe('AT LOAD (no scrolling)');
await p.screenshot({ path: 'qa-screenshots/dbg-00-load.png' });

// ScrollTrigger internals
const st = await p.evaluate(() => {
  const g = window.ScrollTrigger || (window.gsap && window.gsap.core?.globals?.()?.ScrollTrigger);
  if (!g) return { available: false, keys: Object.keys(window).filter(k=>/scroll|gsap/i.test(k)) };
  return { available: true, count: g.getAll().length,
           triggers: g.getAll().map(t => ({ start: t.start, end: t.end, progress: +t.progress.toFixed(4),
             pin: !!t.pin, scrub: t.vars.scrub })) };
});
console.log('\n===== ScrollTrigger =====');
console.log(JSON.stringify(st, null, 1));

console.log('\n===== ERRORS =====');
console.log(errs.length ? errs.join('\n') : 'none');
await b.close();