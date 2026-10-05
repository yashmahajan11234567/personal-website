/**
 * STAGE G — record the twelve-phase transport as a frame sequence.
 *
 * WHY NOT SCREENSHOTS
 *
 * Three earlier approaches were measured and each missed phases, for the same
 * underlying reason: `page.screenshot()` blocks, and it blocks for longer than
 * the shortest phases last.
 *
 *   1. Poll currentPhase, screenshot on change  -> 8 of 12 frames.
 *      `build`, `position`, `reveal` and `idle` fall inside one ~180ms window.
 *      PHASE_MS gives `build` and `position` 16ms EACH.
 *   2. Pause the scene around each screenshot    -> 2 of 12 frames.
 *      Freezing `approach` stopped the trigger that starts travel (travel never
 *      began, phaseLog empty); freezing `activate` stalled the state machine so
 *      it never advanced.
 *   3. Slow the transport down                 -> not possible. PHASE_MS is a
 *      module-level const and no time-scale hook is exposed.
 *
 * CDP `Page.startScreencast` is the correct tool: the compositor emits frames as
 * it paints them and delivers each asynchronously, so capture costs the page
 * nothing and no phase can outrun the recording. The page is never paused.
 *
 * The sequence is verified NUMERICALLY by transport-phases.spec.ts and
 * pipe-journey.spec.ts, including both hard gates. This script exists so the
 * same run can also be inspected as pictures.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const ORIGIN = 'http://localhost:5174';
const OUT = 'docs/evidence/transport';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const client = await context.newCDPSession(page);
const frames = [];
let recording = false;

/*
 * Every frame the compositor paints while recording is on. Screencast delivers
 * frames asynchronously and needs an ack per frame; not acking stalls the
 * stream, so the ack is the first thing done on arrival.
 */
client.on('Page.screencastFrame', async ({ data, sessionId }) => {
  if (!recording) return;
  frames.push(data);
  try {
    await client.send('Page.screencastFrameAck', { sessionId });
  } catch {
    /* the stream is closing */
  }
});

const readState = () =>
  page.evaluate(() => {
    const s = window.__worldScene;
    return {
      phase: s?.transport?.currentPhase ?? null,
      log: [...(s?.transport?.phaseLog ?? [])],
      chapter: s?.chapter ?? null,
    };
  });

await page.goto(`${ORIGIN}/#/data-world`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);

const plate = page.locator('[data-testid="world-entry"]');
if (await plate.count()) await plate.locator('[data-testid="world-entry-dismiss"]').click();
await page.waitForTimeout(1000);

await client.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });

/*
 * Label frames with the phase running when they were painted. Polling only
 * LABELS; the pixels come from the compositor, so a 16ms phase still gets
 * whatever frames the browser genuinely painted during it.
 */
const labels = [];
let lastPhase = null;
recording = true;

const t0 = Date.now();
await page.keyboard.down('ArrowRight');

/*
 * A MEASUREMENT BUG IN THE FIRST VERSION OF THIS SCRIPT, worth recording.
 *
 * The loop labelled a phase only when `readState().phase` CHANGED, so the
 * initial `approach` label was pushed on the first poll — by which time the
 * player had already walked to the tube and triggered travel. The label was
 * stamped at frame ~111, and `approach` spans frames 0-110.
 *
 * `approach` is not a phase that BEGINS at the trigger; it is the entire walk
 * to the pipe. Its representative frame was therefore taken from the middle of
 * an empty span and the player was not in it at all.
 *
 * MEASURED: comparing the saved `phase-01-approach.png` with
 * `phase-04-occluded.png` over the player's region gave 0 differing pixels out
 * of 163,600 — the two frames were identical, which is impossible if the player
 * is visible in one and not the other. The player was missing from `approach`.
 *
 * The fix is to stamp `approach` against frame 0, the moment the walk began,
 * rather than against the first poll that noticed the phase name.
 */
labels.push({ phase: 'approach', atFrame: 0, log: null });

while (Date.now() - t0 < 25_000) {
  const st = await readState();
  // `approach` is pre-labelled against frame 0, so only label it once — and
  // never replace that label when a poll reports the same phase.
  const alreadyLabelled = labels.some((l) => l.phase === st.phase);
  if (st.phase !== lastPhase && !alreadyLabelled) {
    lastPhase = st.phase;
    labels.push({ phase: st.phase, atFrame: frames.length, log: st.log });
    console.log(`  ${String(labels.length).padStart(2)} ${st.phase} @ frame ${frames.length}`);
  }
  if (st.log.length >= 12 && st.phase === 'idle') break;
  await page.waitForTimeout(8);
}

await page.keyboard.up('ArrowRight');
await client.send('Page.stopScreencast');
recording = false;

console.log('\nframes recorded:', frames.length);
console.log('phases seen    :', labels.map((l) => l.phase).join(' -> '));
console.log('phaseLog       :', JSON.stringify((await readState()).log));

// One representative frame per phase, taken from the middle of that phase's run
// so the frame shows the phase rather than the instant it began.
const written = [];
for (let i = 0; i < labels.length; i++) {
  const l = labels[i];
  const next = labels[i + 1]?.atFrame ?? frames.length;
  const mid = Math.floor((l.atFrame + next) / 2);
  const data = frames[Math.min(Math.max(mid, 0), frames.length - 1)];
  if (!data) continue;
  writeFileSync(`${OUT}/phase-${String(i + 1).padStart(2, '0')}-${l.phase}.png`, Buffer.from(data, 'base64'));
  written.push({ phase: l.phase, frame: mid, span: [l.atFrame, next] });
}

writeFileSync(
  `${OUT}/index.json`,
  JSON.stringify({ labels, frameCount: frames.length, written }, null, 2),
);

console.log('written         :', written.map((w) => w.phase).join(', '));
await browser.close();