# DATA WORLD — BLACK RECTANGLE + RE-ENTRY REGRESSION ROOT CAUSE

**Branch:** `restore/data-world-386991f` · **HEAD:** `c7184c859d5da67a77ded67a9178faea5e1e290d`

## Issue A — opaque dark rectangles over the Surface skyline

**Source:** `src/game/scenes/WorldScene.ts`, `buildTerrain()`, the `for (const p of world.platforms)` loop (~line 787).

Each configured ledge is created as a `Rectangle` filled with `colour(world.palette.ground)` = `#141c30` (`worldConfig.ts:806`), added to `this.platforms` as a static physics body. The Stage S guard `if (!isCliff)` wrapped only the 2px rim rectangle — the main ledge fill was **always** drawn, at depth 0 (behind artwork, in front of the video background). On cliff there are six ledges (`CLIFF_PLATFORMS`), producing the six floating dark bars measured at world (368,478), (560,408), (740,348), (530,438), (660,368), (808,298), each 80–120×16 world px → 160–240×32 screen px at zoom 2.

**Fix:** on cliff, `rect.setVisible(false)` after the physics body is attached. Arcade static bodies collide regardless of visibility, so the six ledge collision bodies are fully preserved; only the fill is hidden. Non-cliff chapters keep the rect + rim.

## Issue B — legacy pipe visuals reappear after chapter re-entry

**Source:** `src/game/scenes/WorldScene.ts`, `onArrive` callback of the pipe transport (~line 1432):

```ts
for (const [id, built] of this.pipeSkins) {
  built.mouth.setVisible(chapterPipeIds.has(id));
}
```

`buildPipes()` hides `cliff-entry` / `cliff-to-skills` mouths once during `create()`. But every chapter arrival runs `onArrive`, which sets `mouth.visible = true` for **all** pipes of the current chapter — including the two cliff pipes. Measured live: after Surface→Skills→Surface, the containers at (60,560) and (750,560) flipped from hidden to `visible=true` ~3.2s after the probe reported `chapter=cliff` (i.e., right when the transport settle finished).

The scene swap itself is **not** leaky: `buildDestination` does `scene.stop()` → `setConfig()` → `scene.start()`; top-level children return to exactly 17 on cliff and no GameObjects accumulate across repeated transitions. Mid-travel screenshots show the outgoing chapter until the restart lands (~2s), which is the intentional opaque travel overlay (depth 901, `#04060a`).

**Fix:** in the `onArrive` loop, keep cliff artwork-hidden pipes hidden:

```ts
const hiddenBySurfaceArtwork =
  world.chapter === 'cliff' && (id === 'cliff-entry' || id === 'cliff-to-skills');
built.mouth.setVisible(chapterPipeIds.has(id) && !hiddenBySurfaceArtwork);
```

Triggers/hover/transport are untouched — only `mouth.visible` is affected. Skills/Projects are untouched (the guard is cliff-specific).

## Chapter label

Not affected: the procedural label is only created when `world.chapter !== 'cliff'` (buildStations ~line 1118), and the scene is rebuilt per chapter, so it cannot reappear on cliff.
