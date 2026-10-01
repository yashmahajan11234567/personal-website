# Reference Material — NOT part of the shipped site

Placed here 2026-10-01 (Phase 1 rebuild, Task 1) per decision **D1/D2/D3**.

The site's hero motion is **recreated in code** (GSAP/ScrollTrigger + live DOM/SVG). Nothing in
this folder is served to visitors or bundled by Vite.

## Contents

| Path | What it is | Status |
|---|---|---|
| `authoritative-reference.mp4` | `Video_transition_with_text_and_20261001151641.mp4` — 1280×720, 24 fps, 192 frames, 8.000 s. **Byte-identical** to `selection-transition.mp4` (MD5 `709764b10f58229265a029d54bcca3b8`) | **AUTHORITATIVE** (D1) |
| `selection-transition.mp4` | The same file, previously at `public/videos/` | Superseded by the above |
| `frames/left side/` | 232 WebP, 800×450, Σ 11.041 s — the **Data** path | Secondary reference (D1) |
| `frames/right side/` | 223 WebP, 800×450, Σ 11.960 s — the **Cloud/DevOps** path | Secondary reference (D1) |

## Precedence (D1)

1. **`authoritative-reference.mp4`** — governs motion, choreography, typography movement, board
   entrance/exit, composition, timing.
2. Everything else here — secondary visual asset references. **Must not override the video.**

Specific cases where the frames were overridden by the video:

- The sequences' tail exits (left pushes the figure right, right carries it off the left) are
  **discarded** — the video's figure never moves (D5).
- The sequences' baked typography is **not** the source of truth for the site's type — type is
  live DOM/SVG (D2).
- The sequences' blank-white tails (left final 19.2 %, right final 34.4 %) are **not** meaningful
  content (D3).

## Measured reference facts

Derived from `authoritative-reference.mp4` and recorded in
`.gsd/plans/phase-1-cinematic-rebuild.md` §3 and Appendix A.

```
S0 open hold        0.000 – 0.375 s     PERSONAL / PORTFOLIO flank the figure
S1 figure enters    0.375 – 1.250 s
S2 settle           1.250 – 1.750 s
S3 boards rise      1.750 – 3.125 s     DATA + CLOUD/DEVOPS boards enter from below
S4 lock             3.125 – 4.000 s
S5 selection hold   4.000 – 8.000 s     static; interactive from t = 4.0 s

Figure centroid (32 samples)   x 0.491–0.492   y 0.832–0.872
Figure bbox at hold            x 0.291–0.698   y 0.104–0.912
Data board  (left)             x 0.066–0.342   y 0.247–0.554
Cloud board (right)            x 0.634–0.935   y 0.303–0.544
Head block                     x 0.403–0.578   y 0.104–0.353
Floor band                     x 0.233–0.713   y 0.807–1.000
```

The video **ends at the selection state**. It intentionally contains no world-entry animation
(accepted 2026-10-01). The world handoff is a separate small coded interaction — see
`.gsd/QUESTIONS-PHASE-1.md` and Task 8 of the rebuild plan.
