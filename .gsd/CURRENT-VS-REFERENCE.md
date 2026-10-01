# Current Implementation vs Reference

**Measured**: 2026-10-01
**Method**: the current build was screenshotted at 12 scroll fractions at
1280×720 (`qa/capture-matched.mjs` → `qa-screenshots/myshot-*.png`) and measured
with the *identical* metrics used on the video's 192 frames. No eyeballing, no
relying on the attached screenshot's appearance.

---

## 1. What already matches

### The central figure — excellent

| Scroll | Video figure extent | My figure extent | Δ |
|---|---|---|---|
| 8.3 % | y 0.1403 – 0.9986 | y 0.1333 – 0.9986 | −0.007 |
| 33.3 % | y 0.1403 – 0.9986 | y 0.1333 – 0.9986 | −0.007 |
| 95.0 % | y 0.1403 – 0.9986 | y 0.1333 – 0.9986 | −0.007 |

**Within 0.007 at every scroll position, and constant throughout** — the figure
does not drift, scale, or slide. The hard requirement is fully met. (The 0.0 %
row shows a 0.13 delta only because the video's opening has type overlapping the
figure band; from 8.3 % onward they agree.)

### Final composition

| Metric | Video | Mine | Δ |
|---|---|---|---|
| Plate y-extent | 0.225 – 0.626 | 0.201 – 0.651 | +0.024 / +0.025 |
| Plate horizontal | x 0.033 – 0.963 | x 0.033 – 0.963 | 0 |
| Monochrome | yes | yes | ✓ |

### Structure and behaviour

- Boards are **absent at scroll 0 %** in both. ✓
- Selection is a **static hold** in both. ✓
- Scroll genuinely drives the cinematic. ✓
- Data → light-blue, Cloud → light-orange on hover; monochrome at rest. ✓
- Keyboard, reduced motion, touch two-tap. ✓
- No `PathSelection` page, no generic cards, no autoplay. ✓

---

## 2. What is wrong

### ⚠️ MISMATCH 1 — Board entrance is ~40 % too late (the significant one)

This is the largest real gap and it is structural, not cosmetic.

| Scroll | Video plate position | My plate position |
|---|---|---|
| 20.8 % | y 0.000 – 0.999 (entering frame bottom) | y 0.064 – 0.181 (still up top) |
| 25.0 % | y 0.778 – 0.999 | y 0.000 – 0.081 |
| 29.0 % | y 0.617 – 0.999 | **absent** |
| 33.3 % | y 0.472 – 0.872 | **absent** |
| 41.7 % | y 0.272 – 0.674 | y 0.178 – 0.628 |
| 50.0 % | y 0.225 – 0.626 (arrived) | y 0.199 – 0.647 |

**The video's boards are visible from scroll ~21 % and fully seated by 41.7 %.
Mine do not begin until ~35 % and are still settling at 50 %.**

The cause is a phase-mapping error in `beats.ts`. My beat boundaries were derived
from the *old* frame-sequence timing, and the board beat was mapped to
`0.210–0.390` with a stagger, then the final lock at `0.390–0.500`. But the
boards must:

- **start** at 0.23 (video: first motion at frame 44 = 22.9 %)
- **finish** at 0.50 (video: fully seated at frame 96 = 50 %)
- run as a **lockstep rise from below the frame bottom**, not a staggered
  fade-in from above

Additionally, the video's rise is **clipped by the frame bottom** — the plates
travel *through* the bottom edge, so at 25 % they still occupy the lower third
rather than appearing near the top. Mine materialise in the upper region.

### ⚠️ MISMATCH 2 — Motion curve shape

The video's board rise is close to linear with a gentle ease at the end (y
travel: 0.86 → 0.78 → 0.70 → 0.62 → 0.54 → 0.47 → 0.35 → 0.27 → 0.23 — even
~0.08 steps, decelerating only in the last third).

Mine uses `easeOutBack` (overshoot) on a translate, which front-loads the motion
and then rebounds. The reference never overshoots.

### ⚠️ MISMATCH 3 — Opening mean luma is too bright

| | Video | Mine |
|---|---|---|
| Scroll 0 % | 175.7 | 197.5 |
| Scroll 8.3 % | 177.0 | 190.2 |

My opening is **22 luma brighter** than the reference. The reference opening
already carries substantial dark type (top-band ink 0.0172 vs my 0.0682, but
overall darker). My `GroundLayer` white field is too clean; the reference opening
has more ink on screen. Related: my top-band ink (0.068–0.158) is far higher
than the video's at comparable points, meaning **my typography is present for
much longer** than the reference's, which exits upward by t 1.42 s.

### ⚠️ MISMATCH 4 — Typography exit timing

Video: top-band ink goes `0.0172 (t0) → 0.0000 (t0.5) → 0.18 (t1.0) → 0.0000
(t1.67)`. The opening type is **gone by t 0.5 s** and the mid-transition marks are
a separate element.

Mine: top-band ink stays at 0.15+ continuously from 4 % to 21 %, i.e. the
headline lingers through the first fifth of the scroll. The reference has already
cleared it by then.

---

## 3. What is incorrectly static

- The **opening type** should exit upward by scroll ~18 %. Mine holds it far longer.
- The **ground brightness curve** should dip then recover (video: 176 → 188 at
  t 1.5 s, back to 177, then down to 147 as boards land). Mine is flatter.

## 4. What must be animated

1. **Boards**: remap to start at 0.23, finish at 0.50, rise from below the frame
   bottom, lockstep, near-linear with a soft ease-out.
2. **Opening typography**: exit upward and clear the frame by scroll ~0.18.
3. **Ground brightness**: follow the video's luma curve rather than a fixed field.

## 5. What should remain unchanged

- The figure: absolutely still (D5). Currently correct — do not touch.
- The final composition geometry (plate rects, type scale).
- The hover accents, selection interaction, handoff, accessibility, reduced motion.
- The whole code-driven architecture (no frames, no video).

---

## 6. Verdict

The rebuild is **structurally correct and behaviourally complete** — every
functional requirement passes, and the figure is nailed to within 0.007.

But the **timing of the board reveal is measurably wrong**: boards arrive about
40 % too late and enter from the wrong edge (top, faded) instead of rising from
below the frame bottom. That is the single largest visual mismatch and it is
exactly the kind of thing the reference video exists to prevent.

Root cause: `beats.ts` carries phase boundaries inherited from the old
frame-sequence project rather than from this video's actual motion. Fixing the
beat mapping and the board rise curve is the next task.

Nothing above contradicts a decision the user has locked. D1 already names this
video as the motion authority; the beats simply do not yet match it.