# Questions Requiring Human Decision — Phase 1 Cinematic Rebuild

Raised 2026-10-01 during Phase 1 discovery. No implementation started.
Full plan: `.gsd/plans/phase-1-cinematic-rebuild.md`

---

## Q1–Q5 — ANSWERED 2026-10-01 (locked as D1–D5)

| # | Question | Decision |
|---|---|---|
| Q1 | Reference video not new evidence | **D1** — the 8 s clip is the authoritative reference; sequences/videos/images are secondary visual asset references only and must not override it; motion recreated in code, video not embedded |
| Q2 | Where typography lives | **D2** — hybrid: preserve/reuse existing figure artwork, recreate all typography as live DOM/SVG |
| Q3 | Blank-white tail | **D3** — not meaningful cinematic content; use meaningful sequence content then transition to the coded scene |
| Q4 | Figure moves in sequence tails | **D5** — hold the figure fixed; discard that exit |
| Q5 | Monochrome vs accents | **D4** — monochrome by default; restrained light-blue (Data) / light-orange (Cloud) atmospheric glow on hover only; returns to monochrome on unhover; accent may intensify during the transition |

---

## Q6 — OPEN (blocks Task 8 only)

### Approve the world handoff?

The authoritative reference video **ends at the selection hold** — t = 4.0 s to 8.0 s is static
(< 1.5 % frame diff), and the last frame is still the two-board selection, not a world entry.
There is no evidence for post-selection motion.

Proposed (§19) — my invention, not derived from the reference:

1. `selectedPath` set, scroll killed and locked
2. Non-selected plate desaturates, drops back 8 px (240 ms)
3. Selected plate expands as camera pushes in — ground scale `1.00 → 1.12`;
   selected accent glow rises toward 0.30 alpha
4. World word resolves large and centred
5. Hold ~400 ms
6. Cross-fade to the world mount; `currentWorld` + hash set

Total 1.6–2.0 s, skippable by key or click, `Escape`-revertible to the selection hold.

**Approve as-is, or supply a reference for post-selection motion?**

---

## Resolved from evidence — not asked

- **Figure stability** — measured x centroid 0.491–0.492 across all 8 s. Plan holds it fixed.
- **Black-frame offsets** — measured **8 frames on both sides** (t 0.375 s / 0.360 s), not the
  current hardcoded left 8 / right 2. Not structurally significant.
- **Board hit regions** — measured from the reference: Data x 0.066–0.342, Cloud x 0.634–0.935.
  The current config (`0.15–0.45` / `0.55–0.85`) is wrong on both.
- **Board asymmetry** — the left board is taller (two lines) and sits higher than the right.
  Symmetric card layout would be a generic-UI regression.
- **Legacy percentages** (`0–23 / 23–31 / 31–72 / 72–86 / 86–100`) — replaced with beats derived
  from video measurement.
- **`cinematic-beats.json` figure-divergence claim** (t 3.0–3.46 s) — unsupported by the video;
  dropped.
