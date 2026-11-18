# NEON DISTRICT — Visual Design Specification (Phase A)

Baseline: commit `c7184c8` on `restore/data-world-386991f` (robot integration, pushed).
Checkpoint tag: `checkpoint/neon-district-pre`. No commits/pushes without permission.

## Reference images
- `image_5c00bd.png`, `image_ab90de.png` (analyzed): night megacity; deep navy/near-black base, electric cyan + violet neon, magenta/pink accents, warm orange accents, heavy rain + fog, dense layered skyscrapers, Japanese-inspired silhouettes, holo advertisements, flying traffic, illuminated windows. Moody, high-contrast, atmospheric depth (foreground street → midground towers → foggy far skyline).
- `image_cb7961.png`: vision service errored twice on this file (connection/timeout); not analyzed. Design relies on the two analyzed refs + the written spec.

## World identity
- Name: **NEON DISTRICT**. Route `#/data-world` unchanged; UI labels may gain the subtitle, but Back/Contents/Exit controls stay.

## Palette (authoritative hex targets)
| Role | Hex |
|---|---|
| Sky top / clear | `#04060e` |
| Sky bottom haze | `#0b1226` |
| Far skyline silhouette | `#0d1526` |
| Midground buildings | `#131c33` / `#182238` |
| Foreground structures | `#1d2a47` |
| Ground/rooftop slab | `#141c30` |
| Ground top neon rim | `#22d3ee` |
| Neon cyan | `#22d3ee` / `#00e5ff` |
| Neon violet | `#8b5cf6` / `#a855f7` |
| Neon magenta/pink | `#ec4899` |
| Warm windows | `#fbbf24` |
| Warm orange accent (robot echo) | `#f97316` |
| Rain | `rgba(160,200,255,0.25)` streaks |
| Fog | `rgba(120,140,200,0.06–0.10)` drifting bands |

## Layer stack (back → front), all horizontal parallax only (`setScrollFactor(f, 1)` — vertical parallax is forbidden, it breaks the fixed ground line)
1. **Sky** (scroll 0, screen-fixed gradient + stars + moon/glow) — tileSprite scrollFactor(0,1).
2. **Far skyline** (scroll 0.12) — dark towers, sparse tiny lit windows, haze band at base.
3. **Mid skyline** (scroll 0.25) — taller silhouettes with neon edge-lights, occasional antenna + beacon blink.
4. **Midground buildings** (scroll 0.45) — the current `drawMidground` role; windows grid with random lit windows, holo-ad billboards, neon signs.
5. **Foreground rooftop/street** (scroll 0.7) — near edge: railing, cables, pipes, steam vents. This is where the ground slab lives (groundY=560 unchanged).
6. **Ground slab + sub-floor** (scroll 1) — rooftop deck with cyan edge rim; below it, street-level glow + neon reflections (pre-rendered streaks), not a flat fill.
7. **Weather/FX** — rain (2 depths), fog bands drifting, flying vehicles on layer 2/3, steam particles at vents, neon flicker on signs, holo pulse. All scroll with their layer.
8. **Gameplay layer** — platforms, stations (neon terminals / holo pillars), transit pipes, robot player, chapter plate. Depths unchanged from current scene (stations ~6, pipes 4, player 10/2 during climb).

## Animated elements (seamless loops, no visible restarts)
- Rain: 2 tileSprites with diagonal streak textures, `tilePositionY/X` advanced per-frame by dt; two depths/speeds; alpha low.
- Fog: 2–3 wide translucent gradient tileSprites, slow `tilePositionX` drift, wrap by texture repeat.
- Traffic: 3–5 small vehicle sprites on far/mid layers, constant vx, wrap at layer bounds, tiny headlight glow.
- Windows: pre-rendered building textures with a window grid; a timer flips a few windows (redraw small canvas region or overlay tiny sprites). Cheapest: 2–3 pre-rendered variants per building, swap on a slow timer.
- Holo ads: sign sprites with alpha pulse (sin) + occasional frame swap (2 variants).
- Neon flicker: per-sign timer; mostly steady, brief dips — controlled, not random strobing.
- Steam: small particle emitters at 2–3 vent points on the foreground layer, low rate.
- Reflections: static pre-rendered vertical streaks under neon signs on the wet ground (baked into ground texture per chapter width) — no runtime cost.

## District mapping (geometry unchanged)
- **District 01 — Arrival Zone** (`cliff`, width 900): rooftop landing platform. Big skyline behind, entry pipe = "ORIGIN" beacon, exit pipe to Skills = neon transit gate at x=750.
- **District 02 — Technology District** (`skills`, width 1500): 6 skill stations (SQL/T-SQL, Python/pandas, Excel, Power BI, Tableau, Streamlit) as holo terminal pillars; entry pipe x=60, exit pipe x=1350.
- **District 03 — Project District** (`projects`, width 1000): 4 projects as visually distinct structures — server racks (SQL Data Warehouse & ETL), trading terminal (PRIMETradeAI), dashboard monolith (Data Analytics Dashboards), analysis tower (Nifty-100). Entry pipe x=60, no exit. NOTE: the task text names "RxVerify / DevOps Masterclass / Go Microservices" — those are NOT the data world's projects; the actual data-world projects above are preserved per "preserve existing portfolio content".

## Robot integration
- Keep all 36 `player-robot-*` frames and animations. Add: soft additive cyan glow disc behind player (depth 9) + dark ellipse shadow at feet (depth 1, follows x, squashes on jump). No sprite replacement.

## Transport
- Pipes re-skinned as **neon transit gates** (violet/cyan tube + glow ring + "gate" signage), keeping `dataPipeSkin` container layout, mouth anchor, depth 4, and all 12 `pipeTransport` phases. The blackout becomes a violet flash + scanline band (reuse `travelOverlay`/`travelBand`, recolor).

## Fullscreen/responsive (must not regress)
- `.placeholder-world` absolute inset 0, 100vw × 100dvh; `game-world-active` locks scroll on html+body; camera zoom = min(2, h/CONTENT_BAND) quantized 0.25; verticalBiasRatio 0.40 (ground at 90%); viewports 1440×900, 1280×800, 768×1024, 390×844. Parallax layers are tileSprites sized to world width — they already scale; new layers must follow the same pattern (texture sized to `world.width`, height ≤ groundY).

## Performance rules
- All static art pre-rendered once to canvas textures (per chapter width). No per-frame canvas draws except tiny window flips.
- Rain/fog = tilePosition offsets (GPU-cheap). Vehicles/steam = ≤8 sprites/emitters total.
- Pause all ambient animation on `document.visibilitychange` and under `prefers-reduced-motion` (rain/flicker/traffic off; static scene remains).
- No full-screen shaders; glow via pre-rendered radial-gradient sprites with additive blend, few on screen.
- Textures: keep each layer texture ≤ world width × groundY; reuse across chapters where possible.
