import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await p.goto('http://localhost:5173/#/data-world');
await p.waitForTimeout(400);
const worldBg = await p.evaluate(() => {
  const el = document.querySelector('.placeholder-world');
  return el ? getComputedStyle(el).backgroundColor : 'NOT FOUND';
});

// Now the real path: scroll to selection, click, and sample the handoff.
await p.goto('http://localhost:5173/');
await p.waitForTimeout(600);
const track = await p.evaluate(() => document.querySelector('.pin-spacer')?.offsetHeight ?? 0);
await p.evaluate((t) => window.scrollTo(0, t * 0.95), track);
await p.waitForTimeout(900);

const samples = [];
const clickAt = Date.now();
await p.click('[data-testid="world-board-data"]');
// Sample the veil and the chosen plate through the transition.
for (let i = 0; i < 7; i++) {
  await p.waitForTimeout(120);
  samples.push(await p.evaluate((ms) => {
    const hero = document.querySelector('.cinematic-hero');
    const veil = document.querySelector('.cinematic-handoff');
    const chosen = document.querySelector('.cinematic-boards__slot--data');
    const other = document.querySelector('.cinematic-boards__slot--cloud');
    const fig = document.querySelector('.cinematic-figure');
    return {
      t: ms,
      heroHandoff: hero?.hasAttribute('data-handoff') ?? false,
      veilOpacity: veil ? getComputedStyle(veil).opacity : null,
      veilBg: veil ? getComputedStyle(veil).backgroundColor : null,
      chosenScale: chosen ? getComputedStyle(chosen).transform : null,
      otherOpacity: other ? getComputedStyle(other).opacity : null,
      figTransform: fig ? getComputedStyle(fig).transform : null,
      worldPresent: !!document.querySelector('.placeholder-world'),
    };
  }, Date.now() - clickAt));
}
await p.waitForTimeout(600);
const end = await p.evaluate(() => ({
  world: document.querySelector('.placeholder-world h1')?.textContent ?? null,
  worldBg: (() => { const e = document.querySelector('.placeholder-world'); return e ? getComputedStyle(e).backgroundColor : null; })(),
  hash: location.hash,
  heroGone: !document.querySelector('.cinematic-hero'),
}));

console.log('WORLD bg (deep link) :', worldBg);
console.log('WORLD bg (via handoff):', end.worldBg);
console.log('track height:', track);
console.log('\nt(ms)  handoff  veilOpacity  chosenTransform                 otherOpacity  figTransform');
for (const s of samples) {
  console.log(
    String(s.t).padStart(5),
    String(s.heroHandoff).padStart(7),
    String(s.veilOpacity).padStart(11),
    (s.chosenScale || '').padEnd(30).slice(0, 30),
    String(s.otherOpacity).padStart(12),
    (s.figTransform || '').slice(0, 24)
  );
}
console.log('\nEND:', JSON.stringify(end, null, 2));
console.log('ERRORS:', errs.length ? errs : 'none');
await b.close();