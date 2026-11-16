# DATA WORLD SURFACE — FRESH DESIGN PLAN

**Branch:** `restore/data-world-386991f`  
**HEAD:** `c7184c859d5da67a77ded67a9178faea5e1e290d`  
**Date:** 2026-11-16  
**Status:** PROPOSAL — Awaiting explicit approval before any implementation.

---

## 1. Design Goals

1. **Match reference composition:** Entry left, continuous platform middle, portal right — coherent game environment, not three oversized images pasted over background.
2. **Preserve artwork appearance:** No stretching, no regeneration — use supplied PNGs at their natural visible proportions.
3. **Background visibility:** Video background (React layer) must be clearly visible above the artwork.
4. **Robot unobstructed:** Player sprite (depth 10) readable against artwork (depth 2–3).
5. **No duplicate labels/graphics:** Hide procedural ledge visuals, chapter label, pipe skins on cliff.
6. **Gameplay contracts intact:** All physics bodies, pipe triggers, interaction zones, camera behavior, test IDs unchanged.
7. **Responsive:** Works at 1440×900, 1280×800, 768×1024, 390×844.

---

## 2. Sizing Method: Proportional-to-Platform

**Principle:** The platform is the continuous environment — it spans the full chapter width (900 px) at a scale that makes its source width (1266) fit:  
`platformScale = 900 / 1266 = 0.711` (unchanged).

The reference shows entry and portal at **~natural scale (1.0×)** while the platform is **~1.3× natural width**. Therefore entry and portal should be scaled by the **ratio of their reference width to the reference platform width**:

```
refPlatformWidth = 1652 px (x 25–1676 in reference)
refEntryWidth    = 425 px  (x 30–455)
refPortalWidth   = 423 px  (x 1719–2141)

entryScale  = platformScale × (refEntryWidth  / refPlatformWidth)
           = 0.711 × (425 / 1652) = 0.711 × 0.2572 = 0.1829

portalScale = platformScale × (refPortalWidth / refPlatformWidth)
           = 0.711 × (423 / 1652) = 0.711 × 0.2560 = 0.1820
```

**But wait** — the reference platform width (1652) includes the entry standing on it. A cleaner derivation: the reference composes the three assets at their **natural pixel sizes** (entry 417 vis, platform 1235 vis, portal 423 vis) into a 2172-wide strip. The platform *in the reference* is not stretched — it's the entry and portal that are placed at natural size on a platform that extends further left/right.

**Better method:** Size entry and portal to their **natural visible dimensions**, then place them on the platform. The platform artwork is scaled to full world width (0.711). The entry/portal should be scaled so their **visible heights match the reference's vertical proportions relative to the platform's walkable line**.

From reference:
- Platform walkable line at y≈565 (ref coords), bottom at 680 → platform visible height above walk = 115 px.
- Entry visible height 510, base at y≈635 → entry extends 510-70=440 px above walk.
- Portal visible height 385, base at y≈639 → portal extends 385-41=344 px above walk.

In-game at platformScale=0.711:
- Platform display height = 438.8, walkable at groundY=560, art top at y=209.
- Walkable-to-art-top = 560 - 209 = 351 px.

Target entry height above walk = 440/115 × 351 = 1342 px? No — the reference platform has much less visible height above walk (115px) than our scaled platform (351px). The reference platform is *shorter* vertically in the composition.

**Simpler, defensible approach:** Match the **reference's on-strip proportions** by mapping the 2172-wide reference strip onto the 900-wide chapter:

```
stripToWorldScale = 900 / 2172 = 0.4144
```

| Element | Ref width (px) | World width (px) | World height (px) | Scale vs asset |
|---------|----------------|------------------|-------------------|----------------|
| Entry   | 425            | 176              | 211               | 0.411 (vis 417→172) |
| Platform| 1652           | 684              | 232*              | — |
| Portal  | 423            | 175              | 160               | 0.413 (vis 423→175) |

*Platform would only span 684 of 900 — leaves gaps. Not acceptable: platform must be continuous.

**Final chosen method:** **Platform full-width (scale 0.711). Entry & portal scaled to preserve their reference size *relative to the platform's displayed width*.**

Reference platform displayed width = 1652. Our platform displayed width = 900.  
Ratio = 900 / 1652 = **0.5448**.

```
entryDisplayWidth  = 425 × 0.5448 = 231.5 → scale = 231.5 / 428 = 0.541
portalDisplayWidth = 423 × 0.5448 = 230.4 → scale = 230.4 / 427 = 0.539
```

Heights (preserving asset aspect):
- Entry: 589 × 0.541 = 318.6 (visible 517 × 0.541 = 279.7)
- Portal: 621 × 0.539 = 334.7 (visible 385 × 0.539 = 207.5)

**This is the primary proposal.** It keeps the platform continuous, matches reference horizontal proportions, and keeps entry/portal heights well within the 450px view height (279 and 208 px above walkable).

---

## 3. Proposed Layout Table

| Element | Proposed World Position | Proposed Dimensions (W×H) | Anchor | Ground Alignment | Depth |
|---------|------------------------|---------------------------|--------|------------------|-------|
| **Platform** | x=0 (left) → x=900 (right) | 900 × 438.8 | origin(0.5,1) at (450, platformBottomY) | Walkable surface at **groundY=560** (platformBottomY = 560 + 88.2 = 648.2) | 2 |
| **Entry** | x=10 → x=241.5 | 231.5 × 318.6 | origin(0,1) at (10, groundY) | Base at **groundY=560** (artwork feet on walkable) | 3 |
| **Portal** | x=634.5 → x=864.9 | 230.4 × 334.7 | origin(0,1) at (634.5, groundY) | Base at **groundY=560** (centered on exitPipe x=750) | 3 |

**Derivation details:**

- **Platform:** Unchanged from current — scale 0.711, full width, bottom at `groundY + walkableToBottom` where `walkableToBottom = 124 × 0.711 = 88.2` → platformBottomY = 648.2. Walkable line in asset at y≈493 (617-124), matches groundY at this scale.

- **Entry:** Reference left edge at x=25 → world x = 25 × (900/1652) = 13.6. Use **x=10** for small margin. Width 231.5 (scale 0.541). Bottom at groundY (feet on platform). Top at 560 - 318.6 = 241.4. At spawn camera (scrollY≈155, view 155–605): entry top 241 → screen y = (241-155)×2 = 172px (19% from top) — **fully visible, not clipped**.

- **Portal:** Centered on exitPipe x=750. Width 230.4 → leftX = 750 - 115.2 = **634.8**. Bottom at groundY. Top at 560 - 334.7 = 225.3. At spawn view: portal top 225 → screen y = (225-155)×2 = 140px (15% from top) — **fully visible**. Portal right edge at 865 < world width 900 ✓.

- **Horizontal coverage:** Entry 0–231, gap 231–635 (404 px open platform), portal 635–865, gap 865–900 (35 px). Background video visible above y≈225 (60% of view height).

---

## 4. Vertical Alignment Details

| Asset | Source visible floor (y from top) | Source height | Floor % from top | In-game floor at groundY | Art top (world y) |
|-------|-----------------------------------|---------------|------------------|--------------------------|-------------------|
| Platform | 493 (617-124) | 617 | 79.9% | 560 | 560 - 438.8×(493/617) = 560 - 351 = **209** |
| Entry | 576 (median) | 589 | 97.8% | 560 | 560 - 318.6 = **241** |
| Portal | 611 (median) | 621 | 98.4% | 560 | 560 - 334.7 = **225** |

All three art tops land between 209–241, leaving ~70–100 world px (140–200 screen px) of background video above them at default camera.

---

## 5. Rendering & Interaction Architecture

### 5.1 Visual Layer (Phaser, depths)
| Depth | Content | Notes |
|-------|---------|-------|
| -40 | Sky image (not used on data world) | — |
| -30 to -10 | Parallax layers (far/mid/fg) | Skipped for data world (video bg) |
| 0 | **Video background** (React `BackgroundVideoLayer`, z-index 0) | Shows through transparent canvas |
| 1 | Subfloor physics texture (if visible) | Hidden by platform art |
| 2 | **Platform artwork** | `surface-platform`, full width, origin(0.5,1) |
| 3 | **Entry artwork** | `surface-entry`, x=10, origin(0,1) |
| 3 | **Portal artwork** | `surface-skills-portal`, x=635, origin(0,1) |
| 4 | Pipe skins (cliff: **hidden**) | Set `container.setVisible(false)` for both cliff pipes |
| 5 | Chapter label (cliff: **hidden**) | Skip `chapterLabelTexture` draw on cliff |
| 5 | Gem probe (foundation-probe) | Keep — gameplay |
| 6 | Station sprites | Skills/projects chapters only (cliff has none) |
| 9 | Player glow (additive) | — |
| 10 | **Player robot sprite** | Bottom-anchored, 56×62 frame |
| 900+ | Travel overlay / blackout | During pipe transport only |

### 5.2 Gameplay Layer (Physics & Triggers) — **UNCHANGED**
| Component | Status | Notes |
|-----------|--------|-------|
| Ground collision body | Keep | `surface-subfloor-56` texture, depth 0 image, physics body |
| 6 ledge physics bodies | Keep | Exact `CLIFF_PLATFORMS` coordinates — collision only |
| Ledge visual rectangles + rims | **Hide** | Suppress `add.rectangle` calls for cliff in `buildTerrain` L787–806 |
| Entry pipe trigger (`cliff-entry` x=60) | Keep | Physics trigger only; **visual skin hidden** |
| Exit pipe trigger (`cliff-to-skills` x=750) | Keep | Physics trigger only; **visual skin hidden** |
| Pipe hover (proximityActive) | Keep | Driven by `createDataPipeSkin` — works with invisible container |
| Gem probe at x=480 | Keep | `buildInteractionProbe` — interaction trigger |
| Chapter transition (12-phase) | Keep | `PipeTransport` unchanged |
| Interaction bus events | Keep | `proximity`, `activate`, `close`, `chapter` |

### 5.3 UI Layer (React) — **UNCHANGED**
| Element | Test ID | Notes |
|---------|---------|-------|
| Video background | — | `BackgroundVideoLayer` for cliff: `/assets/backgrounds/surface/bg.mp4` |
| Canvas container | `world-canvas` | `.world-canvas` full-screen (100vw/100dvh) |
| Exit button | `world-exit` | Top-left, “RETURN TO PORTFOLIO” |
| Contents drawer toggle | `world-index-toggle` | Top-right, opens station index |
| Entry plate (dismissible) | `world-entry` | Shown on first arrival, dismissed by Enter/Esc/click |
| Info panel | `.info-panel` | Opens on station activate |
| Station index drawer | `world-index-drawer` | Lists all skills/projects as buttons |
| Chapter live region | `world-chapter` | Announces chapter changes |
| Nearby station live region | `world-nearby` | Mirrors canvas proximity |
| Status live region | `world-status` | “World loaded and playable.” |
| Interaction live region | `world-interaction` | “Interaction: …” or “No interactions yet.” |

---

## 6. Legacy Visuals to Hide (Cliff Chapter Only)

| Visual | File/Function | Action |
|--------|---------------|--------|
| 6 ledge fill rectangles + magenta rims | `buildTerrain` L787–806 | Wrap in `if (!isCliff)` — keep physics bodies |
| Chapter label “DATA WORLD” | `buildStations` L1114–1118 | Skip on `isCliff` |
| Entry pipe skin (mouth + START plate + ORIGIN sign) | `createDataPipeSkin` (pipe `cliff-entry`) | `container.setVisible(false)` after build |
| Exit pipe skin (portal + NEXT: SKILLS plate + JUMP TO START sign) | `createDataPipeSkin` (pipe `cliff-to-skills`) | `container.setVisible(false)` after build |
| Magenta ground rim (2px at groundY+1) | `buildTerrain` L779–782 | Already covered by platform art — optional hide |

**Do NOT remove:** physics bodies, pipe triggers, gem probe, transport logic, camera, player, interaction bus, UI shell.

---

## 7. Gameplay Contracts to Preserve (Explicit Checklist)

- [ ] Robot sprite (56×62 frames), animation, hitbox (10×14), spawn at (120, 560) grounded
- [ ] Ground collision (subfloor depth 56, full width)
- [ ] 6 cliff ledge physics bodies at exact `CLIFF_PLATFORMS` coordinates
- [ ] Platform boundary contracts (world bounds 0–900, camera clamps)
- [ ] Chapter transition system (12 phases, `PipeTransport`)
- [ ] Portal walk-in: `armedPipeId` + Enter → `cliff-to-skills`
- [ ] Portal hover: `proximityActive` → lit texture swap
- [ ] Interaction bus: `proximity`, `activate`, `close`, `chapter` events
- [ ] InfoPanel React component, open/close via Enter/Escape
- [ ] Camera: zoom 2 (int), verticalBiasRatio 0.40, floorMargin 10, frame-rate-corrected lerp, look-ahead
- [ ] `__worldProbe` diagnostics object (all Phase 1 + Phase 2 fields)
- [ ] `__worldScene` diagnostic handle
- [ ] Shell exit button (`world-exit`), contents toggle (`world-index-toggle`)
- [ ] Chapter config: `DATA_WORLD` (cliff 900, skills 1500, projects 1000)
- [ ] Pipe trigger range 30, pipe travel 1100ms
- [ ] Spawn at (120, groundY), interaction probe at x=480
- [ ] Reduced-motion: camera snaps, conduit shown but static, tube enter/exit frames play
- [ ] All test IDs in `WorldShell.tsx` and `WorldScene.ts` diagnostics

**No gameplay change is required to make the artwork fit.** The proposed layout works within existing world width, groundY, camera, and pipe positions.

---

## 8. Responsive Behavior

| Viewport | Zoom (zoomForViewport) | View W×H (world) | Entry top visible? | Portal top visible? | Background above art |
|----------|------------------------|------------------|--------------------|---------------------|---------------------|
| 1440×900 | 2.0 | 720×450 | Yes (y=172px) | Yes (y=140px) | ~140–200px |
| 1280×800 | 2.0 | 640×400 | Yes | Yes | ~100–160px |
| 768×1024 | 2.0 | 384×512 | Yes (more headroom) | Yes | ~200–300px |
| 390×844 | 1.5* | 260×563 | Yes | Yes | Ample |

*At 390×844: canvas height 844, CONTENT_BAND=264 → maxByHeight=3.2 → zoom=min(2,3.2)=2 → but pixelArt quantizes to 1.0, 1.25, 1.5, 1.75, 2.0 → 2.0 fits (563 > 264). Actually 844/264=3.2 → zoom=2.0. View 195×422. Still fine.

**Horizontal overflow:** `.world-canvas` uses `overflow:hidden`, `inset:0`, `width:100vw`, `height:100dvh` — no horizontal scroll at any size (verified by `accept-responsive.mjs`).

---

## 9. Implementation File Targets (for Approval)

| File | Changes |
|------|---------|
| `src/game/scenes/WorldScene.ts` | `buildSurfaceArtwork`: new scales, positions, anchors; `buildTerrain`: suppress ledge visuals on cliff; `buildStations`: suppress chapter label on cliff; `buildPipes`/`createDataPipeSkin` hook: hide cliff pipe containers after build |
| `src/game/scenes/dataPipeSkin.ts` | Export a way to hide cliff pipe containers (or do it in `WorldScene` after `buildPipes`) |
| *No changes to* | `worldConfig.ts`, `worldObjects.ts`, `engine.ts`, `WorldShell.tsx`, `WorldShell.css`, `BackgroundVideoLayer.tsx`, any QA tests |

---

## 10. Decisions Requiring Approval

1. **Proportional scaling method** (Section 2) — primary proposal uses platform-relative ratio 0.5448; alternative: map reference strip 1:1 to world (scale 0.414) but platform would not span full width.
2. **Entry x-position** — proposed x=10 (from ref x=25 × 0.5448 = 13.6). Accept x=10 or x=0?
3. **Portal center** — proposed centered on exitPipe x=750 (gameplay anchor). Accept?
4. **Hide vs remove** — procedural visuals hidden (not deleted) so physics/interaction intact. Accept?
5. **Gem probe visibility** — keep at x=480 depth 5 (gameplay). Accept?
6. **Vertical alignment** — anchor all three bases at groundY (walkable). Accept?

---

*End of Design Plan. No implementation performed. Awaiting explicit approval.*