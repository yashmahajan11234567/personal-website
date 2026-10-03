import { chromium } from 'playwright';
const b = await chromium.launch();
const VPS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
for (const vp of VPS) {
  const p = await b.newPage({ viewport: vp });
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `qa-screenshots/v3-open-${vp.width}.png` });

  const band = await p.evaluate(() => {
    const el = document.querySelector('.cinematic-type__word--left');
    const r = el.getBoundingClientRect();
    return { y0: r.top, y1: r.bottom, vw: innerWidth, vh: innerHeight };
  });
  const shot = await p.screenshot();
  const runs = await p.evaluate(
    async ({ b64, y0, y1, vw, vh }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const sx = img.width / vw;
      const sy = img.height / vh;
      const yA = Math.round(y0 * sy);
      const yB = Math.round(y1 * sy);
      const d = g.getImageData(0, yA, img.width, yB - yA).data;
      const dark = new Uint8Array(img.width);
      for (let x = 0; x < img.width; x++) {
        let n = 0;
        for (let y = 0; y < yB - yA; y++) {
          const i = (y * img.width + x) * 4;
          if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 128) n++;
        }
        dark[x] = n;
      }
      const merged = [];
      let s = -1;
      for (let x = 0; x <= img.width; x++) {
        const on = x < img.width && dark[x] > 0;
        if (on && s < 0) s = x;
        else if (!on && s >= 0) {
          const last = merged[merged.length - 1];
          if (last && s - last[1] <= 1) last[1] = x - 1;
          else merged.push([s, x - 1]);
          s = -1;
        }
      }
      return merged.map(([a, z]) => [(a + 1) / sx, (z + 1) / sx]);
    },
    { b64: shot.toString('base64'), y0: band.y0, y1: band.y1, vw: band.vw, vh: band.vh }
  );
  const L = runs.filter((r) => r[1] < band.vw * 0.42);
  const C = runs.filter((r) => r[0] >= band.vw * 0.42 && r[1] <= band.vw * 0.58);
  const R = runs.filter((r) => r[0] > band.vw * 0.58);
  if (L.length && C.length && R.length) {
    const clrL = C[0][0] - L[L.length - 1][1];
    const clrR = R[0][0] - C[C.length - 1][1];
    console.log(
      `${vp.width}x${vp.height}  clearance PERSONAL ${clrL.toFixed(1)}px  PORTFOLIO ${clrR.toFixed(1)}px`
    );
  } else {
    console.log(`${vp.width}x${vp.height}  ink runs not resolved (L${L.length} C${C.length} R${R.length})`);
  }

  // selection hold
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `qa-screenshots/v3-hold-${vp.width}.png` });
  await p.close();
}
await b.close();
