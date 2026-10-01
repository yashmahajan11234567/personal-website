# Phase 1 Rebuild Plan — Cinematic Hero + World Selection

Status: **PLAN ONLY — Q1–Q5 answered 2026-10-01. Awaiting final approval. No application code written or modified.**

Date: 2026-10-01
Scope: Cinematic Hero + World Selection + handoff into selected world. Nothing beyond.

---

## 0. Locked Decisions (2026-10-01)

**D1 — Reference authority.** The 8 s clip (`Video_transition_with_text_and_20261001151641.mp4`, MD5 `709764b10f58229265a029d54bcca3b8`, identical to `public/videos/selection-transition.mp4`) is the **authoritative reference** for the hero's motion, choreography, typography movement, board entrance/exit, composition, and timing. The older frame sequences, videos, and images are **secondary visual asset references only** and must not override the new video's intended movement. The video is **not** to be embedded as the final hero — the motion is recreated in code.

Consequence: the measured beats in §3 and the timeline in §4 are the specification. Where the frame sequences disagree with the video, **the video wins** — including the figure-exit behaviour in the sequence tails, which is discarded (see §16, §7).

**D2 — Hybrid rendering.** Existing cinematic figure/artwork is preserved and reused. All typography is recreated as **live DOM/SVG**, not read from baked-in pixels. The video governs how that typography enters, moves, transforms, and exits. Old frame-typography movement is not copied where it conflicts with the video.

Consequence: §15 DOM-over-canvas is confirmed. `public/assets/character.webp` / figure cut from the video is the anchor (§7, R1). Frame sequences are reference-only and leave the shipped bundle (§16, §B).

**D3 — Blank tails are not content.** The blank-white tails (left final 19.2% from t = 8.916 s; right final 34.4% from t = 7.840 s) are **not** treated as meaningful cinematic content. Meaningful sequence content is used up to its last content frame, then the flow transitions into the newly coded cinematic scene. The white tail is not a required final visual.

Consequence: any frame-sequence read clamps to the last content frame (§16). With D2 the sequences are reference-only, so this mostly resolves the ~32 MB bundle question.

**D4 — Monochrome default, accent by hover.** The cinematic is **monochrome by default**. World identity is expressed through **hover interaction**:
- Hover **LEFT / Data** → subtle **light-blue** atmospheric glow behind/around the left side.
- Hover **RIGHT / Cloud / DevOps** → subtle **light-orange** atmospheric glow behind/around the right side.
- **Nothing hovered → return to monochrome.**
- On **selection**, the selected world's accent may become **more pronounced during the transition**.

The glow must stay restrained and cinematic — **not** a colored card, **not** a large gradient panel. Contrast and accessibility must hold. Blue = Data, Orange = Cloud/DevOps.

Consequence: this supersedes `.gsd/REQUIREMENTS.md` FR-2.1's static "blue path / orange path" reading and reconciles it with the new brief's monochrome mandate (§9, §12, and the REQ doc update in Task 10). Supersedes the old Q5.

**D5 — Figure stays fixed.** (From D1's authority rule + brief §4.) The sequence tails' figure exit (left pushes right, right carries off left) is **not** reproduced. The figure is the immobile anchor for the whole cinematic.

**Still open — Q6 only:** approval of the invented world handoff (§19). No reference exists for post-selection motion.

---

## 1. Current-State Assessment

Repo: `C:/Users/hitoy/Downloads/portfolio_website` (no git repository — `fatal: not a git repository`).
`npx tsc -b --noEmit` → exit 0, typecheck currently clean.

Live source:

| File | Lines | Role | Assessment |
|---|---|---|---|
| `src/App.tsx` | 68 | World router via Zustand + hash | Reusable. Keep. |
| `src/components/Hero/CinematicHero.tsx` | 221 | ScrollTrigger pin + phase state machine | **Refactor.** Media switches mid-cinematic. |
| `src/components/Hero/FrameSequenceCanvas.tsx` | 349 | WebP frame loader → canvas | **Rewrite core.** 27 `console.log`; hardcoded time offsets. |
| `src/components/Hero/SelectionVideo.tsx` | 252 | `<video>` overlay + hit regions | **Remove.** Violates "one continuous cinematic". |
| `src/components/Hero/Hero.tsx` | 102 | Older hero attempt | **Dead code.** Not imported anywhere. Delete. |
| `src/store/gameStore.ts` | 22 | `currentWorld` | Reuse, extend with `selectedPath`. |
| `src/hooks/useReducedMotion.ts` | 22 | media-query hook | Reuse (strip logging). |
| `src/data/*.json` | 4 files | beats, delays, compositing | **Replace beats + compositing.** Delays are authoritative — keep. |

### Verified defects in the current build

1. **Abrupt medium swap.** Intro/divergence render from the frame sequence; the selection phase renders an `<video>` element. This is precisely the "Hero → Selection Page" discontinuity the brief forbids.
2. **Asymmetric, wrong black-frame offsets.** `FrameSequenceCanvas.tsx:70-81` hardcodes `left = 8 frames`, `right = 2 frames`. Measured truth: **both sides are 8 frames** (first frame with mean luminance > 30 is index 8 on both).
3. **Black head is short, not structural.** Content is visible by **t = 0.375 s** (left) / **t = 0.360 s** (right). The "genuine black opening frames" are ~0.4 s, not a lead-in that justifies a special offset system.
4. **Hit regions do not match the artwork.** Config says data `x 0.15–0.45`, cloud `x 0.55–0.85`. Measured actual boards: **data `x 0.066–0.342`**, **cloud `x 0.634–0.935`**. Both targets are displaced; the cloud target overhangs the right edge.
5. **Full-duration mapping lands on empty frames** (see §16).
6. **Duplicated magic numbers.** `SelectionVideo.tsx:64` hardcodes `0.72`/`0.86` while also reading the same values from JSON.
7. **42 `console.log` calls** across the Hero directory, several inside `drawFrame` and the render effect — on the per-frame hot path.
8. **Reduced-motion is wrong per brief.** `CinematicHero.tsx:94-112` force-advances to selection after 1000 ms. Brief §15 requires showing a final cinematic state with both choices and letting the user select explicitly.

---

## 2. Source Asset Inventory

| Asset | Location | Facts |
|---|---|---|
| Frame sequence (Data) | `public/frames/left side/` | 232 WebP, 800×450, total 11.041 s, ends blank white |
| Frame sequence (Cloud) | `public/frames/right side/` | 223 WebP, 800×450, total 11.960 s, ends blank white |
| Delay metadata | `src/data/leftDelays.json`, `rightDelays.json` + `public/data/` | Authoritative. Left Σ=11.041, Right Σ=11.960 |
| Reference video | `public/videos/selection-transition.mp4` | 2.4 MB, 1280×720, 24 fps, 192 frames, 8.000 s |
| Extractor | `scripts/extract-delays.ts` | Keep |
| Standalone figure | `public/assets/character.webp` | 107 KB — provenance unclear, see §23 |
| Analysis stills | `public/analysis/*.png` | Legacy QA artifacts |
| Playwright specs | `qa/*.spec.ts` (9 files) | Reuse harness, rewrite assertions |

### Reference video is not new evidence

`Downloads/Video_transition_with_text_and_20261001151641.mp4` and `public/videos/selection-transition.mp4` are **byte-identical**:

```
709764b10f58229265a029d54bcca3b8  (both files)
```

The attachment is the same 8 s clip already in the repo. It is a **motion/composition reference only** — and per brief §6 it must not become the hero asset. It should be moved to a `reference/` folder, out of the shipped bundle, once the coded cinematic replaces it.

---

## 3. Reference-Video Analysis

Measured at 8 fps (64 samples), 1280×720, per-frame absolute differencing.

| Beat | Window | Evidence |
|---|---|---|
| **A. Open hold** | 0.000 – 0.375 s | Frame diff ≈ 0. `PERSONAL` / `PORTFOLIO` flank the figure. Mean luma 175.7 |
| **B. Figure + plate enter, ground lifts** | 0.375 – 1.25 s | Diff 9–18 %/frame, full-frame bbox. Top-band ink 11.7 % → 32.8 % → 9.1 %. Mean luma 176 → 188 |
| **C. Settle** | 1.25 – 1.75 s | Diff decays 14.8 % → 5.3 %. Bg near-white |
| **D. Boards rise into view** | 1.75 – 3.125 s | Diff climbs 5.6 % → 21.8 %. Dark coverage 27 % → 44 %. Column density left 23.6 % → 40.5 %, right 19.7 % → 38.7 % |
| **E. Final settle** | 3.125 – 4.0 s | Diff decays 16.5 % → 1.5 %. Composition locked |
| **F. Selection hold** | 4.0 – 8.0 s | Diff < 1.5 % throughout. Only cursor micro-movement. Static |

**Consequences:**

- Selection is fully interactive at **t = 4.0 s = 50 %** of the reference. The last 4 s are a hold, not choreography.
- The reference **ends at the selection state**. It contains no world-entry transition.
- Background ramps **dark → light** (mean 175.7 → 147.2 as ink accumulates on white; raw luma rises then settles). It is a white-ground monochrome piece, not dark-mode.

### 3.1 Choreography detail

- **0.0 – 1.0 s** — `PERSONAL` (upper left) and `PORTFOLIO` (upper right), large distressed/stencil uppercase, flanking a centred figure holding a lit ID plate.
- **1.0 – 1.75 s** — headline words lift and re-seat; a brief dip in top-band ink (32.8 % → 9.1 %) shows the words leaving that band.
- **1.75 – 3.0 s** — boards enter from below: `DATA ANALYST / DATA ENGINEER` (left, two lines) and `CLOUD / DEVOPS` (right). Both are present and roughly balanced at t ≈ 3.0 s.
- **3.0 – 4.0 s** — settle to the locked selection composition.
- **4.0 – 8.0 s** — hold.

### 3.2 The figure never moves

Central dark-pixel centroid, measured every 0.25 s across the full 8 s:

```
x = 0.491 – 0.492   (σ ≈ 0.004)
y = 0.832 – 0.872   (σ ≈ 0.02, all variation from the words behind the head)
```

This directly confirms brief §4. The camera does not move; the world moves around a fixed anchor. Note this **contradicts** the existing `cinematic-beats.json`, which asserts a `divergenceStart 3.0 → divergenceEnd 3.46` figure divergence. That claim is unsupported by the reference and should be dropped.

### 3.3 Measured selection composition (1280×720 baseline)

| Element | x range | y range | w | h |
|---|---|---|---|---|
| Left board (DATA) | 0.066 – 0.342 | 0.247 – 0.554 | 0.276 | 0.307 |
| Right board (CLOUD) | 0.634 – 0.935 | 0.303 – 0.544 | 0.301 | 0.241 |
| Figure + ID plate | 0.291 – 0.698 | 0.104 – 0.912 | 0.407 | 0.808 |
| Floor band | 0.233 – 0.713 | 0.807 – 1.000 | 0.480 | 0.192 |
| Head/face block | 0.403 – 0.578 | 0.104 – 0.353 | 0.175 | 0.249 |

Boards are **asymmetric**: the left board is taller (two lines) and sits higher; the right board is shorter and slightly lower. A symmetric two-card layout would be a generic-UI regression.

### 3.4 ID plate content (burned into the artwork)

```
NAME: YASH MAHAJAN
AGE: 21
EMAIL: hitoyash1130@gmail.com
```

Also burned in: `SELECT` affordance on the left board, `STATUS: LIVE` on the right, a cursor, plus chart/gear/cloud iconography. Per brief §11 these are **placeholders**, but they are pixels — see Q2.

---

## 4. Visual Choreography — Target Beats

Derived from §3, expressed as fractions of the **scroll-driven** cinematic. Percentages are of the hero scroll track, not of any video.

| Beat | Scroll % | Content |
|---|---|---|
| **S0 — Ignition** | 0 – 6 % | Black → ground lifts. `PERSONAL` / `PORTFOLIO` in from the edges |
| **S1 — Anchor** | 6 – 20 % | Figure + ID plate resolve at dead centre. Headline words hold, breathing scale only |
| **S2 — Lift** | 20 – 28 % | `PERSONAL` / `PORTFOLIO` translate up and out of frame (no fade — physical exit) |
| **S3 — Boards rise** | 28 – 46 % | Left DATA board and right CLOUD board enter from below, staggered ~4 % apart, overshoot slightly |
| **S4 — Lock** | 46 – 52 % | Settle. Scene reaches the reference's t = 4.0 s composition |
| **S5 — Selection hold** | 52 – 100 % | Boards are the live selection targets. Subtle hover/focus response only |

**S5 is deliberately long (48 %).** The user must be able to sit at the choice. Reference evidence: 4 s of the 8 s reference is already a static hold.

On selection, the track leaves scroll control and hands off to a time-based completion (§19).

---

## 5. Scroll Timeline

Single ScrollTrigger, pinned, `scrub: 0.6`. **Scroll position is the timeline** — no trigger-then-play.

```
start: 'top top'
end:   () => `+=${trackHeight}`      trackHeight = 700vh desktop / 520vh mobile
scrub: 0.6
pin: true
anticipatePin: 1
invalidateOnRefresh: true
```

Scroll budget: 700 vh of pinned scroll for S0→S5. Below 52 % the cinematic is purely observational; above 52 % it is a selection surface. Once a world is chosen, the ScrollTrigger is killed and scroll is locked (`overflow: hidden` on the container) for the handoff.

No legacy `0–23 / 23–31 / 31–72 / 72–86 / 86–100` percentages are reused. They are replaced by §4.

---

## 6. Scene Architecture

Eight concerns, eight modules. No module reaches across.

```
src/cinematic/
├── timeline/
│   ├── useHeroTimeline.ts        ScrollTrigger owner; publishes progress
│   ├── beats.ts                  S0–S5 boundaries (§4), single source
│   └── progressBus.ts            rAF-coalesced progress fan-out
├── layers/
│   ├── GroundLayer.tsx           white ground + radial falloff + floor band
│   ├── FigureLayer.tsx           centred figure + ID plate. NEVER animated in x/y/scale
│   ├── TypographyLayer.tsx       PERSONAL / PORTFOLIO, scroll-scrubbed
│   ├── BoardLayer.tsx            DATA + CLOUD plates, entrance + selection state
│   └── GrainLayer.tsx            monochrome noise + vignette, pointer-events:none
├── selection/
│   ├── useWorldSelection.ts      hover / focus / click / touch state machine
│   ├── WorldBoard.tsx            one board = one <button>, 44px+ target
│   └── selectionGeometry.ts      measured rects from §3.3
├── transition/
│   └── WorldHandoff.tsx          selected-world completion (§19)
└── data/
    ├── boardContent.ts           board copy — swappable, no pixels
    └── figureContent.ts          plate copy — swappable, no pixels
```

`App.tsx` mounts `<CinematicHero />`; `CinematicHero.tsx` composes the layers and owns nothing else. Phaser is not imported by any file under `src/cinematic/`.

---

## 7. Central-Figure Strategy

- Position, scale, rotation: **constant for the entire cinematic.** No x/y tween, no scale tween, no hide/show.
- The only permitted motion is a **≤0.6 % parallax breath** on the plate's specular highlight — an optical effect, not a transform. Optional; drop it if it reads as instability.
- Camera-movement impression is produced entirely by GroundLayer (scale 1.00 → 1.06) and TypographyLayer (opposite-direction drift), so the figure stays pinned.
- The figure is a **separate DOM layer above the boards**, not baked into them. This guarantees it cannot be dragged by board animation.
- **Conflict to resolve:** the frame-sequence tails *do* move the figure (left seq pushes it to the right edge, right seq carries it off the left). The coded cinematic will not reproduce that. See Q6.

---

## 8. Typography System

Fonts: system stack — `'Archivo Black', 'Anton', Impact, 'Haettenschweiler', 'Arial Narrow Bold', sans-serif`. Uppercase, `letter-spacing: -0.02em`, weight 900. Distressed/stencil character comes from a CSS mask (SVG turbulence displacement), not a webfont dependency.

| Word | Enter | Exit | Notes |
|---|---|---|---|
| `PERSONAL` | x `-14vw` → 0, scale 0.86 → 1, ease `expo.out` | y `-42vh`, scale 1.14 | Upper-left, x 0.03–0.30 |
| `PORTFOLIO` | x `+14vw` → 0, scale 0.86 → 1, ease `expo.out` | y `-42vh`, scale 1.14 | Upper-right, x 0.68–0.97 |
| `DATA ANALYST` / `DATA ENGINEER` | y `+52vh` → 0, clip-path wipe bottom→top | — | Two lines, left board |
| `CLOUD / DEVOPS` | y `+52vh` → 0, clip-path wipe | — | Single line, right board |

All motion is GSAP `scrub`-bound to the timeline. **No `fadeIn` / `fadeOut`.** Opacity is used only for sub-pixel de-emphasis, never as the primary transition.

Word positions and sizes are tuned against the reference screenshots, not to a type scale.

---

## 9. Board / Information-Plate System

Boards are **graphic objects in the scene**, not cards. Construction:

- Monochrome plate: near-black fill, 1 px light border, technical corner ticks, a header rule, and a monospace metadata strip (`STATUS: LIVE` / `SELECT`).
- Chrome is CSS/SVG only — the iconography is drawn, not bitmap.
- Copy lives in `boardContent.ts` so board text is replaceable without touching pixels.
- Left board carries a chart glyph; right board a gear/cloud glyph. These are the hover affordances.
- Hover/focus response: plate lifts `4px`, border brightens, a scanline sweeps top→bottom, glyph gains a slow rotation. ≤ 240 ms, `power2.out`.
- Selected: the non-selected plate desaturates to 55 % and drops back 8 px; the selected plate holds full contrast and gains a persistent corner marker. This dominance shift is the selection feedback.

### 9.1 Atmospheric accent glow (D4)

The scene is monochrome at rest. World identity appears as a **restrained atmospheric wash** on hover/focus, behind and around the corresponding side — never on the plate itself, never as a filled card.

| Property | Value |
|---|---|
| Data accent | light blue, ~`hsl(205 70% 62%)` at **≤ 0.16 alpha** |
| Cloud accent | light orange, ~`hsl(28 82% 62%)` at **≤ 0.16 alpha** |
| Shape | wide radial ellipse centred on the board, extending ~14 vw beyond the plate edge |
| Blur | 60–90 px `filter: blur()` on a pseudo-element |
| Motion | alpha 0 → 0.16 over 320 ms `power2.out`; scale 0.96 → 1 |
| Nothing hovered | alpha 0 — full monochrome |
| Selected | alpha may rise toward **0.30** during the handoff (§19) |

Constraints: never a hard-edged panel, never a card fill, never a border tint, never a full-width gradient. The glow sits **behind** the plate and the figure (z-index below both) so the figure never picks up a colour cast. Touch devices get the accent on tap-preview, then on selection.

**Contrast:** the accent is decorative and carries no information. All text contrast is measured against the monochrome ground, so the glow cannot create a WCAG regression. Verify it does not reduce board-text contrast by more than 0.3:1 against its resting value.

---

## 10. World-Selection Design

Selection happens **inside the cinematic**, on the boards themselves, at the S5 hold. No `PathSelection` page, no card grid, no "Choose Your Path" heading.

- The two plates from §9 are the targets.
- Hit geometry = measured §3.3 rects, with a 44×44 CSS px floor enforced programmatically and re-checked on resize.
- Screen-reader text: `Enter the Data world — data analyst and data engineering` / `Enter the Cloud world — cloud and DevOps`.
- Live region announces: boards available → hovered/focused → selected → world name.

---

## 11. Interaction Model

| Input | Behaviour |
|---|---|
| Pointer hover | Subtle plate response (§9). Desktop only. |
| Pointer leave | Returns to rest over 240 ms |
| Tab | Focuses Data board, then Cloud board. Visible focus ring, 2 px, offset |
| Enter / Space | Selects the focused board |
| Touch | First tap = focus + preview response; second tap on the same board = select. No hover dependency |
| Selection | Sets `selectedPath`, kills ScrollTrigger, locks scroll, starts §19 |

State lives in a Zustand slice (`selectedPath`, `hoveredBoard`, `focusedBoard`, `cinematicPhase`). React state is **not** used for scroll progress — see §17.

---

## 12. Accessibility

- Both boards are real `<button>` elements. No `aria-hidden` on anything interactive.
- Visible `:focus-visible` ring on a plate that is itself high-contrast, so the ring is perceivable against monochrome.
- Targets: measured rect, floored at 44×44 CSS px, asserted in a Playwright test.
- Live region `aria-live="polite"` for phase and selection announcements.
- Canvas is `aria-hidden` and purely decorative in this build.
- Skip link already present in `App.tsx` — retained.
- Contrast: monochrome with a single accent per world. Accent must clear WCAG AA against the white ground — see Q5.
- Full keyboard path: `Tab` → `Tab` → `Enter` must reach a world with no pointer.

---

## 13. Reduced Motion

Honours `prefers-reduced-motion: reduce`, live-reactive.

- No pinning, no scrub, no parallax, no idle loops.
- Renders the **final** cinematic state immediately: the S4/S5 locked composition — figure centred, both boards in place at full contrast.
- Both choices visible and fully interactive. **Nothing is auto-selected** (brief §15).
- Selection performs an instant 120 ms cross-fade to the world's first frame, no travel animation.
- Users can still reach every world by keyboard alone.

---

## 14. Responsive Behaviour

The desktop layout is **not** scaled down. Each breakpoint gets a recomposed scene.

| Range | Figure | Typography | Boards | Selection |
|---|---|---|---|---|
| ≥ 1600 | 46 vh, centred | Full 2-word spread, 8.5 vw | Side plates, measured rects × 1.15 | Plaque targets |
| 1440–1599 | 44 vh | 8 vw | Measured rects | Plaque targets |
| 1280–1439 | 42 vh | 7 vw | Measured rects | Plaque targets |
| 1024–1279 | 40 vh, raised to 0.42 vh | 6.5 vw | Boards tighten, gap narrows | Plaque targets |
| 768–1023 (tablet) | 34 vh | 5.5 vw | Boards move to lower third, figure clears above | Full-width plates, 64 px tall |
| < 768 (mobile) | 30 vh | 4.6 vw | Stacked plates below figure, full-bleed | Two stacked 72 px plates |

Rules that hold at every width:
- The figure is always the visual anchor and always optically centred.
- `PERSONAL` / `PORTFOLIO` never collide with the figure's head block (§3.3: head spans x 0.403–0.578).
- Board targets never drop below 44×44 CSS px; on mobile they grow to 72 px.
- Aspect ratio: art is authored 16:9; the ground layer extends to fill taller viewports rather than letterboxing.

---

## 15. Rendering Strategy

| Concern | Approach |
|---|---|
| Ground, vignette, grain | CSS layers, `will-change: transform` only while scrubbing |
| Figure + plate | Single `<img>` (or `<picture>`), `transform: translateZ(0)`, `object-fit: contain` |
| Typography | DOM text + CSS mask for the stencil edge. DOM, not canvas — selectable, accessible, resolution-independent |
| Boards | DOM + inline SVG chrome |
| Canvas | **Removed from the cinematic.** No frame-sequence canvas is needed once typography and boards are code |

DOM over canvas is a deliberate reversal of the current build. The typography is the hero of this piece; rendering it as text makes it accessible, responsive, and replaceable — all three are explicit requirements. The cost is that pixel-exact parity with the reference typography is approximate; §26 makes that an accepted, bounded trade.

---

## 16. Frame-Sequence Strategy

The sequences are the **evidence base and secondary visual asset references** (D1/D2), not the shipping render path. With D2 (hybrid), typography is live DOM and the figure is a preserved cut, so the sequences are **reference-only** and move out of the shipped bundle. They are retained in-repo for comparison and QA.

Measured per side:

| | Left (Data) | Right (Cloud) |
|---|---|---|
| Frames | 232 | 223 |
| Total | 11.041 s | 11.960 s |
| Black head | idx 0–7, content from **t = 0.375 s** | idx 0–7, content from **t = 0.360 s** |
| **Last frame with content** | **idx 202, t = 8.916 s (80.8 %)** | **idx 184, t = 7.840 s (65.6 %)** |
| Blank white tail | idx 203–231 → **19.2 % of duration** | idx 185–222 → **34.4 % of duration** |
| End state | `DATA ANALYST / DATA ENGINEER` dominant, figure cropped right | `CLOUD / DEVOPS` dominant, figure gone left |
| Shared intro | identical to t ≈ 2.5 s (mean abs diff ≤ 5.5), diverging after | |

**The blank-white tail is a real defect in the current mapping.** `FrameSequenceCanvas` maps the full 11.041 s / 11.960 s, so the last fifth (left) and last third (right) of the scroll renders an empty white canvas. It is not currently noticed because the `<video>` overlay covers the selection phase.

Per **D3**, the blank tail is not meaningful content. Any frame-sequence read clamps to the last content frame, and the flow transitions into the coded cinematic scene instead. Frame index is derived from **cumulative delay** — `bisect` over `cumsum(delays)` — never `progress * totalFrames`.

Per **D1**, where the sequences disagree with the video, the video wins. Specifically the sequence-tail figure exits are discarded (D5) and the sequence's own typography movement is not copied where it conflicts with the video.

---

## 17. GSAP / ScrollTrigger Strategy

- One master `ScrollTrigger`, `pin`, `scrub: 0.6`, `invalidateOnRefresh: true`.
- A single GSAP timeline drives all layer tweens. No independent `ScrollTrigger` per layer — that is what produced the current medium swap.
- **Progress transport:** `timeline.eventCallback('onUpdate')` → write to a module-level bus → layers subscribe. Scroll progress does **not** enter React state. The current code calls `setScrollProgress` on every scroll tick, re-rendering the tree at input rate; that is the main perf problem today.
- Frame-sequence reads (if any) happen inside a `ScrollTrigger.onUpdate` callback, coalesced to one `requestAnimationFrame`.
- All ScrollTrigger instances registered in a module-level context and killed on unmount; `gsap.context()` for cleanup.
- `ScrollTrigger.refresh()` on resize and on font load, debounced 150 ms.

---

## 18. State Management

Zustand, extended from the existing store:

```ts
type World = 'hero' | 'data-world' | 'cloud-world' | 'experience'
type Path  = 'data' | 'cloud' | null

interface GameState {
  currentWorld: World
  selectedPath: Path
  hoveredBoard:  Exclude<Path, null> | null
  focusedBoard:  Exclude<Path, null> | null
  cinematicPhase: 'ignition' | 'anchor' | 'lift' | 'boards' | 'lock' | 'selection' | 'handoff'
  setCurrentWorld(w: World): void
  selectPath(p: Exclude<Path, null>): void
  reset(): void
}
```

Rules: store holds **discrete** state only. Continuous values (scroll progress, hover tween values) live in refs/GSAP. `selectedPath` is written once on confirm and is the only input to the handoff. Hash routing (`#/data-world`, `#/cloud-world`) is retained.

---

## 19. World Transition

On confirm, the cinematic does **not** cut. Sequence:

1. `selectedPath` set. ScrollTrigger killed, scroll locked.
2. Non-selected plate desaturates and drops back (240 ms).
3. Selected plate expands to fill the frame as the camera pushes in — GroundLayer scale `1.00 → 1.12`. The selected world's accent glow rises toward **0.30 alpha** here (D4) and the unselected side's glow falls to 0.
4. World identity resolves: the world word sets large and centred, monochrome, with the world's single accent rule.
5. Hold ~400 ms at the world word.
6. Cross-fade to the world mount point; `currentWorld` set; hash updated.

Total 1.6–2.0 s, skippable by any key or click. On `Escape` during handoff, return to the S5 hold with `selectedPath` cleared and ScrollTrigger restored.

---

## 20. Testing

| Suite | Scope |
|---|---|
| `timeline.unit` | `beats.ts` boundaries monotonic, 0 → 1, S5 ≥ 40 % |
| `progressBus.unit` | rAF coalescing; no duplicate writes per frame |
| `frameIndex.unit` | delay-cumulative lookup; clamps to last content frame; handles empty/black head |
| `geometry.unit` | selection rects resolve ≥ 44×44 at every breakpoint in §14 |
| `selection.e2e` | Playwright: hover both, focus both, Enter and Space select, hash updates, `Escape` reverts |
| `reducedMotion.e2e` | `prefers-reduced-motion: reduce` → final state shown, both boards interactive, **nothing auto-selected** |
| `a11y.e2e` | axe on the selection state; buttons exposed, 44 px asserted, no `aria-hidden` on focusables |
| `perf.e2e` | Scroll 0 → 100 % in 30 steps; assert no React commit storm and frame time under budget |

---

## 21. Visual QA (mandatory, human)

Automated tests do not close this phase. Screenshots in a real browser at **0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 %** scroll, plus:

- Data hover · Cloud hover · Data selected · Cloud selected
- Reduced motion
- 1920×1080, 1440×900, 1280×800, 1024×768, 834×1112, 390×844

Reference side-by-sides: reference frame at t = 0.0, 1.0, 2.0, 3.0, 4.0 against implementation at S0, S1, S2/S3, S3/S4, S4/S5. Acceptance is judged against the reference, per the §19 source-of-truth hierarchy.

---

## 22. Performance

- No canvas in the critical path; DOM layers composite on the GPU.
- Progress never enters React state.
- Zero `console.log` on any per-frame path.
- One `requestAnimationFrame` writer, many passive readers.
- Only the hovered/focused board animates; siblings stay static.
- Target: 60 fps during scrub on a 5-year-old laptop; interaction latency < 100 ms.
- Initial payload: figure + fonts + inline SVG only. The 2.4 MB reference video leaves the shipped bundle.

---

## 23. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Unknown figure asset.** `public/assets/character.webp` provenance is unclear; the figure exists in the reference video and inside the frame sequences but no clean standalone cut is documented | Blocks §7 | Extract from reference t = 4.0 s on white as the canonical cut (Task 1), or supply the master. D2 confirms the figure is preserved and reused, so a cut must exist |
| R2 | **Typography fidelity.** Recreating stencil letterforms in CSS will not match the reference pixel-for-pixel | Visible | Bound the gap: match position, scale, weight, motion. Accept and document the typeface difference |
| R3 | **Frame sequences demoted.** D2 resolves this: typography is live DOM and the figure is a preserved cut, so the sequences are reference-only | Resolved — 32 MB leaves the bundle | Task 1 moves `public/frames/` → `reference/frames/`, keeps them in-repo for QA comparison |
| R4 | **Empty-white tails** (§16) | Dead scroll if sequences are used | Clamp to last content frame; resolve via Q1 |
| R5 | **Board asymmetry** (§3.3) tempts a symmetric layout | Generic-UI regression the brief forbids | Assert asymmetric rects in `geometry.unit` |
| R6 | **No reference for world entry.** The authoritative video ends at the selection hold (t = 4.0–8.0 s static, last frame still the two-board selection) | Design invented for §19 | **Open — Q6.** §19 is a proposal; needs your sign-off before Task 8 |
| R7 | No git repository | No rollback | `git init` + baseline commit before Task 1 |
| R8 | 9 legacy Playwright specs + `compare_visual.py` assume the old architecture | False failures | Triage in Task 0; archive rather than fix |

---

## 24. Non-Goals

Explicitly out of Phase 1: Phaser scenes, skills, projects, pipes, post-game sections, nav/footer, SEO, real board/plate copy, audio, and any figure animation.

---

## 25. Task Execution Order

Each task: **objective · inputs · files · intent · testing · visual QA · acceptance · stop condition.**

### Task 0 — Baseline & Safety Net
- **Objective:** version control and a green baseline before any edit.
- **Inputs:** current repo state.
- **Files:** none (git only). Triage `qa/`.
- **Intent:** `git init`, baseline commit, `.gitignore` for `dist/`, `qa-*.png`, `test-results/`. Classify the 9 specs: keep / rewrite / archive. Archive `public/analysis/`.
- **Testing:** `npx tsc -b --noEmit` exit 0; `npm run build` succeeds; dev server boots and the current hero renders.
- **Visual QA:** screenshot current build at 0/50/100 % as the "before" record.
- **Acceptance:** clean commit; tsc 0; build green; spec triage recorded in `.gsd/STATE.md`.
- **STOP:** Do not proceed if the build is not green. Report instead.

### Task 1 — Figure Resolution & Sequence Demotion *(D1/D2/D3)*
- **Objective:** a canonical figure cut and a decision on frame-sequence retention.
- **Inputs:** reference video, frame sequences, `character.webp`.
- **Files:** `public/assets/figure-final.webp` (new); move reference video to `reference/`; possibly move `public/frames/` → `reference/frames/`.
- **Intent:** extract the figure from reference t = 4.0 s on white, or adopt the supplied master (R1). Strip the baked ID-plate text if a clean figure-only cut is possible. Per **D2** the figure/artwork is preserved and reused. Per **D1/D3** move `public/frames/` and `public/videos/selection-transition.mp4` out of the shipped bundle into `reference/` — they are secondary visual references only.
- **Testing:** image dimensions and alpha verified; figure loads over the ground layer.
- **Visual QA:** figure overlaid on the reference frame — pixel-aligned at x 0.291–0.698, y 0.104–0.912.
- **Acceptance:** figure matches reference geometry within 2 px; no baked text; payload under 300 KB; `public/` no longer ships frames or the reference video.
- **STOP:** if no clean cut exists, stop and ask. Do not ship a figure with baked placeholder text.

### Task 2 — Timeline Skeleton (no visuals)
- **Objective:** the scroll timeline exists and is provably correct before anything is drawn.
- **Inputs:** `beats.ts` (§4), ScrollTrigger config (§5).
- **Files:** `src/cinematic/timeline/{beats.ts,useHeroTimeline.ts,progressBus.ts}`.
- **Intent:** pinned ScrollTrigger, rAF-coalesced progress bus, phase derivation, kill/refresh discipline. No layer components yet.
- **Testing:** `timeline.unit`, `progressBus.unit`; a Playwright scroll probe logs progress 0 → 1 monotonically across the pinned range.
- **Visual QA:** N/A (deliberately empty scene).
- **Acceptance:** progress monotonic; refresh-safe; zero React commits per scroll tick.
- **STOP:** if progress cannot be read cleanly without React re-renders, stop — everything downstream depends on this.

### Task 3 — Ground + Figure Layers
- **Objective:** the visual anchor and its stage, per §7.
- **Inputs:** Task 1 figure; §3.3 geometry.
- **Files:** `src/cinematic/layers/{GroundLayer,FigureLayer,GrainLayer}.tsx` + CSS.
- **Intent:** white ground with falloff and floor band; figure centred and immovable; grain/vignette overlay. Ground carries the camera-scale illusion.
- **Testing:** computed style asserts on the figure: no transform tween bound to progress.
- **Visual QA:** screenshots at 0/25/50/75/100 % — figure position must be pixel-identical at every one.
- **Acceptance:** figure x-centre drift < 1 px and y drift < 1 px across the whole track.
- **STOP:** if the figure moves at all, stop. This is the single hardest requirement (brief §4).

### Task 4 — Typography Choreography
- **Objective:** `PERSONAL` / `PORTFOLIO` as scroll-scrubbed cinematic objects.
- **Inputs:** §8; reference frames at t = 0.0, 1.0, 1.5.
- **Files:** `src/cinematic/layers/TypographyLayer.tsx`, `src/cinematic/data/typography.ts`.
- **Intent:** word objects with physical entrance, lift, and exit. Stencil mask. No `fadeIn`/`fadeOut`.
- **Testing:** DOM assertions — words present, `transform` changes with scroll, `opacity` is not the sole transition.
- **Visual QA:** side-by-side against reference t = 0.0/1.0/1.5 at S0/S1/S2.
- **Acceptance:** words exit by translation, not fade; positions within 4 % of reference; never collides with the head block.
- **STOP:** if fidelity cannot be bounded, stop and report the gap rather than shipping an approximation silently.

### Task 5 — Board System
- **Objective:** the two information plates as scene objects.
- **Inputs:** §9; §3.3 rects; reference t = 2.0, 3.0, 4.0.
- **Files:** `src/cinematic/layers/BoardLayer.tsx`, `src/cinematic/data/boardContent.ts`.
- **Intent:** plate construction, staggered rise entrance, asymmetric placement preserved, copy externalised. Per **D2** plate typography is live DOM/SVG, not read from the sequences' baked pixels.
- **Testing:** geometry asserts rects match §3.3 within tolerance; copy swap changes rendered text with no pixel edits.
- **Visual QA:** side-by-side at t = 2.0/3.0/4.0 against S3/S3/S4.
- **Acceptance:** asymmetric layout preserved; boards read as physical plates, not web cards; copy fully data-driven.
- **STOP:** if the boards read as generic cards, stop and redesign before proceeding.

### Task 6 — World Selection + Accessibility
- **Objective:** selection inside the cinematic, fully accessible.
- **Inputs:** §10–§12; `selectionGeometry.ts`.
- **Files:** `src/cinematic/selection/*`, `src/cinematic/layers/AccentGlowLayer.tsx` (D4 §9.1).
- **Intent:** boards become buttons, hover/focus/click/touch, 44 px floor, live region, measured hit rects. Per **D4** add the restrained hover accent glow — monochrome at rest, light-blue wash behind Data, light-orange behind Cloud, returning to monochrome when nothing is hovered.
- **Testing:** `selection.e2e`, `a11y.e2e`, `geometry.unit`; keyboard-only path to both worlds.
- **Visual QA:** Data hover, Cloud hover, focus rings, both selections.
- **Acceptance:** keyboard-only selection works; axe clean; every target ≥ 44×44 at all six widths; resting state is fully monochrome; hover produces a restrained atmospheric wash that is not a card fill or large gradient; unhover returns to monochrome.
- **STOP:** if any target is under 44 px or axe reports a violation, stop.

### Task 7 — Reduced Motion
- **Objective:** a meaningful, non-auto-selecting reduced-motion path.
- **Inputs:** §13.
- **Files:** `src/cinematic/...` reduced-motion branches.
- **Intent:** final state immediately, no pin, no scrub, both boards live.
- **Testing:** `reducedMotion.e2e` asserts **no** world is pre-selected.
- **Visual QA:** reduced-motion screenshots at 390×844 and 1440×900.
- **Acceptance:** both worlds reachable; nothing auto-chosen; no motion.
- **STOP:** if anything auto-selects, stop.

### Task 8 — World Handoff
- **Objective:** selection resolves cinematically into the chosen world.
- **Inputs:** §19 (needs approval — R6).
- **Files:** `src/cinematic/transition/WorldHandoff.tsx`.
- **Intent:** the six-step handoff, skippable, `Escape`-revertible.
- **Testing:** handoff completion sets `currentWorld` + hash; `Escape` restores S5.
- **Visual QA:** frame captures through the full handoff for both worlds.
- **Acceptance:** no cut; completes in 1.6–2.0 s; skippable; reversible.
- **STOP:** **Q6 still open.** Awaiting approval of §19 before starting. This is the only remaining blocker.

### Task 9 — Visual QA Pass & Performance
- **Objective:** close the phase honestly.
- **Inputs:** §21, §22.
- **Files:** QA artifacts to `qa/phase1-final/`; `.gsd/STATE.md`.
- **Intent:** full screenshot matrix, reference side-by-sides, perf measurement.
- **Testing:** `perf.e2e`.
- **Visual QA:** the complete §21 matrix.
- **Acceptance:** every matrix cell reviewed against the reference; 60 fps scrub; zero console errors.
- **STOP:** any cell failing reference comparison stops the phase for your review.

### Task 10 — GSD Close-Out
- **Objective:** documentation matches reality.
- **Files:** `.gsd/{STATE,ROADMAP,CAPABILITIES,LESSONS}.md`; this plan marked complete.
- **Acceptance:** no stale claims; the removed black-offset and divergence assumptions are recorded as lessons.

---

## 26. STOP Gates

| Gate | Condition |
|---|---|
| G0 | After Task 0 — baseline committed, build green |
| G1 | After Task 2 — timeline provably correct before any visuals |
| G2 | After Task 3 — figure demonstrably immobile |
| G3 | After Task 5 — boards read as scene objects, not cards |
| G4 | After Task 6 — keyboard-complete and axe-clean |
| G5 | After Task 8 — handoff approved by you, then verified |
| G6 | After Task 9 — full visual matrix reviewed against the reference |

Plus: stop at any task's stated stop condition, and stop on any unanswered question in §27 that turns out to be load-bearing for the next task.

---

## 27. Questions Requiring Human Decision

**Status: Q1–Q5 answered 2026-10-01 and locked as D1–D5 in §0. Q6 remains open and is the only blocker to Task 8.**

---

### Resolved

| # | Question | Locked decision |
|---|---|---|
| Q1 | Reference video not new evidence | **D1** — video is authoritative; sequences are secondary; recreate in code |
| Q2 | Where typography lives | **D2** — hybrid; figure/artwork preserved, typography live DOM/SVG |
| Q3 | Blank-white tail | **D3** — not meaningful content; clamp and transition to coded scene |
| Q4 | Figure moves in sequence tails | **D5** — hold figure fixed, discard that exit |
| Q5 | Monochrome vs accents | **D4** — monochrome default, restrained accent glow on hover only |

---

### OPEN — Q6: Approve the world handoff (§19)?

No reference exists for post-selection motion — the authoritative video ends at the selection hold (t = 4.0 s → 8.0 s is static, and the last frame is still the two-board selection, not a world entry). §19 is therefore **my proposal, not derived from evidence**:

1. `selectedPath` set, scroll killed and locked
2. Non-selected plate desaturates, drops back 8 px (240 ms)
3. Selected plate expands as camera pushes in — ground scale `1.00 → 1.12`; selected accent glow rises toward 0.30 alpha
4. World word resolves large and centred
5. Hold ~400 ms
6. Cross-fade to the world mount; `currentWorld` + hash set

Total 1.6–2.0 s, skippable by key or click, `Escape`-revertible to the S5 hold.

**Approve as-is, or supply a reference for post-selection motion?**

---

## Appendix A — Measured Constants

```
Reference video   1280×720, 24 fps, 192 frames, 8.000 s
  S0 open hold        0.000 – 0.375 s
  S1 figure enters    0.375 – 1.250 s
  S2 settle           1.250 – 1.750 s
  S3 boards rise      1.750 – 3.125 s
  S4 lock             3.125 – 4.000 s
  S5 selection hold   4.000 – 8.000 s   (interactive from 4.0 s = 50%)

Figure centroid (8 s, 32 samples)   x 0.491–0.492   y 0.832–0.872
Figure bbox at hold                x 0.291–0.698   y 0.104–0.912
Left board (DATA)                  x 0.066–0.342   y 0.247–0.554
Right board (CLOUD)                x 0.634–0.935   y 0.303–0.544
Head block                         x 0.403–0.578   y 0.104–0.353
Floor band                         x 0.233–0.713   y 0.807–1.000

Left sequence   232 frames  800×450  Σ11.041 s  content ends idx 202  t 8.916 s (80.8%)
Right sequence  223 frames  800×450  Σ11.960 s  content ends idx 184  t 7.840 s (65.6%)
Black head      content visible from idx 8 on BOTH sides (t 0.375 s / 0.360 s)
Shared intro    identical to t ≈ 2.5 s, diverges after
Crossfade band  mean abs diff 37–49 at idx 66–114
```

## Appendix B — Files to Remove

```
src/components/Hero/Hero.tsx              dead — not imported anywhere
src/components/Hero/Hero.css              dead — paired with the above
src/components/Hero/SelectionVideo.tsx    medium swap violates brief §3
src/components/Hero/FrameSequenceCanvas.tsx  removed — canvas leaves the cinematic (§15, D2)
src/data/cinematic-beats.json             replaced by src/cinematic/timeline/beats.ts
src/data/selection-compositing.json       replaced by selectionGeometry.ts (§3.3 measured rects)
42 console.log calls across src/components/Hero/

moved out of the shipped bundle (reference-only per D1/D2/D3):
public/videos/selection-transition.mp4    → reference/selection-transition.mp4
public/frames/                            → reference/frames/
public/analysis/                          legacy artifacts → archive
```

## Appendix C — Source-of-Truth Ranking Applied

Per **D1**, the ranking is:

1. **The authoritative reference video** (`Video_transition_with_text_and_20261001151641.mp4`) — §3 beats, §4 timeline, §3.3 geometry
2. Source frame sequences and existing artwork — secondary visual asset references only (§16)
3. Approved requirements — the brief, as amended by D1–D5
4. Existing implementation — §1
5. Generic design assumptions — **excluded wherever they conflict with 1–3**

**Tie-breaks settled by this ranking:**

- `cinematic-beats.json` asserts a figure divergence at t = 3.0–3.46 s; the video shows the figure immobile (x centroid 0.491–0.492). **Video wins** — the divergence claim is dropped.
- The sequences' tail figure exits (left pushes right, right carries off left); the video's figure never moves. **Video wins** — exits discarded (D5).
- The sequences' typography movement; the video's. **Video wins** — the sequences' motion is not copied (D2).
- Current hardcoded black offsets (left 8 / right 2); measured 8 on both. **Measurement wins** — and with D2 the offsets leave the build entirely.
- Current hit rects (`0.15–0.45` / `0.55–0.85`); measured `0.066–0.342` / `0.634–0.935`. **Measurement wins.**
- A symmetric two-card selection layout; the video's boards are measurably asymmetric. **Video wins** — asymmetry preserved (R5).
