# Transport evidence — the twelve phases

Captured by `qa/capture-transport.mjs`. Re-run with a dev server on port 5174:

```
npx vite --port 5174 --strictPort     # in one shell
node qa/capture-transport.mjs         # in another
```

Output lands in `docs/evidence/transport/`: one PNG per phase, plus
`index.json` recording the frame count and phase labels.

**Recaptured 2026-10-05**, after the side-view avatar and the reference tube
redesign, so the frames match what currently ships.

## Why a CDP screencast, not screenshots

`page.screenshot()` blocks, and it blocks for longer than the shortest phases
last — `PHASE_MS` gives `build` and `position` 16ms **each**. Three approaches
were built and measured first:

| Approach | Frames captured | Why it failed |
|---|---|---|
| Poll `currentPhase`, screenshot on change | 8 of 12 | `build`, `position`, `reveal`, `idle` fall in one ~180ms window |
| Pause the scene around each screenshot | 2 of 12 | Freezing `approach` stopped the trigger that starts travel; freezing `activate` stalled the state machine |
| Slow the transport down | n/a | `PHASE_MS` is a module-level `const`; no time-scale hook exists |

`Page.startScreencast` receives frames from the compositor as it paints them and
delivers them asynchronously, so capture costs the page nothing. The scene is
never paused. All twelve phases were captured in one run — 252 frames.

## A labelling bug in the first version of this script

The loop labelled a phase only when `readState().phase` *changed*, so the initial
`approach` label was pushed on the first poll — by which time the player had
already walked to the tube and triggered travel. `approach` was stamped at frame
~111 while it actually spans frames 0–181, so its representative frame was drawn
from an empty part of the walk and **the player was not in it**.

Measured, not inferred: comparing the saved `approach` frame against `occluded`
over the player's region returned **0 differing pixels out of 163,600**. Two
frames that must differ did not, which is only possible if the sprite was missing
from one of them.

Fixed by stamping `approach` against frame 0 — the moment the walk began — rather
than against the first poll that noticed the phase name.

## The sprite box was measured, not assumed

The first attempts used a *guessed* player region (x 28–64% of width, y 42–98% of
height) and got 0 differing pixels again. Rather than guess a second time, the
region was found by diffing `approach` against `occluded` across the whole canvas
and taking the bounding box of the rows that changed:

```
x 228–264, y 326–422    (36 × 96 px)
```

Every measurement below uses that box.

## Pixel measurements

Sprite box only. "Lit" = luminance above 40.

| Phase | Mean | Contrast | Max | Lit % |
|---|---|---|---|---|
| `approach` | 81.31 | 57.10 | 242 | 59.3 |
| `activate` | 25.56 | 21.08 | 125 | 6.8 |
| `entering` | 25.56 | 21.08 | 125 | 6.8 |
| `occluded` | 25.56 | 21.08 | 125 | 6.8 |
| `conduit` | 25.56 | 21.08 | 125 | 6.8 |
| `blackout` | 5.86 | 0.00 | 6 | 0.0 |
| `build` | 5.86 | 0.00 | 6 | 0.0 |
| `position` | 29.30 | 22.55 | 125 | 4.2 |
| `reveal` | 29.30 | 22.55 | 125 | 4.2 |
| `emerging` | 29.30 | 22.55 | 125 | 4.2 |
| `settle` | 60.82 | 39.37 | 186 | 67.6 |
| `idle` | 60.82 | 39.37 | 186 | 67.6 |

## The sequence

`phaseLog` from the recording, identical to the order asserted by
`transport-phases.spec.ts`:

```
approach -> activate -> entering -> occluded -> conduit -> blackout
         -> build -> position -> reveal -> emerging -> settle -> idle
```

## Gate 1 — the player is fully occluded BEFORE blackout

Lit pixels fall **59.3% → 6.8%** and peak luminance **242 → 125** between
`approach` and `occluded`. The player is hidden inside the tube while the world is
still visible, which is what makes the sequence read as entering a conduit rather
than as a cut to black.

`occluded` and `conduit` are pixel-identical, so the player stays hidden for the
whole conduit phase.

## Gate 2 — the destination is built while the screen is opaque

`blackout` and `build` are **pixel-identical** — same bytes, contrast 0.00, 0.0%
lit. Nothing is drawn during `build`. The destination first appears at
`position`, which means it was built while the screen was fully black and then
revealed.

These are the two hard gates the design requires. They are also asserted
numerically in `transport-phases.spec.ts` and `pipe-journey.spec.ts`; this
recording exists so the same claims can be checked as pictures.