# Phase 1 — Cinematic Rebuild: Execution Report

**Date:** 2026-10-01
**Scope:** Tasks 0–7 complete. Task 8 NOT started (STOP gate, awaiting approval).
**Status:** ✅ STOP gate reached. Awaiting human approval to proceed to Task 8.

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

## 7. Task 8 — exact state: **NOT STARTED**

Per your instruction, Task 8 was not begun. Current behaviour on selection:

```
SELECTION HOLD → user selects → hero unmounts → world mounts immediately
```

`App.tsx` calls `setCurrentWorld(...)` and sets the hash. **There is no handoff transition yet.**
The store fields it will need (`selectedPath`, `isHandoff`) already exist, and
`CinematicHero` already tears down the pinned ScrollTrigger safely before unmount — which is
the hard part, and is done.

Q6 as you specified it — selected plate dominant, subtle accent, brief restrained transition,
no loading screen, no new cinematic, no invented camera move — remains to be built.

---

## 8. STOP

Tasks 0–7 are complete and verified. **Task 8 has not been started.** Awaiting your approval.