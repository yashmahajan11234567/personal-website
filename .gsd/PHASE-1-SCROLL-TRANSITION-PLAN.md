# Phase 1 — Scroll Transition Implementation Plan

**Goal**: bring the scroll choreography into line with the authoritative
reference video's measured motion.
**Inputs**: `.gsd/VIDEO-TRANSITION-ANALYSIS.md`, `.gsd/CURRENT-VS-REFERENCE.md`
**Authority**: the video wins (D1, already locked). No new decisions required.

---

## 1. Measured beat map — video → scroll

Derived from frame-differencing all 192 frames (`.gsd/VIDEO-TRANSITION-ANALYSIS.md` §2, §8):

| Video beat | Video time | Frames | Scroll % | Content |
|---|---|---|---|---|
| **B0 Opening** | 0.00 – 0.33 s | 0–8 | 0 – 4 % | Static. Figure fixed, opening type low, **no plates**. |
| **B1 Type exit** | 0.33 – 1.42 s | 8–34 | 4 – 18 % | Headline exits **upward**, clears top of frame. Ground brightens 176→188. |
| **B2 Quiet** | 1.42 – 1.83 s | 35–43 | 18 – 23 % | Near-still. The breath before the reveal. |
| **B3 Board rise** | 1.83 – 3.96 s | 44–95 | 23 – 50 % | Both plates rise **from below the frame bottom**, **in lockstep**, to y 0.225–0.626. |
| **B4 Hold** | 4.00 – 7.96 s | 96–191 | 50 – 100 % | **Static.** Selection state. |

Because the video is 8 s and the selection hold is the last 4 s of it, and the
hold must also occupy a large share of *scroll*, the mapping is:

```
scroll 0.00 – 0.04  =  video 0.00 – 0.33s   (B0)
scroll 0.04 – 0.18  =  video 0.33 – 1.42s   (B1)
scroll 0.18 – 0.23  =  video 1.42 – 1.83s   (B2)
scroll 0.23 – 0.50  =  video 1.83 – 3.96s   (B3)
scroll 0.50 – 1.00  =  video 4.00 – 7.96s   (B4)
```

---

## 2. Current vs required beat table

| Beat | Current (`beats.ts`) | Required | Change |
|---|---|---|---|
| `ignition` | 0.00 – 0.06 | 0.00 – 0.04 | narrow |
| `anchor` | 0.06 – 0.20 | 0.04 – 0.18 | shift + widen |
| `lift` | 0.20 – 0.28 | 0.18 – 0.23 | narrow (the "quiet" beat) |
| `boards` | **0.28 – 0.46** | **0.23 – 0.50** | **start 5 % earlier, run 12 % longer** |
| `lock` | 0.46 – 0.52 | (folded into `boards`) | **remove** |
| `selection` | 0.52 – 1.00 | 0.50 – 1.00 | start 2 % earlier |

The `lock` beat exists in the current build because the old plan had a separate
"settle" window. The video has **no separate settle** — the plates simply finish
rising at t 3.96 s and are then static. Folding `lock` into `boards` removes a
beat that the reference does not contain.

---

## 3. Element-by-element mapping (required deliverable)

| Video beat | Scroll range | Element | Mechanism | Expected browser result |
|---|---|---|---|---|
| Opening | 0.00 – 0.04 | Figure | static, no transform | Person stands still, cropped at frame bottom |
| Opening | 0.00 – 0.04 | `PERSONAL` / `PORTFOLIO` | translateY from +6vh, opacity ramp | Large stencil words sit low, over the ground plane |
| Opening | 0.00 – 0.04 | Ground | `--ground-scale` 1.00 | Near-white stage, luma ≈ 176 |
| Type exit | 0.04 – 0.18 | `PERSONAL` | translateY → −120vh, opacity → 0 | Word rises off the top of frame |
| Type exit | 0.04 – 0.18 | `PORTFOLIO` | same, +4 % stagger | Both words clear the frame by scroll 0.18 |
| Type exit | 0.04 – 0.18 | Ground | scale 1.00 → 1.06, luma → 188 | Ground brightens as type leaves |
| Quiet | 0.18 – 0.23 | all | held | Near-still breath |
| Reveal | 0.23 – 0.50 | **Data plate** | translateY from +100vh → 0 | Plate rises from below the frame bottom |
| Reveal | 0.23 – 0.50 | **Cloud plate** | translateY from +100vh → 0, **no stagger** | Both plates rise in **lockstep** |
| Reveal | 0.23 – 0.50 | Ground | scale → 1.00, luma → 147 | Darkens as ink accumulates |
| Final | 0.50 – 1.00 | both plates | static, no transform | Locked selection composition |
| Final | 0.50 – 1.00 | boards | interactive | Keyboard/touch/pointer enabled |

---

## 4. Implementation

### 4.1 `src/cinematic/timeline/beats.ts`

Rewrite `BEATS` to the §2 table. Remove the `lock` phase from
`CinematicPhase`; keep `selection` as the final beat. `SELECTION_START` becomes
`0.50`. Update the header comment to cite
`.gsd/VIDEO-TRANSITION-ANALYSIS.md` as the measurement source.

### 4.2 `src/cinematic/layers/BoardLayer.tsx`

Three changes:

1. **Start position = below the frame.** Currently the plates translate from
   `+52vh` *within* the scene and fade in via opacity. The reference has them
   enter through the bottom edge at full opacity, clipped by
   `.cinematic-hero { overflow: hidden }`.
   → `const START_Y_VH = 100;` and no opacity ramp during the rise.

2. **Remove the stagger.** `STAGGER = { data: 0, cloud: 0.04 }` must go — the
   video shows both plates at *identical* y at every sample (four decimals).
   → `STAGGER = { data: 0, cloud: 0 }`.

3. **Replace `easeOutBack`.** The reference's y-travel is near-linear with a
   soft ease-out; there is no overshoot. Measured steps (video):
   `0.86, 0.78, 0.70, 0.62, 0.54, 0.47, 0.35, 0.27, 0.23` — even ~0.08 decrements
   that decelerate only in the final third.
   → `easeOutCubic` (or a piecewise lerp matching the table above). **No
   overshoot.**

### 4.3 `src/cinematic/layers/TypographyLayer.tsx`

Currently the headline lingers to ~21 % of scroll. It must clear the frame by
18 %. Retime so the exit completes at the end of `anchor` (0.18), and raise the
exit distance so the word clears the viewport rather than merely fading.

### 4.4 `src/cinematic/layers/GroundLayer.css`

Opening luma is currently ~197 against the reference's 176. Darken the field
slightly and make `--ground-scale` follow the measured curve (brighten to 188 at
t 1.5 s, settle to 147 as ink lands) rather than a single flat value.

### 4.5 Tests

Add to `qa/phase1/cinematic.spec.ts`:

- `beats match the video's measured boundaries` — assert
  `boards.start === 0.23`, `boards.end === 0.50`, `SELECTION_START === 0.50`.
- `plates rise from below the frame` — at scroll 0.25 the plate's rendered
  `y` must be > 0.6 (low), at 0.50 it must equal the seated rect.
- `plates rise in lockstep` — both plates' rendered y equal to within 0.002 at
  every sampled scroll.
- `no plate overshoot` — plate `y` is monotonically decreasing; it never rises
  back after reaching its seat.
- `typography clears the frame by 18 %` — top-band ink at 0.18 is below the
  opening value.

---

## 5. Verification loop

```
IMPLEMENT → BUILD → PLAYWRIGHT (full suite) → CAPTURE 12 MATCHED FRAMES
          → MEASURE with identical metrics → DIFF vs video → FIX largest gap → REPEAT
```

Termination: every metric in `.gsd/CURRENT-VS-REFERENCE.md` §1 within tolerance,
and no regression in the 58 existing tests.

---

## 6. Out of scope

- Data/Cloud world content (Phase 2).
- The Q6 handoff — already complete and passing.
- Reference assets (frames/video) remain gitignored, QA-only.

---

## 7. Risk

| Risk | Mitigation |
|---|---|
| Changing `SELECTION_START` breaks the selection-latch logic and the Tab-loop fix | The latch keys off `beat('selection')` reaching its start; retiming it is the same code path. Full suite must stay green. |
| Removing `lock` touches `CinematicPhase` union, used in the store | Update the store's default and `phaseAt`; typecheck will catch stragglers. |
| Raising the plate start to `+100vh` may reveal them below the fold before the pin engages | `.cinematic-hero` is `overflow: hidden` and pinned from `top top`; verify at scroll 0 and 0.23 with screenshots. |