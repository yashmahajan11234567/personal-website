import { chromium } from 'playwright';

const OUT = 'qa-screenshots/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

await p.goto('http://localhost:5173/');
await p.waitForTimeout(1200);

// Capture at the same 12 fractions used for the video contact sheet, so the two
// sets can be compared with identical metrics.
const fracs = [0, 0.042, 0.083, 0.125, 0.167, 0.208, 0.25, 0.29, 0.333,
               0.417, 0.5, 0.95];
for (const f of fracs) {
  const track = await p.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  await p.evaluate((y) => window.scrollTo(0, y), Math.round(track * f));
  await p.waitForTimeout(950); // scrub 0.6 must settle
  const pct = String(Math.round(f * 100)).padStart(2, '0');
  await p.screenshot({ path: `${OUT}myshot-${pct}.png` });
}

console.log('captured', fracs.length, 'frames at 1280x720');
console.log('errors:', errs.length ? errs : 'none');
await b.close();