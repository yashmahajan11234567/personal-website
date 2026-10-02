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
| Mean luma 137 vs 147 — build slightly darker | **RESOLVED** by the plate-interior pass (`1124542`). Interiors now carry a measured light/mid/dark structure (20.3% / 55.6% / 24.1% vs the reference's 20.0% / 56.9% / 23.1%) instead of reading as flat `#0b0b0c`. |
| Headline typeface is a CSS stack, not the reference's cut stencil | **Known, accepted (R2).** Wordforms can't be matched in CSS — `Archivo Black` and `Anton` are unavailable and the stack falls back to Impact. Position, scale, tracking, weight and motion are matched. The stencil *character* is preserved via the distressed mask. |
| Plates lack the reference's cracked-hex texture | **Resolved in spirit** by `1124542`: hatch/grid texture, bands, recessed shelves and telemetry marks now give the panels printed character. It is not the reference's literal cracked-hex pattern, which remains an art call. |
| Mean-luma delta −9.9 concentrates at the plate edges | Plate bottoms read 0.02 lower than reference. Within tolerance. |
| **Headline horizontal growth is capped** | **Geometric limit, measured.** Each word is hemmed between the frame edge and the figure, whose silhouette at the headline band spans x 0.4094–0.5695. Budget spare is 0px, so the requested 10–15% increase would overlap the figure. Applied an approved +8% height / +4% width split instead. See §11.3. |
| **Narrow viewports grow less than desktop** | **Geometric limit, measured.** The fitter's `WIDTH` term binds at every viewport except 1280×720 because the box aspect collapses (3.96 → 0.98 at mobile). The 14–16% headroom is exactly the cost of `MIN_TRACK_EM = 0.02`; taking it would mean zero tracking and re-cram the letters. See §11.3. |

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

*(As originally written. Superseded in part by §11 — see below.)*

None blocking. The known cosmetic deviations in section 5 stand: mean luma 137 vs 147,
a CSS-stack typeface instead of the reference's cut stencil, and no cracked-hex plate
texture. All three are art-direction calls, not defects.

**Update 2026-10-02**: plate interiors and the mean-luma deviation are resolved by
`1124542`. The CSS-stack typeface remains an accepted limitation. Two **new** non-defect
limitations are now documented in §5 and §11.3 — the headline's horizontal growth budget is
exhausted, and narrow viewports are width-constrained — both measured, both reported to the
user rather than worked around silently. **Phase 2 gameplay remains deliberately
unimplemented, blocked pending explicit approval.**

---

## 11. Post-report addendum — plate interiors, opening state, typography (2026-10-02)

Sections 3 and 8 above record the suite size **at the time they were written**. Later passes
took the count to **100 passing, 0 failing**. Four substantial changes landed after this report
was first written:

### 11.1 Plate interiors — `1124542`

The plates rendered as flat black cards; the reference panels are **printed technical objects**.
Numeric analysis of reference frame 96 measured the interior tonal split at ~20% light / ~57%
midtone / ~23% dark. Added `PlateMarks.tsx`, `PlateInterior.tsx` and a neutral `#4e4e4e` base,
tuned until the Data plate measured 20.3% / 55.6% / 24.1%. Decorative SVG is `aria-hidden`;
hover colour stays an external atmospheric glow rather than interior decoration.

### 11.2 Opening state — `55f4539`

Human QA found that at load the page already showed the final Data/Cloud composition with no
visible scroll progression. Root cause was `prefers-reduced-motion: reduce`: the CSS collapsed
the hero to `100vh` while `settled={reducedMotion}` forced the final state, leaving
`scrollable: 0`. Normal motion was always correct. Reduced motion now keeps a real ~4320px
track and the scroll-driven timeline, without scrub smoothing.

The headline was separately clipped, by an **invented ±14vw lateral entrance** the reference
does not have plus wrong box geometry.

### 11.3 Typography — `c413696`, `3e5ab0f`, `0f7377e`

| Pass | Defect | Correction |
|---|---|---|
| Undistort | `scaleX` 1.20–1.29 compensating for Impact's narrow advance-per-cap-height (0.406 vs the reference's 0.489) | Fitter solves cap height, distributes leftover width as positive tracking; `scaleX` = 1.000 |
| Compose inward | Edge-anchored, margins 3.7% / 2.8% | Both boxes inward 0.012 → ~5.0% / 5.0% |
| Restore size | Slightly undersized | Rects +8% height, +4% width → +2.9% to +9.5% cap height |
| Cloud wordmark | Read as anchored lower-left | `justify-content: center`; measured centre y 0.653 → 0.472 |

Two geometry limits were measured and are worth recording because they look like defects:

- **The headline's horizontal budget is exhausted** (spare 0px), so the requested 10–15%
  increase was impossible without overlapping the figure. Stopped and asked; applied the
  approved +8% height / +4% width split.
- **Narrow viewports are width-constrained**, not height-constrained. The 14–16% headroom above
  the solved size is precisely the cost of `MIN_TRACK_EM = 0.02`; recovering it would mean
  zero tracking and re-introduce the cramping that was deliberately removed.

### 11.4 A measurement trap worth inheriting

The figure's **element box is much wider than its silhouette** (372px vs 556px at 1280×720),
because the anchor art carries a transparent margin. Bounding-box comparisons against the figure
report overlaps that do not exist — this produced two false "collision" readings. All clearance
assertions are made from **rendered pixels** instead. Likewise, rendered cap height is not a
constant fraction of viewport height, so size assertions use measured per-viewport baselines
rather than an extrapolated ratio.
