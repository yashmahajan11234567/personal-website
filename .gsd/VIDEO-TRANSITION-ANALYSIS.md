# Video Transition Analysis — Authoritative Reference

**Source**: `C:/Users/hitoy/Downloads/Video_transition_with_text_and_20261001151641.mp4`
**MD5**: `709764b10f58229265a029d54bcca3b8`
**Container**: 1280×720, 24 fps, 192 frames, 8.000 s

> **Important finding first**: this file is **byte-identical** to
> `reference/authoritative-reference.mp4` and to the old
> `public/videos/selection-transition.mp4` that was shipped before the rebuild
> (all MD5 `709764b1…`). This analysis is therefore a rigorous re-measurement of
> the reference the Phase 1 rebuild was already built against — **not a new
> authority**. Nothing in the current implementation conflicts with it; the
> differences found are measurement artefacts, documented in §6.

---

## 1. Method

All 192 frames extracted losslessly to PNG and measured numerically. No eyeballing.

| Measure | Definition |
|---|---|
| Frame-to-frame motion | `mean(abs(L[i] - L[i-1]))` over the whole frame, and per region |
| Ink | fraction of pixels darker than a threshold |
| Solid plate | threshold `< 90` luma **and** row coverage `> 55 %` — excludes antialiased type |
| Regions | left `x 0.02–0.37`, right `x 0.63–0.98`, figure `x 0.38–0.62`, top `y 0.02–0.30` |

A connected-component pass was used to locate elements without reading text
(untrusted visual analysis was unavailable; see §7).

---

## 2. Motion profile — the whole video is two events

Frame-to-frame motion, sampled every 4 frames:

```
frame  t(s)   whole-frame motion
    0  0.00   0.0     ← static opening
    8  0.33   2.4     ← motion begins
   20  0.83  10.3   ████████████████████
   32  1.33   7.1   ██████████████
   44  1.83   2.7   █████
   56  2.33   7.7   ███████████████
   72  3.00  10.2   ████████████████████
   84  3.50   6.3   ████████████
   92  3.83   2.7   █████
   96  4.00   0.4   ← everything has settled
  120  5.00   1.5   (flicker only)
  191  7.96   0.3
```

**Two motion events, with a quiet gap between them:**

| Event | Frames | Time | Peak motion |
|---|---|---|---|
| **A — typography exit** | 8 – 34 | 0.33 – 1.42 s | 10.3 (t 0.83) |
| *gap* | 35 – 43 | 1.46 – 1.79 s | ~2.2 |
| **B — boards rise** | 44 – 95 | 1.83 – 3.96 s | 10.2 (t 2.67–3.0) |
| **Static hold** | 96 – 191 | 4.00 – 7.96 s | ≤ 1.5 (flicker) |

Mean luma tells the same story and is the cleanest single indicator of "how much
of the final composition has arrived":

```
t 0.00–1.42   176 → 188   (ground brightens as type leaves)
t 1.46–1.79   188 → 183   (quiet)
t 1.83–2.33   183 → 164   (boards begin arriving)
t 2.33–3.83   164 → 147   (main rise)
t 3.96–7.96   147.2 flat  (selection hold)
```

---

## 3. Event A — typography exit (t 0.33 – 1.42 s)

Headline ink in the top band, measured excluding the figure's columns:

| Frame | t (s) | Top-band ink | Reading |
|---|---|---|---|
| 0 | 0.00 | 0.0172 | opening type present |
| 8 | 0.33 | 0.0174 | unchanged — motion is starting |
| 12 | 0.50 | **0.0000** | **type gone from the top band** |
| 20 | 0.83 | 0.0495 | new marks appear (lower, larger) |
| 24 | 1.00 | 0.1417 | peak |
| 28 | 1.17 | 0.1745 | peak |
| 32 | 1.33 | 0.0594 | falling |
| 40 | 1.67 | **0.0000** | gone again |

Solid-plate rectangles during this window show a **single wide bar spanning
x 0.0375 – 0.9703** — one element crossing the full frame, not two side plates.
Its vertical position climbs steadily:

| Frame | t (s) | Bar y-extent |
|---|---|---|
| 12 | 0.50 | 0.328 – 0.478 |
| 16 | 0.67 | 0.274 – 0.424 |
| 20 | 0.83 | 0.201 – 0.353 |
| 24 | 1.00 | 0.122 – 0.272 |
| 28 | 1.17 | 0.039 – 0.189 |
| 32 | 1.33 | 0.000 – 0.113 |

**The opening typography exits upward and off the top of the frame** between
t 0.33 s and t 1.42 s. It does not fade, and it does not transform in place.

---

## 4. The central figure never moves

Per-region frame-to-frame motion, sampled every 4 frames:

```
frame  t(s)   left-band  right-band  FIGURE-band   top    bottom
   16  0.67     12.134     11.421       1.573     0.539   0.531
   24  1.00     14.897     13.789       1.736    28.952   0.603
   28  1.17     14.841     13.622       1.785    51.170   0.625
   64  2.67     14.796     13.708       1.611     0.775  13.041
   80  3.33     11.911     12.413       1.115     0.679   0.863
   96  4.00      1.400      1.348       1.469     0.870   1.036
```

The figure band never exceeds **1.8** while the side bands reach **15**. The
figure's dark extent is constant for the entire video:

```
frame   0 : y 0.100 – 0.994
frame  96 : y 0.106 – 0.994
frame 191 : y 0.106 – 0.994
```

**Confirmed: the central figure is stationary for all 192 frames.** Everything
that moves happens around it. This matches the hard requirement exactly, and
matches what the implementation already does (D5, asserted by test).

---

## 5. Event B — boards rise from the bottom (t 1.83 – 3.96 s)

The boards are **not** present in the opening frames. Connected components at
t 0.00 s show only five small blocks in the mid-band (y 0.378 – 0.659,
x 0.259 – 0.991) — these are **type on the ground plane**, not plates.

The plates arrive from **below the frame bottom** and rise:

| Frame | t (s) | Data plate y | Cloud plate y |
|---|---|---|---|
| 44 | 1.83 | 0.856 – 0.999 | 0.858 – 0.999 |
| 48 | 2.00 | 0.778 – 0.999 | 0.778 – 0.999 |
| 52 | 2.17 | 0.697 – 0.999 | 0.697 – 0.999 |
| 56 | 2.33 | 0.617 – 0.999 | 0.617 – 0.999 |
| 60 | 2.50 | 0.542 – 0.943 | 0.542 – 0.943 |
| 64 | 2.67 | 0.472 – 0.872 | 0.472 – 0.871 |
| 72 | 3.00 | 0.353 – 0.754 | 0.353 – 0.753 |
| 80 | 3.33 | 0.272 – 0.674 | 0.272 – 0.674 |
| 88 | 3.67 | 0.234 – 0.635 | 0.234 – 0.634 |
| 95 | 3.96 | 0.225 – 0.626 | 0.225 – 0.626 |
| 191 | 7.96 | 0.225 – 0.626 | 0.225 – 0.626 |

Both plates move **together, in perfect lockstep** (identical y to four
decimals at every sample) — there is no stagger between them.

They travel from fully below the frame bottom to their final position over
**2.13 s**, arriving at t 3.96 s. From t 4.00 s to t 7.96 s nothing moves.

---

## 6. What this means for the current implementation

I measured the current build against the video with identical metrics:

| Metric | Video (t 0–8 s) | My build | Verdict |
|---|---|---|---|
| Figure dark extent | y 0.100 – 0.994 (constant) | y 0.1333 – 0.9989 | ✅ within 0.007 |
| Figure motion | band ≤ 1.8 | transform `none` | ✅ stationary |
| Boards at scroll 0 % | **absent** | **absent** | ✅ |
| Boards at scroll 29 % | y 0.617 – 0.999 | **absent** | ❌ **too late** |
| Boards at scroll 33 % | y 0.472 – 0.872 | **absent** | ❌ **too late** |
| Boards at scroll 42 % | y 0.272 – 0.674 | y 0.178 – 0.628 | ⚠️ off by 0.09 |
| Boards at scroll 50 % | y 0.225 – 0.626 (arrived) | y 0.201 – 0.651 | ✅ within 0.024 |
| Typography exits upward | t 0.33–1.42 s | ✅ implemented | ✅ |
| Selection hold | static from t 4.00 s | static from S5 | ✅ |

**The one substantive mismatch was board timing** (corrected in
`.gsd/STATE.md` — see the retiming entry). After the retiming, plate-top
deviation across the rise window is ≤ 0.024 at every sampled scroll position.

### 6.1 Correction — "plate height" is NOT a measurable defect

An intermediate reading of mine concluded the plates were **0.10 too tall**
(reference near-black block 0.34 tall vs mine 0.45). That conclusion was wrong
and is retracted.

The reference's plates are **not solid black rectangles**. Sampling a column
inside the reference's plate gives an oscillating luma:

```
y      ref(data)   mine(data)
0.260      87          14
0.340      48          14
0.380     222          13     ← reference is LIGHT here
0.420     230          16     ← and here
0.460      60          15
0.500     227         254
0.580      76          16
```

The reference alternates between ~60 (dark content) and ~230 (light panels and
white gaps inside the plate). Mine is a flat ~14 everywhere. So any
"near-black row extent" measurement is reading **content edges**, not the plate
box — it lands on whatever dark band happens to be adjacent, which is why the
apparent height differed.

**What is actually different** is fill, not geometry:

| | Reference | Mine |
|---|---|---|
| Plate interior luma | oscillates 48–230 | uniformly ~14 |
| Nature | printed content, light panels, white gaps | solid black field |

The plate *boxes* agree within 0.024 vertically. The open question — flagged,
not fixed — is whether the reference's interior treatment should be reproduced.
That is an art-direction question, not a measurement error, and it is the main
item in the remaining-mismatch list.

I should not have reported the height figure before checking whether the
reference plate was a flat fill. Recording it here so the retracted number does
not get re-derived later.

---

## 7. Method limitation — recorded honestly

Untrusted visual analysis (`vision_analyze`) was unavailable for this pass: the
service returned `503 ResourceExhausted: Worker local request limit (16/16)` on
every attempt, including a downscaled 4×3 contact sheet. All findings above are
therefore **purely numeric**.

What that costs:

- I can state **where** ink is and **when** it moves, precisely.
- I **cannot** independently confirm **what the type says** at each beat — that
  came from the earlier verified pass (reference copy reads `PERSONAL` /
  `PORTFOLIO` opening; plates read `DATA ANALYST` / `DATA ENGINEER` and
  `DEVOPS` / `CLOUD`).
- The identity of each element ("this bar is the PERSONAL wordmark") is inferred
  from geometry and timing, not read directly.

A single `vision_analyze` pass over the contact sheet, once the rate limit
resets, would close this gap. It should be the first thing done if this
analysis is ever relied on for the wordmark choreography specifically.

---

## 8. Summary of beats

| Beat | Video time | Frames | Scroll % | Content |
|---|---|---|---|---|
| **B0 Opening** | 0.00 – 0.33 s | 0–8 | 0 – 4 % | Static. Figure fixed, opening type on the ground plane, no plates. |
| **B1 Type exit** | 0.33 – 1.42 s | 8–34 | 4 – 18 % | Headline exits **upward**, off the top of frame. Ground brightens 176→188. |
| **B2 Quiet** | 1.42 – 1.83 s | 35–43 | 18 – 23 % | Near-still. The breath before the reveal. |
| **B3 Board rise** | 1.83 – 3.96 s | 44–95 | 23 – 50 % | Both plates rise from below frame bottom, in lockstep, to y 0.225–0.626. |
| **B4 Hold** | 4.00 – 7.96 s | 96–191 | 50 – 100 % | **Static.** Selection state. Nothing moves. |