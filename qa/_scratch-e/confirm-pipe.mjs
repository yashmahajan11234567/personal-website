/**
 * Confirm defect 2's root cause and capture evidence.
 *
 * WorldScene.onArrive does:
 *     for (const [id, built] of this.pipeSkins) built.mouth.setVisible(id === entryId);
 * which makes ONLY the destination chapter's ENTRY pipe visible and hides every
 * other pipe -- including that chapter's EXIT pipe. So after arriving in Skills,
 * the Skills -> Projects tube is permanently invisible, while its proximity
 * trigger still works. That is exactly the report: "the pipe is not visible but
 * we can still enter project section".
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'qa/_scratch-e';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });

await page.goto('http://localhost:5174/#/data-world');
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await page.keyboard.press('Enter');
await sleep(500);

async function walkToChapter(want, maxMs = 60000) {
  const t0 = Date.now();
  await page.keyboard.down('ArrowRight');
  while (Date.now() - t0 < maxMs) {
    const ch = await page.evaluate(() => window.__worldScene?.currentChapter ?? null);
    if (ch === want) break;
    await sleep(120);
  }
  await page.keyboard.up('ArrowRight');
  return page.evaluate(() => window.__worldScene?.currentChapter ?? null);
}

const dump = async (label) => {
  const r = await page.evaluate(() => {
    const s = window.__worldScene;
    return {
      chapter: s.currentChapter,
      builtWorldWidth: s.world?.width ?? null,
      builtWorldChapter: s.world?.chapter ?? null,
      configuredPipes: (s.world?.pipes ?? []).map((p) => ({ id: p.id, dest: p.destination, x: p.x })),
      exitPipeId: s.world?.exitPipe?.id ?? null,
      entryPipeId: s.world?.entryPipe?.id ?? null,
      skins: [...(s.pipeSkins ?? new Map()).entries()].map(([id, b]) => ({
        id,
        x: Math.round(b.mouth.x),
        containerVisible: b.mouth.visible,
        childVisible: b.mouth.list.map((o) => o.visible),
      })),
      playerX: Math.round(s.player?.x ?? -1),
      armedPipe: s.armedPipe?.id ?? null,
    };
  });
  console.log(`\n===== ${label} =====`);
  console.log(JSON.stringify(r, null, 2));
  return r;
};

await dump('cliff, before travelling');
await walkToChapter('skills');
await sleep(800);
const atSkills = await dump('SKILLS, on arrival');

// Where is the invisible exit pipe relative to the camera?
const geo = await page.evaluate(() => {
  const s = window.__worldScene;
  const v = s.cameras.main.worldView;
  return {
    view: { x: Math.round(v.x), w: Math.round(v.width), right: Math.round(v.x + v.width) },
    exit: s.world.exitPipe ? {
      id: s.world.exitPipe.id,
      x: s.world.exitPipe.x,
      left: s.world.exitPipe.x - 22,
      right: s.world.exitPipe.x + 22,
      inView: s.world.exitPipe.x >= v.x && s.world.exitPipe.x <= v.x + v.width,
      pxToScreenLeft: Math.round((s.world.exitPipe.x - 22 - v.x) * 2),
    } : null,
    canvas: (() => { const c = document.querySelector('[data-testid="world-canvas"] canvas'); const b = c.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; })(),
  };
});
console.log('\n===== exit pipe vs camera =====');
console.log(JSON.stringify(geo, null, 2));

await page.locator('[data-testid="world-canvas"]').screenshot({ path: `${OUT}/skills-on-arrival.png` });

// Walk right up to the invisible pipe and see whether it triggers anyway.
console.log('\n===== walking into the invisible exit pipe =====');
await page.keyboard.down('ArrowRight');
let triggered = null;
for (let i = 0; i < 200; i += 1) {
  const st = await page.evaluate(() => {
    const s = window.__worldScene;
    return { ch: s.currentChapter, armed: s.armedPipe?.id ?? null, px: Math.round(s.player?.x ?? -1) };
  });
  if (st.armed === 'skills-to-projects') { triggered = st; break; }
  await sleep(80);
}
await page.keyboard.up('ArrowRight');
console.log('armed skills-to-projects at:', JSON.stringify(triggered));

await sleep(3500);
const after = await page.evaluate(() => ({
  chapter: window.__worldScene?.currentChapter ?? null,
  skins: [...(window.__worldScene?.pipeSkins ?? new Map()).entries()].map(([id, b]) => ({ id, visible: b.mouth.visible })),
}));
console.log('after travelling through it:', JSON.stringify(after, null, 2));
await page.locator('[data-testid="world-canvas"]').screenshot({ path: `${OUT}/projects-on-arrival.png` });

await browser.close();
console.log('\ndone');