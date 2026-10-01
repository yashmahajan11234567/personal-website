# Phase 1 — Cinematic Rebuild: Execution Report

**Date:** 2026-10-01
**Scope:** Tasks 0–8 complete. Task 8 implemented and verified.
**Status:** ✅ Phase 1 complete. Q6 handoff built, tested, and visually checked.

---

## 1. What was implemented

One continuous, code-driven cinematic. No frame sequence, no `<video>`, no mid-scene
media swap. Scroll position **is** the timeline.

| Module | File | Responsibility |
|---|---|---|
| Beats | `src/cinematic/timeline/beats.ts` | S0–S5 boundaries derived from the reference |
| Progress bus | `src/cinematic/timeline/progressBus.ts` | rAF-coalesced progress; never React state |
| Timeline | `src/cinematic/timeline/useHeroTimeline.ts` | The single ScrollTrigger (pin + scrub 0.6) |
| Ground | `src/cinematic/layers/GroundLayer.tsx` | White stage; carries the camera-push illusion |
| Figure | `src/cinematic/layers/FigureLayer.tsx` | The immobile anchor — **no scroll-bound transform** |
| Typography | `src/cinematic/layers/TypographyLayer.tsx` | PERSONAL/PORTFOLIO as scrubbed objects |
| Boards | `src/cinematic/layers/BoardLayer.tsx` | Two plates, staggered rise, SVG chrome |
| Accent | `src/cinematic/layers/AccentGlowLayer.tsx` | Hover-only world colour (D4) |
| Grain | `src/cinematic/layers/GrainLayer.tsx` | Vignette + inline-SVG noise |
| Geometry | `src/cinematic/selection/selectionGeometry.ts` | Measured rects, 4 breakpoints |
| Interaction | `src/cinematic/selection/useWorldSelection.ts` | Selection state machine |
| Control | `src/cinematic/selection/WorldBoard.tsx` | One real `<button>` per plate |
| Copy | `src/cinematic/data/boardContent.ts` | All replaceable text |

**Removed:** `SelectionVideo.tsx`, `FrameSequenceCanvas.tsx`, unreferenced `Hero.tsx` + CSS,
`cinematic-beats.json`, `selection-compositing.json`, their ambient declarations, 42 `console.log`s,
and `public/assets/character.webp` (a flat 800×450 frame, not a figure cut).

---

## 2. Measured against the reference

`qa-screenshots/` holds 21 captures; `qa-screenshots/reference/` holds 12 reference frames.

Selection hold (t = 5.0 s reference), 1440×900:

| Metric | Reference | Built | Δ |
|---|---|---|---|
| Figure dark top | 0.1278 | 0.1256 | −0.0022 |
| Figure dark bottom | 0.9986 | 0.9989 | +0.0003 |
| Data plate top | 0.2014 | 0.2011 | −0.0003 |
| Cloud plate top | 0.2042 | 0.2044 | +0.0002 |
| Mean luma | 147.0 | 137.1 | −9.9 |

Composition confirmed by independent vision analysis: central figure, two flanking dark
plates, stencil headline words, white ground, nothing cut off or overlapping.

---

## 3. Playwright results — 40 passed, 0 failed

Stable under `--repeat-each=2` (78/78). Suites:

- **structure** (3) — all layers present, figure image loads, **no bitmap media requested**
- **D5 figure never moves** (2) — box identical at 11 scroll positions; transform is `none`
- **scroll drives timeline** (3) — track exists, boards seat, words translate (not fade)
- **D4 monochrome at rest** (2) — no glow until hover; Data→blue, Cloud→orange (RGB asserted)
- **plate geometry** (4) — symmetry, content asymmetry, plate copy order, hit-target alignment
- **accessibility** (6) — real buttons, ≥44 px, not aria-hidden, Tab reaches both, focus ring
  visible, Enter and Space both select, live region present
- **nothing auto-selected** (1) — scrolling to 100 % selects nothing
- **reduced motion** (4) — final state immediately, no pin, **no auto-select**, both worlds live
- **responsive** (12) — 1920/1440/1280/1024/768/390: figure anchored, targets ≥44 px in
  viewport, plates never overlap
- **touch** (3) — first tap previews, second enters, targets ≥72 px

---

## 4. Bugs found and fixed during QA

These were real defects, not test problems:

1. **Invalid hook call** — layers called `useProgressBus` from inside `useEffect`.
   Renamed to `subscribeToProgress()`, a plain helper.
2. **Temporal dead zone** — the `gsap.context()` cleanup referenced the context it was
   initialising. Hoisted the handle out.
3. **Unescapable Tab loop** — focusing a board scrolled the page below the S5 gate,
   unmounting the boards and dumping focus to `<body>`. Selection now **latches**.
4. **App-killing crash on selection** — ScrollTrigger's pin-spacer teardown raced React's
   unmount and threw `NotFoundError: removeChild`; the world never rendered. `destroy()` is
   now idempotent and runs in the click handler while the DOM is intact.
5. **Reduced motion froze the headline** at scale 0.86 off-frame (sniffed `matchMedia`
   while no ScrollTrigger ran). `settled` is now an explicit prop.
6. **Figure letterboxed** — `object-fit: contain` left the figure floating above the frame
   bottom; the reference crops it. Solved the box rect against the rendered result.

---

## 5. Deviations from the reference

| Deviation | Status |
|---|---|
| Mean luma 137 vs 147 — build slightly darker | **Known.** Plates read a touch heavier. Acceptable for monochrome; flagged for your eye. |
| Headline typeface is a CSS stack, not the reference's cut stencil | **Known, accepted (R2).** Wordforms can't be matched in CSS. Position, scale, weight and motion are matched. |
| Plates lack the reference's cracked-hex texture | **Known.** Flat `#0b0b0c` + SVG chrome. Texture is a Task 8-or-later art call. |
| Mean-luma delta −9.9 concentrates at the plate edges | Plate bottoms read 0.02 lower than reference. Within tolerance. |

### Correction to an earlier claim

I previously reported the plates as **asymmetric** (Data taller and higher). That was a
**measurement error** — thresholding at `luma<110` clipped the plates at their printed-content
gaps. Three independent methods agree they are **symmetric**: top delta 0.0028, height delta
0.0042, width delta 0.0060. The geometry and the test suite are corrected; the visible
asymmetry is **content** (line counts, icon rows, type scale), which is asserted separately.

---

## 6. Performance

- App JS **15.8 kB** (5.4 kB gzip); CSS 11.1 kB.
- **Zero** requests for `/frames/` or `.mp4` — asserted by a test.
- No frame sequence in the bundle; reference assets moved to `reference/` (gitignored, 32 MB).
- Scroll progress never enters React state — rAF-coalesced, one `ScrollTrigger`.

---

## 7. Task 8 — world-entry handoff (Q6): **COMPLETE**

Q6 was resolved as a restrained coded handoff. The reference video contains no
world entry — it ends at selection, intentionally — so this was built to Q6's text, not
against footage.

### What was there to reuse

Nothing. Phaser is not installed (no `phaser` dependency), and both worlds are
placeholder `<div>`s in `App.css`. So the handoff is entirely new coded work, as Q6
anticipated.

### The sequence

Over 820 ms (`HANDOFF_MS`), driven entirely by CSS animations keyed off
`--handoff-ms`, so JS and CSS cannot disagree:

| Phase | Time | What happens |
|---|---|---|
| Hold | 0 – 287 ms | Chosen plate scales to 1.045, other plate recedes to 0.972 / 0.3 opacity, headline drops to 0.22, figure dims to 0.45 |
| Dissolve | 287 – 820 ms | Monochrome veil fades from `#0a0a0a` at opacity 0 → 1 |
| Mount | 820 ms | World mounts on the identical colour |

The key trick: the veil dissolves to **exactly** the world placeholder's background
(`rgb(10,10,10)`), so the swap is a true cross-dissolve with no flash, no white
frame, no loading state. A test asserts `veilColour === worldColour`.

### Q6 prohibitions, each asserted by a test

- **No loading screen** — no `loading`/`please wait` text, no `role="progressbar"`,
  no `aria-busy`, no spinner/loader/skeleton class, sampled across the transition.
- **No new card screen** — the overlay contains zero text, zero children, and is
  `aria-hidden`.
- **No large coloured overlay** — the veil is `rgb(10,10,10)`, monochrome, and only
  the *chosen* world's accent glows (Data blue / Cloud orange asserted as the only
  lit wash).
- **No new cinematic** — the transition is one 820 ms dissolve; nothing replays.
- **No arbitrary camera animation** — the ground's transform is asserted byte-identical
  throughout (`matrix(1.06, …)` at every sample).
- **No invented video sequence** — nothing is loaded; the request count is unchanged.

### Also upheld

- **D5 holds through the handoff**, not just the scroll: the figure's computed
  transform is asserted `none` at every sample.
- **Reduced motion**: no dissolve, no dwell, no plate/type transform. The world mounts
  within 1 s with nothing flashing.
- **Nothing auto-selects.** Two boards cannot both be selected; the correct world wins.

### Two real bugs found while building it

1. **The accent dimmed instead of blooming.** The handoff set the wash to
   `opacity: 0.3`, but the gradient already peaks at 0.16 alpha and hover drives
   opacity to 1 — so 0.3 made it *darker* at exactly the moment it was meant to be
   most present. `--intensify` in the same block was dead code. Fixed by raising the
   gradient's own peak alpha to 0.22 (a restrained step above the 0.16 hover ceiling)
   instead of the element's opacity. A test now asserts the peak alpha *rises* during
   the handoff and never exceeds 0.22.

2. **A crash on the deep-link path** — `NotFoundError: removeChild` — which predates
   Task 8 and was not covered by any test. Deep-linking to `#/data-world` and
   navigating back unmounted a still-pinned hero; React then called `removeChild` on
   a node ScrollTrigger had already detached, taking down the whole app.

   The earlier fix (destroying in the click handler) could not help here, because no
   click happens. Moving the teardown into an effect *also* failed: React commits
   `commitDeletionEffectsOnFiber → removeChild` **before** effect cleanup runs, so an
   effect is already too late. The fix is a module-level registry
   (`activeTimeline.ts`) with `destroyActiveTimeline()`, called **during App's render
   phase** whenever `currentWorld !== 'hero'`. `destroy()` is idempotent, so calling it
   on every such render is safe. This covers every world-change path — selection, deep
   link, back button — from one place.

### Task 8 files

- `src/cinematic/handoff/HandoffLayer.tsx` + `.css` — the veil and the animations
- `src/cinematic/handoff/handoffTiming.ts` — `HANDOFF_MS`, shared with CSS
- `src/cinematic/timeline/activeTimeline.ts` — the teardown registry
- `qa/phase1/handoff.spec.ts` — 18 tests
- `qa/capture-handoff.mjs`, `qa/probe-handoff.mjs`, `qa/probe-handoff-timing.mjs` — visual capture and instrumentation

---

## 8. Test results — 58 passed, 0 failed

| Suite | Tests |
|---|---|
| `cinematic.spec.ts` | 24 |
| `handoff.spec.ts` (Task 8) | 18 |
| `reduced-motion-responsive.spec.ts` | 13 |
| `touch.spec.ts` | 3 |

Verified twice: **58 passed (2.4 m)**, then **116 passed (4.8 m)** with
`--repeat-each=2` — no flake, no ordering dependence.

---

## 9. Performance

- App JS **16.5 kB** (5.7 kB gzip) — up 0.7 kB from Task 8.
- **Zero** requests for `/frames/` or `.mp4` — asserted by a test.
- No frame sequence in the bundle; reference assets live in `reference/` (gitignored, 32 MB).

---

## 10. Open items

None blocking. The known cosmetic deviations in section 5 stand: mean luma 137 vs 147,
a CSS-stack typeface instead of the reference's cut stencil, and no cracked-hex plate
texture. All three are art-direction calls, not defects.