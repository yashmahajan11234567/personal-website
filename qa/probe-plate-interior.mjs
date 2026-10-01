import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://localhost:5173/');
await p.waitForTimeout(1000);
const track = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
await p.evaluate((y) => window.scrollTo(0, y), Math.round(track * 0.9));
await p.waitForTimeout(1200);

const info = await p.evaluate(() => {
  const out = {};
  for (const side of ['data', 'cloud']) {
    const plate = document.querySelector(`[data-plate="${side}"]`);
    if (!plate) { out[side] = 'NO PLATE'; continue; }
    const pr = plate.getBoundingClientRect();
    const body = plate.querySelector('.cinematic-plate__body');
    const line = plate.querySelector('.cinematic-plate__line');
    const inter = plate.querySelector('.plate-interior');
    const marks = plate.querySelector('.plate-interior__marks');
    const rec = plate.querySelector('.plate-interior__recess');
    const tel = plate.querySelector('.plate-interior__telemetry');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: +((r.top - pr.top) / pr.height).toFixed(3),
               left: +((r.left - pr.left) / pr.width).toFixed(3),
               h: +(r.height / pr.height).toFixed(3),
               w: +(r.width / pr.width).toFixed(3) };
    };
    out[side] = {
      plate: { w: Math.round(pr.width), h: Math.round(pr.height) },
      bodyText: body?.textContent ?? null,
      lineBox: box(line),
      bodyBox: box(body),
      interiorBox: box(inter),
      marksBox: box(marks),
      recessBox: box(rec),
      telemetryText: tel?.textContent ?? null,
      telemetryBox: box(tel),
      interiorOpacity: inter ? getComputedStyle(inter).opacity : null,
      interiorBg: inter ? getComputedStyle(inter).backgroundColor : null,
      statusText: plate.querySelector('.cinematic-plate__status')?.textContent ?? null,
    };
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await b.close();