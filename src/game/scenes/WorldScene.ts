/**
 * The shared WorldScene — one engine, configuration-driven worlds.
 *
 * Phaser 4 API notes that shaped this file (verified against 4.2.1 at runtime,
 * not assumed):
 *
 *   - The Arcade sprite helpers are GONE. `sprite.setVelocityX`,
 *     `setVelocityY`, `setAccelerationX`, `setBounce*` and
 *     `setCollideWorldBounds` all live on `sprite.body` instead. Calling them on the
 *     sprite throws `... is not a function`.
 *   - `body.onFloor()` / `onCeiling()` / `onWall()` replace the v3 block-body
 *     booleans, which is what makes a grounded jump possible.
 *   - `this.physics.add.staticGroup()` still exists, but it is NOT on the
 *     GameObject factory prototype, so it must be reached via `physics.add`.
 *
 * Everything here is created in `create()` and Phaser tears scene objects down on
 * shutdown, so no manual disposal is needed for game objects. Input listeners are
 * the exception: `createCursorKeys` and `addKey` attach to the shared keyboard
 * plugin, so they are explicitly removed in `shutdown`.
 *
 * PHASE 2 RESPONSIBILITIES
 *
 * Builds the layered Data World environment (far skyline, midground conduits,
 * near floor), places content-driven stations, drives the pipe transport, and
 * mirrors proximity/open/close/chapter state out through the interaction bus.
 *
 * The Phase 1 diagnostics probe keeps its exact shape and gains new fields.
 * `ok`, `x`, `y`, `grounded`, `camScrollX`, `camScrollY`, `canvasCount`,
 * `worldWidth`, `worldHeight`, `velocityX`, `velocityY` and `facingRight` are
 * all still present and unchanged, because the Phase 1 suite asserts on them.
 */

import Phaser from 'phaser';
import {
  INTERACT_RANGE,
  PLAYER,
  PIPE_HALF_WIDTH,
  CAMERA,
  CONTENT_BAND,
  chapterViaPipe,
  chapterWorld,
  pipeNearX,
} from '../config/worldConfig';
import type { ChapterId, ChapterWorld, WorldConfig, WorldPipe, WorldStation } from '../config/worldConfig';
import { drawInteractionGem, drawPlayer } from '../art/pixelArt';
import {
  DATA_PALETTE,
  SUB_FLOOR_DEPTH,
  canvasTexture,
  drawSubFloor,
} from '../art/facilityArt';
import {
  generateAllForChapter,
} from '../art/neonCity';
import { drawSkillStation, drawProjectStation } from '../art/worldObjects';
import { ROBOT_FRAMES, ROBOT_FRAME_WIDTH, ROBOT_FRAME_HEIGHT } from '../assets/robot/manifest';
import { emitInteraction } from './interactionBus';
import { PipeTransport } from './pipeTransport';
import { createDataPipeSkin, chapterLabelTexture } from './dataPipeSkin';
import type { DataPipeSkinResult } from './dataPipeSkin';

/**
 * Convert a CSS hex string from the world config into the numeric colour
 * `add.rectangle` requires.
 *
 * The config deliberately holds readable hex strings rather than packed integers,
 * so palettes stay legible and editable. Phaser 4 types the rectangle colour as
 * `number`, so the conversion happens here, in one place.
 */
const colour = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

/** Scene key. One key serves both worlds; the config decides what is built. */
export const WORLD_SCENE_KEY = 'world';

/** Sprite key prefix for the character frames. */
const PLAYER_TEXTURE_PREFIX = 'player-robot';

/**
 * Deliberate small overlap of foreground object bases into the platform top
 * (world px). Foreground objects are grounded by their OPAQUE bounds at
 * groundY + pad, then shifted down by this amount so the base visibly presses
 * into the floor instead of reading as floating. Portals (depth 3) and
 * stations (depth 6) render in front of the platform tiles (depth 2), so the
 * overlap shows the object on top of the platform, never covered by it.
 */
const GROUND_OVERLAP_PX = 3;

/** Robot strip frames played across the pipe-transport phases (see pipeTransport). */
const TUBE_ENTER_FRAMES = [
  'tubeEnter0', 'tubeEnter1', 'tubeEnter2', 'tubeEnter3',
  'tubeEnter4', 'tubeEnter5', 'tubeEnter6', 'tubeEnter7',
];
const TUBE_EXIT_FRAMES = [
  'tubeExit0', 'tubeExit1', 'tubeExit2', 'tubeExit3', 'tubeExit4', 'tubeExit5',
];
const WALK_FRAMES = ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'walkG', 'walkH'];

export interface WorldSceneConfig {
  /**
   * The whole world, as configuration.
   *
   * The scene resolves ONE chapter out of this in `setConfig` and stores the
   * result in `this.world`. It never holds the multi-chapter config directly, so
   * there is no field through which future-chapter geometry could be reached.
   */
  world: WorldConfig;
  /**
   * The chapter to build. Defaults to the world's entry chapter.
   *
   * Supplied by the engine when it restarts the scene for a new chapter; absent
   * on first mount.
   */
  chapter?: ChapterId;
  /**
   * When true, camera easing, decorative motion and any future effects are
   * skipped. Gameplay itself stays fully enabled.
   */
  reducedMotion: boolean;
}

/** Per-station visual state, so only a changed station is touched each frame. */
interface StationView {
  station: WorldStation;
  /** The lit variant of the station's texture. */
  litKey: string;
  /** The unlit variant. */
  idleKey: string;
  sprite: Phaser.GameObjects.Image;
  /** Whether the station is currently lit. */
  lit: boolean;
  /**
   * True when the station uses a loaded PNG pair (skills Stage K, projects
   * Layer 3) whose transparent bottom pad must be compensated so the sprite's
   * VISIBLE bottom rests on the floor line instead of hovering.
   */
  pngGrounded: boolean;
}

/**
 * Maps project station ids to the extracted hologram folder slug under
 * `public/assets/data-world/core/projects/` (see ASSET_MANIFEST.md there).
 */
const CORE_HOLO_SLUG: Record<string, string> = {
  'nifty100-financial-analysis': 'nifty100',
  'sql-data-warehouse': 'sql-warehouse',
  primetradeai: 'primetradeai',
  'data-analytics-dashboards': 'dashboards',
};

export class WorldScene extends Phaser.Scene {
  /**
   * The ACTIVE chapter, resolved to a complete playable world.
   *
   * Deliberately typed `ChapterWorld`, not `WorldConfig`: every field the scene
   * reads (`width`, `spawn`, `platforms`, `stations`, `pipes`) belongs to the one
   * chapter being played. A chapter that has not been visited was never built, so
   * its geometry cannot be rendered ahead of travel.
   */
  private world!: ChapterWorld;
  /** The multi-chapter config, kept only to resolve the next chapter. */
  private config!: WorldConfig;
  /** The active chapter's display label, drawn once near the spawn. */
  private chapterLabel = '';
  /**
   * The chapter being constructed during the transport's `build` phase.
   *
   * Held only between `build` and `position`, so a diagnostic can tell which
   * chapter a half-finished travel was heading for. Nothing reads it to build
   * geometry -- `buildDestination` does that directly.
   */
  private pendingDestination: ChapterId | null = null;

  /**
   * True while the transport is deliberately restarting the scene to swap
   * chapters.
   *
   * `shutdown()` normally cancels an in-flight transport, which is right when the
   * visitor genuinely leaves the world — it stops the player being left locked and
   * frozen with no scene left to drive them. But a chapter change calls
   * `scene.stop()` from INSIDE the transport's own `build` phase, and that teardown
   * would cancel the very journey that caused it. The travel then died at `build`:
   * the blackout stayed up, the player stayed invisible, and the scene never
   * started again. This flag distinguishes the two cases.
   */
  private swappingChapter = false;

  /**
   * Where the destination's camera must be placed before its first frame.
   *
   * Set during the transport's `build` phase and consumed by the destination's
   * `create()`, which is the only place early enough to guarantee the reveal never
   * shows a frame at the wrong position.
   */
  private cameraTarget: { x: number; y: number } | null = null;

  /**
   * The phases the current (or last) travel entered, in order.
   *
   * Read through the diagnostic handle so the transport tests can assert the
   * real sequence from the running game rather than a re-implementation of it.
   */
  get transportPhases(): readonly string[] {
    return this.transport?.phaseLog ?? [];
  }

  /**
   * The chapter being constructed right now, or null.
   *
   * Non-null only between the transport's `build` and `position` phases. Exposed so
   * a test can prove the destination is constructed DURING the blackout rather than
   * before it.
   */
  get chapterBeingBuilt(): ChapterId | null {
    return this.pendingDestination;
  }

  /** True while the screen is fully black during a transition. */
  get isBlackedOut(): boolean {
    return Boolean(this.travelOverlay?.visible);
  }

  /** True while the player is fully occluded by the pipe. */
  get isPlayerOccluded(): boolean {
    return this.player !== undefined && !this.player.visible;
  }
  private reducedMotion = false;
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keyEscape!: Phaser.Input.Keyboard.Key;
  /** ms timestamp of the last jump press, for the jump buffer. */
  private jumpPressedAt = -Infinity;
  /** ms timestamp when the player last stood on something, for coyote time. */
  private lastGroundedAt = -Infinity;
  /**
   * Real milliseconds since the previous `update`.
   *
   * Movement below is driven from this rather than from velocity alone. Arcade
   * integrates velocity per fixed step, so on a machine that cannot render at 60
   * the simulation falls behind wall-clock time and every px/s figure quietly
   * becomes smaller: a 90px/s walk measured at 64px/s on a software rasteriser.
   * That makes the game a different game on a slow machine, which is why the
   * horizontal position is advanced from elapsed time instead of trusted from the
   * integrator. See `physicsFor` for the full reasoning.
   */
  private lastFrameAt = 0;
  /**
   * Horizontal velocity in px/s, accumulated here from real elapsed time.
   *
   * This is the game's actual horizontal speed, and it is what both the position
   * update and the probe read. It is deliberately NOT Arcade's
   * `body.velocity.x`: that value is integrated per fixed step and therefore
   * depends on the achieved frame rate.
   */
  private intentVelocityX = 0;

  /**
   * Smoothed look-ahead in world px. Eased toward the facing direction in
   * `updateCamera`; zero while stationary or travelling.
   */
  private lookAheadX = 0;

  /**
   * Full-screen conduit band shown during pipe travel, and a flat blackout behind
   * it. See `buildTravelOverlay`.
   */
  /** Conduit scroll rate, in px per millisecond. See `updatePipes`. */
  private readonly travelBandSpeed = 0.55;

  /** The frame delta in ms, retained so decorative motion can be frame-rate corrected. */
  private lastDeltaMs = 16.7;

  private travelBand: Phaser.GameObjects.TileSprite | null = null;
  private travelOverlay: Phaser.GameObjects.Rectangle | null = null;

  /** Smoothed camera scroll target, in world px. See `updateCamera`. */
  private camTargetX = 0;
  private camTargetY = 0;

  /** Station views, in config order. */
  private stations: StationView[] = [];
  /** Parallax layers, kept as fields so the RESIZE handler can re-tile them. */
  private farLayer: Phaser.GameObjects.TileSprite | null = null;
  private midSkyLayer: Phaser.GameObjects.TileSprite | null = null;
  private midLayer: Phaser.GameObjects.TileSprite | null = null;
  private fgLayer: Phaser.GameObjects.TileSprite | null = null;
  /** Sky image (screen-fixed, scrollFactor 0,0). */
  private skyImage: Phaser.GameObjects.Image | null = null;
  /** Neon glow behind player (additive blend). */
  private playerGlow: Phaser.GameObjects.Image | null = null;
  /** Shadow ellipse at player feet. */
  private playerShadow: Phaser.GameObjects.Image | null = null;
  /** True while a panel is open in React; blocks world input. */
  private panelOpen = false;

  /** The station currently within interaction range, if any. */
  private focused: WorldStation | null = null;

  /** Cached bottom transparent-pad fraction per texture key (station grounding). */
  private bottomPadCache = new Map<string, number>();

  /**
   * Fraction of a texture's height that is fully transparent along its bottom
   * edge. Sprite-sheet cells carry padding below the object, so a
   * bottom-anchored sprite would visibly hover above the floor; the caller
   * shifts the sprite down by pad * displayHeight to ground it.
   */
  private textureBottomPad(key: string): number {
    const cached = this.bottomPadCache.get(key);
    if (cached !== undefined) return cached;
    let frac = 0;
    try {
      const img = this.textures.get(key)?.getSourceImage() as
        | { width: number; height: number }
        | undefined;
      if (img && img.width > 0 && img.height > 0) {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img as CanvasImageSource, 0, 0);
          const data = ctx.getImageData(0, 0, img.width, img.height).data;
          let pad = 0;
          for (let y = img.height - 1; y >= 0; y--) {
            let rowEmpty = true;
            for (let x = 0; x < img.width; x++) {
              if (data[(y * img.width + x) * 4 + 3] > 8) { rowEmpty = false; break; }
            }
            if (!rowEmpty) break;
            pad++;
          }
          frac = pad / img.height;
        }
      }
    } catch {
      frac = 0;
    }
    this.bottomPadCache.set(key, frac);
    return frac;
  }

  /** Transport instance. Owns pipe timing only. */
  private transport!: PipeTransport;
  /** Built pipe skins, keyed by pipe id. */
  private pipeSkins = new Map<string, DataPipeSkinResult>();
  /** The pipe whose trigger zone the player is inside, if any. */
  private armedPipe: WorldPipe | null = null;
  /** Frozen during travel, released on arrival. */
  private playerLocked = false;

  /**
   * Keyboard codes currently held, tracked at the WINDOW level so the record
   * survives the chapter swap.
   *
   * Phaser deletes every Key it created when a scene's keyboard plugin shuts down,
   * and the chapter swap is `scene.stop()` + `scene.start()`. A key held across
   * that boundary emits no new `keydown`, so the new scene's Keys all read
   * `isDown === false` and the player arrives unable to move. This set is the
   * only surviving record of what the keyboard is actually doing, and
   * `createInputKeys` re-applies it to the fresh Keys.
   *
   * Tracked in `create()` and released in `shutdown()` — it is a window listener,
   * so it must not outlive the scene.
   */
  private readonly heldAtSwap = new Set<string>();
  private readonly trackHeldDown = (event: KeyboardEvent) => {
    this.heldAtSwap.add(event.code);
  };
  private readonly trackHeldUp = (event: KeyboardEvent) => {
    this.heldAtSwap.delete(event.code);
  };
  /**
   * Clearing on blur stops a key being stuck down forever when the visitor
   * alt-tabs mid-travel and the keyup is delivered to a window nobody is
   * listening on. A named field so `shutdown()` can actually remove it — an
   * inline arrow here would leak one handler per chapter swap.
   */
  private readonly clearHeldOnBlur = () => {
    this.heldAtSwap.clear();
  };
  /** The chapter the player is in, tracked for the React mirror. */
  private currentChapter: ChapterId | undefined;

  constructor() {
    super(WORLD_SCENE_KEY);
  }

  /** Called by the engine before the scene starts. */
  setConfig(config: WorldSceneConfig): void {
    this.config = config.world;
    /* 
     * Resolve exactly ONE chapter here.
     *
     * `chapterWorld` returns only this chapter's width, spawn, platforms, stations
     * and pipes. Nothing downstream can reach another chapter's geometry, because
     * it was never produced — not hidden, not built and disabled: absent.
     */
    const chapter = config.chapter ?? config.world.entryChapter;
    this.world = chapterWorld(config.world, chapter);
    this.chapterLabel = config.world.chapters.find((c) => c.id === chapter)?.label ?? '';
    this.currentChapter = chapter;
    this.reducedMotion = config.reducedMotion;
  }

  /** Load the robot character frames (bundled PNGs, see assets/robot/manifest.ts). */
  preload(): void {
    for (const [name, url] of Object.entries(ROBOT_FRAMES)) {
      this.load.image(`${PLAYER_TEXTURE_PREFIX}-${name}`, url);
    }
    // Surface level artwork assets
    this.load.image('surface-entry', '/assets/data-world/surface-entry.png');
    this.load.image('surface-platform', '/assets/data-world/surface-platform.png');
    this.load.image('surface-skills-portal', '/assets/data-world/surface-skills-portal.png');
    // Skills chapter artwork assets (Stage K): 2 portals x 8 frames, 6 stations
    // x idle/lit, and the modular platform tileset pieces.
    for (let i = 0; i < 8; i++) {
      this.load.image(`skills-portal-return-f${i}`, `/assets/data-world/skills-portal-return-f${i}.png`);
      this.load.image(`skills-portal-forward-f${i}`, `/assets/data-world/skills-portal-forward-f${i}.png`);
    }
    for (const id of ['sql', 'python', 'excel', 'power-bi', 'tableau', 'streamlit']) {
      this.load.image(`skills-station-${id}`, `/assets/data-world/skills-station-${id}.png`);
      this.load.image(`skills-station-${id}-lit`, `/assets/data-world/skills-station-${id}-lit.png`);
    }
    for (const piece of [
      'ground-left', 'ground-mid', 'ground-mid-alt', 'ground-right',
      'util-vent', 'util-support', 'util-pipe-v', 'util-pipe-h',
    ]) {
      this.load.image(`skills-${piece}`, `/assets/data-world/skills-${piece}.png`);
    }
    // Projects chapter (Layer 3, Core): one animated return portal (8 frames
    // extracted from the supplied GIF), four hologram idle/hover pairs cropped
    // from the supplied sheet, and the modular platform kit pieces.
    // See public/assets/data-world/core/ASSET_MANIFEST.md.
    for (let i = 0; i < 8; i++) {
      this.load.image(`core-portal-return-f${i}`, `/assets/data-world/core/portals/skills-return/f${i}.png`);
    }
    const CORE_HOLO_SLUGS: Record<string, string> = CORE_HOLO_SLUG;
    for (const slug of Object.values(CORE_HOLO_SLUGS)) {
      this.load.image(`core-holo-${slug}`, `/assets/data-world/core/projects/${slug}/idle.png`);
      this.load.image(`core-holo-${slug}-lit`, `/assets/data-world/core/projects/${slug}/hover.png`);
    }
    for (const piece of ['slab-1', 'slab-2', 'slab-3', 'slab-4', 'grate-1', 'grate-2']) {
      this.load.image(`core-floor-${piece}`, `/assets/data-world/core/platform/floor/${piece}.png`);
    }
    for (const piece of ['pillar-1', 'pillar-2', 'pillar-3']) {
      this.load.image(`core-structure-${piece}`, `/assets/data-world/core/platform/structures/${piece}.png`);
    }
    for (const piece of ['rack-1', 'rack-2', 'accent-1', 'accent-2']) {
      this.load.image(`core-deco-${piece}`, `/assets/data-world/core/platform/decorations/${piece}.png`);
    }
  }

  create(): void {
    /*
     * DIAGNOSTIC HANDLE.
     *
     * Exposes the live scene on `window.__worldScene` so tests can inspect real
     * layer geometry instead of inferring it from screenshots. This exists because
     * two visual bugs in this phase were ONLY diagnosable from actual object
     * positions: the WebGL drawing buffer is not preserved, so `toDataURL` returns
     * black and screenshots of the canvas are the only visual record.
     *
     * Read-only use; the existing `__worldProbe` remains the supported contract
     * for gameplay assertions, and nothing in the game reads this handle.
     */
    (window as unknown as { __worldScene?: unknown }).__worldScene = this;

    /*
     * The interaction bus is deliberately NOT cleared here.
     *
     * React subscribes to the bus BEFORE calling mountWorld, so anything that
     * resets it during scene creation erases the live React listener and the
     * engine -> React event path silently dies. Clearing belongs at mount and
     * unmount (see resetInteractionBus in engine.ts), never in `create()`.
     */
    const world = this.world;

    // Seed the frame clock so the first update measures a real delta rather than
    // however long the texture generation above took.
    this.lastFrameAt = this.time.now;

    // --- Procedural textures. No files, no loaders, no network. ---
    // Phase 1's placeholder texture is still registered so any code path that
    // referenced it keeps working; the character uses the loaded robot frames
    // (preload) in a uniform 56x62 cell, bottom-anchored.
    drawPlayer(this);
    drawInteractionGem(this);

    // Skip procedural sky/parallax when video backgrounds are available (Data World).
    // The React layer handles video playback; procedural background remains as fallback.
    if (this.config.id !== 'data') {
      this.buildEnvironment();
    }

    // --- World + camera bounds ---
    this.physics.world.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setRoundPixels(true);
    // Transparent camera background so the React video layer shows through.
    // The procedural sky/parallax is skipped when video backgrounds are active.
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    /*
     * Honour a pending camera placement BEFORE anything is built or rendered.
     *
     * When this `create()` is the destination half of a pipe journey, the transport
     * left a target here during its `build` phase. Applying it now — before
     * `buildPlayer` and before the first frame — is what guarantees the reveal
     * never shows a single frame of the destination at the wrong position, which
     * otherwise reads as the camera flying across the level as you arrive.
     */
    if (this.cameraTarget) {
      this.snapCameraTo(this.cameraTarget.x, world.groundY - 100);
      this.cameraTarget = null;
    }

    this.buildTerrain();
    this.buildPlayer();
    this.buildStations();
    this.buildPipes();
    this.buildInteractionProbe();
    /*
     * Build the transport ONLY on first creation.
     *
     * A chapter change STOPS and STARTS this scene, which re-runs `create()`. The
     * transport must survive that restart, because the transport is what CAUSES the
     * restart: it calls `scene.stop()` in its `build` phase and `scene.start()` in
     * its `position` phase. Constructing a new transport here would reset the phase
     * log mid-journey and leave a fresh instance whose phase is `approach`, so
     * `isTravelling` would be false and `update()` would early-return forever --
     * meaning `emerging`, `settle` and `idle` never ran, the blackout never lifted,
     * and the player stayed invisible permanently.
     *
     * Reusing the instance is what makes the twelve phases one continuous journey
     * rather than two disconnected ones.
     */
    if (!this.transport) this.buildTransport();
    this.setupCamera();
    this.buildTravelOverlay();
    this.setupInput();

    /*
     * Re-tile the parallax layers once the camera has its real size. Built during
     * `create()` the strips use whatever size the camera reports at that moment,
     * which can be the canvas's initial value on a fast resize.
     */
    this.scale.on('resize', this.handleResize, this);
    this.handleResize(this.scale.gameSize);

    this.exposeDiagnostics();

    // Announce the starting chapter so the mirror's heading is correct on the
    // very first frame rather than only after the player moves. It goes to its
    // OWN live region (`world-chapter`), not to `world-interaction`, which is
    // reserved for things the player touched.
    const startChapter = world.chapter;
    if (startChapter) this.announceChapter(startChapter);
  }

  /**
   * Publish a read-only snapshot of player, camera, world and interaction state.
   *
   * This is how QA asserts gameplay. It reads live physics values rather than
   * scraping pixels, so a failing test names the behaviour that broke instead of
   * a colour that shifted. It exposes nothing actionable and mutates nothing.
   *
   * The Phase 1 fields are unchanged. Phase 2 ADDS fields; it renames none, so
   * the existing suite keeps passing against the same probe.
   */
  private exposeDiagnostics(): void {
    if (typeof window === 'undefined') return;

    (window as unknown as { __worldProbe?: unknown }).__worldProbe = () => {
      const body = this.player?.body as Phaser.Physics.Arcade.Body | undefined;
      return {
        // --- Phase 1 contract: unchanged ---
        ok: Boolean(this.player && body),
        x: this.player?.x ?? 0,
        y: this.player?.y ?? 0,
        grounded: body?.onFloor() ?? false,
        camScrollX: this.cameras.main.scrollX,
        camScrollY: this.cameras.main.scrollY,
        canvasCount: document.querySelectorAll('canvas').length,
        worldWidth: this.world.width,
        worldHeight: this.world.height,
    /*
         * The game's real horizontal speed in px/s. Read from the scene's own
         * time-based integration, NOT from `body.velocity.x`, which Arcade
         * reports as zero because the scene advances x itself (see `update`).
         */
        velocityX: this.intentVelocityX,
        velocityY: body?.velocity.y ?? 0,
        facingRight: this.player?.flipX === false ? true : this.player?.flipX === true ? false : null,

        // --- Phase 2 additions ---
        /** The sprite's rendered height, so tests can prove the character grew. */
        playerSpriteHeight: this.player?.height ?? 0,
        /** The chapter the player is currently in. */
        chapter: this.currentChapter ?? null,
        /** Id of the station within interaction range, or null. */
        focusedStationId: this.focused?.id ?? null,
        /** Kind of the focused station. */
        focusedStationKind: this.focused?.kind ?? null,
        /** True when a station is lit. */
        stationLit: this.focused !== null,
        /** True while the pipe transport is running. */
        travelling: this.transport?.isTravelling ?? false,
        /** The pipe the player is standing in the trigger zone of, if any. */
        armedPipeId: this.armedPipe?.id ?? null,
        /** Number of stations built. */
        stationCount: this.stations.length,
        /** Number of pipes built. */
        pipeCount: this.pipeSkins.size,
        /** True when a panel is open in React. */
        panelOpen: this.panelOpen,
        /** Player input frozen (during travel). */
        locked: this.playerLocked,
    /*
         * Camera zoom, and how much of the world height is actually on screen.
         * `camViewHeight` is what decides whether a structure reads as big or
         * small: it is `viewportHeight / zoom`, so raising zoom is the only way to
         * make the player fill more of the frame.
         */
        camZoom: this.cameras.main.zoom,
        camViewWidth: Math.round(this.cameras.main.worldView.width),
        camViewHeight: Math.round(this.cameras.main.worldView.height),
        /** Smoothed look-ahead offset currently applied, in world px. */
        lookAheadX: Math.round(this.lookAheadX),
      };
    };
  }

  /**
   * The layered facility environment: three parallax depths.
   *
   * far  — silhouetted towers, distant unlit conduit runs, dim lit windows
   * mid  — large conduits carrying lit data flow, gantries, machinery
   * near — the playable floor, drawn by `buildTerrain`
   *
   * PERFORMANCE — WHY THIS USES TILE SPRITES, NOT FULL-WORLD IMAGES
   *
   * The obvious implementation is one `Image` per layer, sized to the whole world,
   * with a scroll factor. That is what Phase 1 did at 1920px wide and it was fine.
   * At 3840px wide it costs ~50ms a frame: three full-world bitmap blits per frame,
   * every frame, regardless of how little of the world is actually on screen.
   * Measured, that dropped the page to 20fps — and a 20fps game does not walk at
   * 90px/s, because movement is per-frame, so the walk silently became ~59px/s and
   * every distance-based gameplay test failed for a reason that had nothing to do
   * with gameplay.
   *
   * The fix is to blit only what is visible. `buildParallaxLayer` builds each layer
   * as a strip that is exactly ONE VIEWPORT WIDE and repeats horizontally, so a
   * full-screen layer costs a handful of quads rather than a 3840px bitmap. The art
   * is generated at full world width first — the towers, gantries and conduit runs
   * are placed across the entire world — and then sampled down to that strip.
   *
   * The visual consequence is that a parallax layer now repeats every screenful
   * instead of being unique across the world. That is a real trade: the far
   * skyline repeats. It is invisible in motion because the layers scroll at
   * different rates and the near layer covers the bottom, and it is worth paying
   * for a frame rate the game can actually run at.
   */
  private buildEnvironment(): void {
      const world = this.world;
      const cam = this.cameras.main;

      // Generate all neon textures for this chapter (idempotent, seeded)
      generateAllForChapter(
        this,
        world.id,
        world.width,
        world.groundY,
        cam.width,
        cam.height,
      );

      /* --- Layer stack (back → front), all horizontal parallax only --- */

      // 1. Sky — screen-fixed gradient + stars + moon
      const skyKey = `neon-sky-${world.id}-${cam.width}x${cam.height}`;
      this.skyImage = this.add
        .image(0, 0, skyKey)
        .setOrigin(0, 0)
        .setScrollFactor(0, 0)
        .setDepth(-40);
      this.skyImage.setDisplaySize(cam.width, cam.height);

      // 2. Far skyline (scroll 0.12)
      this.farLayer = this.buildParallaxLayer(
        `neon-far-${world.id}-${world.width}x${world.groundY}`,
        world.groundY,
        this.reducedMotion ? 1 : 0.12,
        -30,
      );

      // 3. Mid skyline (scroll 0.25)
      this.midSkyLayer = this.buildParallaxLayer(
        `neon-midsky-${world.id}-${world.width}x${world.groundY}`,
        world.groundY,
        this.reducedMotion ? 1 : 0.25,
        -28,
      );

      // 4. Midground buildings (scroll 0.45) — variant A stored, B for flicker
      this.midLayer = this.buildParallaxLayer(
        `neon-mid-${world.id}-${world.width}x${world.groundY}-v0`,
        world.groundY,
        this.reducedMotion ? 1 : 0.45,
        -20,
      );

      // 5. Foreground rooftop/street (scroll 0.7)
      this.fgLayer = this.buildParallaxLayer(
        `neon-fg-${world.id}-${world.width}x${world.groundY}`,
        world.groundY,
        this.reducedMotion ? 1 : 0.7,
        -10,
      );
    }

    /**
     * Build one parallax layer as a viewport-wide repeating strip.
     *
     * `sourceY` is where in the source texture the strip starts. The layer is placed
     * at world y=0 and the strip is drawn from the top of the world's vertical span,
     * so the ground line still lands exactly where the terrain puts it.
     */
    private buildParallaxLayer(
      sourceKey: string,
      sourceHeight: number,
      scrollFactor: number,
      depth: number,
    stripWidth?: number,
    ): Phaser.GameObjects.TileSprite | null {
      const world = this.world;
      if (!this.textures.exists(sourceKey)) return null;

      /*
       * A whole number of viewport widths, so the layer always covers the visible
       * area exactly and never leaves background colour showing at an edge. The
       * camera may not have its final size yet during `create`, so `handleResize`
       * re-supplies it once the real size is known.
       */
      /*
       * WIDTH: one full world's worth of art, rounded up to whole repeats.
       *
       * Deliberately NOT clamped to `worldWidth * scrollFactor + viewport`. That
       * arithmetic is the right one for a layer whose texture repeats by
       * construction, but here the source texture contains 3840px of AUTHORED,
       * NON-REPEATING variation — unique towers, elbows and junctions placed by
       * hash. A strip narrower than the art would show only the leftmost slice and
       * tile it, silently discarding the variation in x=2200..3840 and replacing
       * it with a visible repeat.
       *
       * (Tried, measured, reverted: the narrower strips produced an identical
       * frame on a 8-screen traverse but threw away ~45% of the drawn content.
       * The real cost was height, not width — see the layer height below.)
       */
      const unit = Math.max(1, stripWidth ?? this.cameras.main.width);
      const width = Math.ceil(world.width / unit) * unit;

      const key = `strip-${sourceKey}-${width}`;
      if (!this.textures.exists(key)) {
        const source = this.textures.get(sourceKey);
        const image = source.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
        const texture = this.textures.createCanvas(key, width, sourceHeight);
        if (!texture) return null;
        const ctx = texture.getContext();
        ctx.imageSmoothingEnabled = false;
    /*
         * Draw the strip `sourceWidth` wide, repeating as needed. Phaser tiles the
         * canvas texture across the layer, so the pattern must fill the whole strip.
         */
        const sourceWidth = 'width' in image ? image.width : width;
        for (let x = 0; x < width; x += sourceWidth) {
          ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, x, 0, sourceWidth, sourceHeight);
        }
        texture.refresh();
      }

      const layer = this.add
        .tileSprite(0, 0, width, sourceHeight, key)
        .setOrigin(0, 0)
    /*
         * HORIZONTAL PARALLAX ONLY. `setScrollFactor(f)` sets BOTH axes, and that
         * was silently destroying the scene.
         *
         * Measured: with `scrollFactorY` also at 0.15/0.30/0.45, a camera sitting
         * at scrollY=333 framed texture rows 50..334 (far), 100..384 (ceiling) and
         * 150..434 (mid) — but all the authored art lives in rows 280..560. Only
         * 19% of the far layer's art, 37% of the ceiling's and 55% of the midground's
         * was ever on screen; the rest was drawn off the top of the frame. That is
         * why the render measured 78% of the canvas as one flat colour with 66% of
         * rows containing exactly one distinct value: the layers were technically
         * present and mostly invisible.
         *
         * Horizontal parallax is the effect that actually sells depth in a
         * side-scrolling world, and it is preserved exactly. Vertical parallax is
         * disabled because in a world with a fixed floor line it does nothing but
         * misalign every layer against the one thing they must agree on: where the
         * ground is.
         */
        .setScrollFactor(scrollFactor, 1)
        .setDepth(depth);
      return layer;
    }


  /**
   * The ground and the Phase 1 platforms.
   *
   * The ground body is one static rectangle spanning the world below `groundY`,
   * exactly as in Phase 1, so every collision and landing assertion still holds.
   * The pipe mouths are NOT holes in it: the transport teleports the player, so a
   * real gap would only create a hole a visitor could fall through.
   */
  private buildTerrain(): void {
    const world = this.world;
    const isCliff = world.chapter === 'cliff';

    this.platforms = this.physics.add.staticGroup();

    /*
     * THE FLOOR SLAB — and it is the reason the frame used to look empty.
     *
     * Measured: this rectangle was `worldHeight - groundY` tall, so extending the
     * world from 640 to 900 grew the solid floor from 80px to 340px, and the
     * camera framed a slice of it in every frame. A pixel sample found 66% of
     * scanlines holding exactly one colour. The floor was the largest single
     * object on screen and it was a flat `fillRect` with nothing in it.
     *
     * Two changes, both about giving this region something to look at:
     *
     *  1. It is capped to `SUB_FLOOR_DEPTH` (56px) instead of filling to the bottom
     *     of the world. Nothing is ever seen below it — the camera's lower clamp
     *     stops 18px under the floor line — so the remaining 284px was 284px of
     *     invisible geometry being allocated and drawn.
     *
     *  2. It is drawn as a TEXTURE with ribs, seams and a conduit run rather than
     *     as a flat rectangle, for the same reason the ceiling got beams: a large
     *     flat area reads as "unfinished" no matter how well the rest of the scene
     *     is drawn. The collision geometry is unchanged, so physics is untouched.
     *
     * For the Surface (cliff) chapter, the floor visual is replaced by the
     * `surface-platform` artwork asset. The procedural subfloor is still created
     * for physics but not rendered visually.
     */
    const subFloorDepth = Math.min(SUB_FLOOR_DEPTH, world.height - world.groundY);

    if (isCliff) {
      // Surface: create procedural subfloor for physics only (not rendered)
      this.drawSurfaceSubFloor(subFloorDepth);
    } else {
      drawSubFloor(this, subFloorDepth);
    }

    /* Neon ground slab — visual only, drawn on top of the physics ground. */
    const groundKey = `neon-ground-${world.id}-${world.width}`;
    if (this.textures.exists(groundKey)) {
      const groundImg = this.add
        .image(0, world.groundY, groundKey)
        .setOrigin(0, 0)
        .setScrollFactor(1, 1)
        .setDepth(1);
      groundImg.setDisplaySize(world.width, subFloorDepth);
    }

    /* Physics ground body for collision (unchanged from Phase 1). */
    const ground = this.add.image(
      world.width / 2,
      world.groundY + subFloorDepth / 2,
      isCliff ? `surface-subfloor-${subFloorDepth}` : `data-subfloor-${subFloorDepth}`
    );
    ground.setDisplaySize(world.width, subFloorDepth);
    this.physics.add.existing(ground, true);
    (ground.body as Phaser.Physics.Arcade.Body).setSize(world.width, subFloorDepth);
    (ground.body as Phaser.Physics.Arcade.Body).setOffset(0, 0);
    this.platforms.add(ground);

    // A lighter rim along the ground surface: a pixel edge that makes the landing
    // plane unambiguous at a glance.
    const rimColor = isCliff ? '#CF31AD' : world.palette.groundTop;
    this.add
      .rectangle(world.width / 2, world.groundY + 1, world.width, 2, colour(rimColor))
      .setDepth(1);

    // Platform ledges: physics bodies stay EXACTLY as configured (Phase 1 contracts).
    // Visuals: on cliff, we use the platform artwork asset instead of individual ledge rects;
    // on skills, the tileset ledge pieces replace them the same way.
    const artCoveredLedges = isCliff || world.chapter === 'skills' || world.chapter === 'projects';
    for (const p of world.platforms) {
      const rect = this.add.rectangle(
        p.x + p.width / 2,
        p.y + p.height / 2,
        p.width,
        p.height,
        colour(world.palette.ground)
      );
      this.physics.add.existing(rect, true);
      this.platforms.add(rect);

      if (artCoveredLedges) {
        // The rect object stays as the invisible static physics body —
        // collision is unchanged (Arcade bodies collide regardless of
        // visibility); only the dark fill rectangle is hidden.
        rect.setVisible(false);
      } else {
        // Other chapters: keep existing simple rim visual.
        this.add.rectangle(p.x + p.width / 2, p.y + 1, p.width, 2, colour(world.palette.groundTop)).setDepth(1);
      }
      // Cliff rim on the physics body is also suppressed since the platform
      // artwork provides the ground line.
    }

    // Surface-only: platform artwork + entry + portal visuals
    if (isCliff) {
      this.buildSurfaceArtwork();
    } else if (world.chapter === 'skills') {
      // Skills (Stage K): modular tileset ground + ledge platforms + utilities
      // + the two animated portals.
      this.buildSkillsArtwork();
    } else if (world.chapter === 'projects') {
      // Projects (Layer 3, Core): kit-built continuous floor + supports + decor,
      // the single far-left animated return portal, and (via buildStations)
      // the four hologram pairs.
      this.buildProjectsArtwork();
    }
  }

  /**
   * Draw the Surface (cliff) subfloor with dark violet base + magenta/cyan neon.
   * Creates a canvas texture `surface-subfloor-${depth}` tiled at 64px bays.
   * This is used for the physics ground body texture.
   */
  private drawSurfaceSubFloor(depth: number): void {
    const key = `surface-subfloor-${depth}`;
    if (this.textures.exists(key)) return;

    const BAY = 64;
    const texture = this.textures.createCanvas(key, BAY, depth);
    if (!texture) return;
    const ctx = texture.getContext();
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // Dark violet base (#211735 from reference analysis)
    ctx.fillStyle = '#211735';
    ctx.fillRect(0, 0, BAY, depth);

    // Magenta neon upper edge (#CF31AD)
    ctx.fillStyle = '#CF31AD';
    ctx.fillRect(0, 0, BAY, 2);

    // Vertical bay seams with cyan edge (#17D3F4)
    ctx.fillStyle = '#1A0D23'; // dark seam
    ctx.fillRect(0, 4, 2, depth - 4);
    ctx.fillStyle = '#17D3F4';
    ctx.fillRect(2, 4, 1, depth - 6);

    // Horizontal seam across the bay
    ctx.fillStyle = '#1A0D23';
    ctx.fillRect(0, Math.floor(depth * 0.58), BAY, 2);

    // Structural ribs with magenta lit edges
    for (let rx = 10; rx < BAY - 4; rx += 22) {
      ctx.fillStyle = '#CF31AD';
      ctx.fillRect(rx, 8, 6, depth - 12);
      ctx.fillStyle = '#0A0410';
      ctx.fillRect(rx + 2, 12, 2, depth - 20);
    }

    // Dim conduit run (magenta)
    const cy = Math.floor(depth * 0.58) - 8;
    ctx.fillStyle = '#8B2270'; // dim magenta
    ctx.fillRect(4, cy, BAY - 8, 2);
    // Lit magenta segment
    ctx.fillStyle = '#CF31AD';
    ctx.fillRect(8, cy, 10, 2);

    // Cyan accent line along bottom of subfloor
    ctx.fillStyle = '#17D3F4';
    ctx.fillRect(0, depth - 1, BAY, 1);

    texture.refresh();
  }

  /**
   * Build the Surface (cliff) visual artwork: platform, entry structure, and portal.
   * Uses the three PNG assets loaded in preload(). Physics bodies are created
   * separately in the main buildTerrain() and are unchanged.
   */
  private buildSurfaceArtwork(): void {
    const world = this.world;

    // Platform artwork: 1266x617 source, scaled to full world width (900)
    // Walkable surface in source is at y≈563 (lower band center), image bottom at y=687
    // Offset from walkable surface to bottom = 124px
    // Scale factor = world.width / 1266
    const platformScale = world.width / 1266;
    const platformDisplayHeight = 617 * platformScale;
    const walkableToBottom = 124 * platformScale;
    const platformBottomY = world.groundY + walkableToBottom;

    if (this.textures.exists('surface-platform')) {
      this.add
        .image(world.width / 2, platformBottomY, 'surface-platform')
        .setOrigin(0.5, 1)
        .setDisplaySize(world.width, platformDisplayHeight)
        .setDepth(2); // Above subfloor (1), below robot (10)
    }

    // Entry structure: 428x589 source, visible artwork 417x517.
    // Stage M2 approved scale: 0.4295 (= reference entry width 432px on the
    // 2172px reference strip mapped to the 900px world: 432*900/2172/417).
    // Bottom anchored at groundY (walkable surface), left margin 10.
    const entryScale = 0.4295;
    const entryDisplayWidth = 428 * entryScale; // ≈183.8
    const entryDisplayHeight = 589 * entryScale; // ≈253.0
    const entryBottomY = world.groundY;
    const entryLeftX = 10;

    if (this.textures.exists('surface-entry')) {
      this.add
        .image(entryLeftX, entryBottomY, 'surface-entry')
        .setOrigin(0, 1)
        .setDisplaySize(entryDisplayWidth, entryDisplayHeight)
        .setDepth(3); // Above platform
    }

    // Portal to Skills: 427x621 source, visible artwork 423x385.
    // Stage M2 approved scale: 0.4144 (= reference portal width 423px on the
    // 2172px strip mapped to 900: 423*900/2172/423). Position x=662.35 centers
    // the visible portal artwork on the exit pipe trigger at world X=750
    // (750 - 423*0.4144/2 ≈ 662.35). Bottom anchored at groundY.
    const portalScale = 0.4144;
    const portalDisplayWidth = 427 * portalScale; // ≈176.9
    const portalDisplayHeight = 621 * portalScale; // ≈257.3
    const portalBottomY = world.groundY;
    const portalLeftX = 662.35;

    if (this.textures.exists('surface-skills-portal')) {
      this.add
        .image(portalLeftX, portalBottomY, 'surface-skills-portal')
        .setOrigin(0, 1)
        .setDisplaySize(portalDisplayWidth, portalDisplayHeight)
        .setDepth(3); // Above platform
    }
  }

  /**
   * Build the Skills chapter artwork (Stage K): modular platform tileset for the
   * ground and both ledges, utility props, and the two animated portals.
   *
   * Mirrors buildSurfaceArtwork: physics bodies are created separately in
   * buildTerrain() and are unchanged; this only adds visuals on top.
   *
   * Placement contract (world 1500x900, groundY 560):
   *  - Ground: the 4 tiles are assembled edge-to-edge at ONE uniform scale
   *    across x 0..1500 with their top edge at groundY — never one chunk
   *    stretched across the world, so the authored seams stay seamless.
   *  - No floating ledges or sky platforms: the former elevated tiles and
   *    their collision bodies were removed in the Stage K visual correction
   *    pass (nothing required them; all portals and stations sit on groundY).
   *  - Return portal: origin (0,1) at (60,560+pad), 165 wide -> spans x
   *    60..225, centred on the entry trigger at x=60 (zone 38..82): the
   *    artwork now sits around the actual transport trigger, so the player
   *    activates the return while standing inside the visible opening.
   *    Spawn x=90 stays right of the zone (arrival never re-triggers) and the
   *    zone stays left of spawn, so the walk right toward the stations never
   *    crosses it. The span stays fully inside the mobile-arrival viewport
   *    window (~x 40..245 at 390px wide / zoom 2), so the complete portal is
   *    on screen on arrival, on desktop and mobile, and never clipped at the
   *    left edge.
   *  - Forward portal: origin (0.5,1) at (1350,560+pad), 180 wide -> spans
   *    1260..1440, centred on the exit trigger x=1350.
   *  - "560+pad": every foreground object is grounded by its OPAQUE bounds —
   *    sprite y = groundY + transparentBottomPad * displayHeight — so the
   *    bottom-most visible pixel physically meets the platform top, with no
   *    transparent-padding gap and no sinking into the floor.
   *  - Portals play all 8 extracted frames at 10 fps = 0.8 s loop; under
   *    reduced motion the sprite stays on frame 0 (static portal).
   */
  private buildSkillsArtwork(): void {
    const world = this.world;
    const srcSize = (key: string): { w: number; h: number } | null => {
      if (!this.textures.exists(key)) return null;
      const img = this.textures.get(key).getSourceImage() as { width: number; height: number } | null;
      return img ? { w: img.width, h: img.height } : null;
    };

    // --- Ground platform: assemble the 4 tiles across the full world width ---
    const groundKeys = ['skills-ground-left', 'skills-ground-mid', 'skills-ground-mid-alt', 'skills-ground-right'];
    const groundSrc = groundKeys.map((k) => srcSize(k));
    const totalSrcW = groundSrc.reduce((s, d) => s + (d?.w ?? 0), 0);
    if (totalSrcW > 0) {
      const scale = world.width / totalSrcW;
      let x = 0;
      groundKeys.forEach((key, i) => {
        const d = groundSrc[i];
        if (!d) return;
        const w = d.w * scale;
        const h = d.h * scale;
        this.add.image(x, world.groundY, key).setOrigin(0, 0).setDisplaySize(w, h).setDepth(2);
        x += w;
      });
    }

    // --- Utility props (decor only, no collision, behind stations/portals) ---
    // Stage K visual correction: the foreground ladder was removed — it
    // obstructed the playable area and had no interaction or physics body.
    const utils: Array<{ key: string; x: number; y: number; ox: number; s: number }> = [
      { key: 'skills-util-pipe-h', x: 430, y: world.groundY, ox: 0, s: 0.8 },
      { key: 'skills-util-vent', x: 660, y: world.groundY, ox: 0, s: 0.5 },
      { key: 'skills-util-support', x: 1150, y: world.groundY, ox: 0, s: 0.6 },
      { key: 'skills-util-pipe-v', x: 1495, y: world.groundY, ox: 1, s: 0.8 },
    ];
    for (const u of utils) {
      const d = srcSize(u.key);
      if (!d) continue;
      this.add.image(u.x, u.y, u.key).setOrigin(u.ox, 1).setDisplaySize(d.w * u.s, d.h * u.s).setDepth(2);
    }

    // --- Portals: 8-frame vortex animation, 10 fps -> 0.8 s loop ---
    const portal = (prefix: string, x: number, originX: number, dispW: number): void => {
      const d = srcSize(`${prefix}-f0`);
      if (!d) return;
      const dispH = d.h * (dispW / d.w);
      // Ground alignment by OPAQUE bounds (final artwork pass): the extracted
      // frames carry transparent padding below the artwork (5px on every
      // frame), so anchoring the canvas bottom at groundY left the portal
      // visibly floating. Anchor the VISIBLE bottom at groundY instead:
      // y = groundY + bottomPad * dispH, re-applied per animation frame.
      const groundedY = (key: string): number => world.groundY + this.textureBottomPad(key) * dispH + GROUND_OVERLAP_PX;
      const sprite = this.add
        .sprite(x, groundedY(`${prefix}-f0`), `${prefix}-f0`)
        .setOrigin(originX, 1)
        .setDisplaySize(dispW, dispH)
        .setDepth(3);
      sprite.on('animationupdate', () => {
        const key = sprite.texture?.key ?? `${prefix}-f0`;
        sprite.setY(groundedY(key));
      });
      const animKey = `${prefix}-anim`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: Array.from({ length: 8 }, (_, i) => ({ key: `${prefix}-f${i}` })),
          frameRate: 10, // 8 frames at 10 fps = 0.8 s per loop
          repeat: -1,
        });
      }
      if (!this.reducedMotion) sprite.play(animKey);
      // Reduced motion: the sprite stays on frame 0 — a static portal.
    };
    portal('skills-portal-return', 0, 0, 165); // art spans 0..165, glowing opening ~31.5..141, so the entry fire zone 38..82 sits INSIDE the visible opening: the player fires while standing in the portal. Fully inside the mobile arrival window (scrollX 0 + 195px view at 390px/zoom 2), left edge exactly at the world boundary x=0.
    portal('skills-portal-forward', 1350, 0.5, 180); // exit trigger x=1350
  }

  /**
   * Build the Projects (Layer 3, Core) visuals from the supplied kit assets.
   * Physics bodies are created separately in buildTerrain() and are unchanged;
   * this only adds visuals on top.
   *
   * Placement contract (world 1500x900, groundY 560) — see
   * public/assets/data-world/core/ASSET_MANIFEST.md for the full manifest:
   *
   *  - Floor: the four kit slabs are assembled EDGE-TO-EDGE at ONE uniform
   *    scale (1500 / 1653 source px) with their top edge at groundY, exactly
   *    like the skills tileset — never one piece stretched. The slab top edge
   *    is the authored walk surface, so the artwork surface line and the
   *    collision line (groundY) coincide.
   *  - Supports: three pillar pieces hang BELOW the floor line (top at
   *    groundY+100, depth 1) so they read as structure underneath, peeking
   *    through the slabs' transparent bottom rows.
   *  - Floor panels / racks / accents: grounded by OPAQUE bounds (same rule as
   *    stations and portals) at depth 2, placed in the gaps so they never
   *    cover a hologram (stations render at depth 6, in front).
   *  - Portal: the single animated Skills-return vortex, origin (0,1) at
   *    x=0, 180x180, depth 3 -> art spans 0..180. Its visible opening
   *    (display x ~35.7..143.4, measured from the dark-core bbox 88..353 of
   *    the 443px frame) CONTAINS the trigger arm zone 38..82 of the
   *    projects-entry pipe at x=60, so the player fires the return while
   *    standing inside the glowing opening. Spawn x=144 sits outside the near
   *    zone (8..112), so arrival never re-triggers. Grounded by opaque bounds
   *    + 3px overlap, so the portal's mechanical base presses into the floor
   *    instead of hovering. 8 frames at 10 fps = 0.8 s loop; reduced motion
   *    keeps frame 0 static.
   */
  private buildProjectsArtwork(): void {
    const world = this.world;
    const srcSize = (key: string): { w: number; h: number } | null => {
      if (!this.textures.exists(key)) return null;
      const img = this.textures.get(key).getSourceImage() as { width: number; height: number } | null;
      return img ? { w: img.width, h: img.height } : null;
    };
    const groundedY = (key: string, dispH: number): number =>
      world.groundY + this.textureBottomPad(key) * dispH + GROUND_OVERLAP_PX;

    // --- Continuous floor: 4 slabs edge-to-edge at one uniform scale ---
    const slabKeys = ['core-floor-slab-1', 'core-floor-slab-2', 'core-floor-slab-3', 'core-floor-slab-4'];
    const slabSrc = slabKeys.map((k) => srcSize(k));
    const totalSrcW = slabSrc.reduce((s, d) => s + (d?.w ?? 0), 0);
    if (totalSrcW > 0) {
      const scale = world.width / totalSrcW;
      let x = 0;
      slabKeys.forEach((key, i) => {
        const d = slabSrc[i];
        if (!d) return;
        const w = d.w * scale;
        const h = d.h * scale;
        // Top edge at groundY: the slab's authored top row is the walk surface.
        this.add.image(x, world.groundY, key).setOrigin(0, 0).setDisplaySize(w, h).setDepth(2);
        x += w;
      });
    }

    // --- Support pillars hanging below the floor (depth 1, behind the slabs) ---
    const pillars: Array<{ key: string; x: number }> = [
      { key: 'core-structure-pillar-1', x: 300 },
      { key: 'core-structure-pillar-2', x: 750 },
      { key: 'core-structure-pillar-3', x: 1200 },
    ];
    for (const p of pillars) {
      const d = srcSize(p.key);
      if (!d) continue;
      const s = 0.8;
      this.add
        .image(p.x, world.groundY + 100, p.key)
        .setOrigin(0.5, 0)
        .setDisplaySize(d.w * s, d.h * s)
        .setDepth(1);
    }

    // --- Floor grate panels set into the walk surface (top at groundY) ---
    const grates: Array<{ key: string; x: number }> = [
      { key: 'core-floor-grate-1', x: 250 },
      { key: 'core-floor-grate-2', x: 760 },
    ];
    for (const g of grates) {
      const d = srcSize(g.key);
      if (!d) continue;
      const s = 0.5;
      this.add.image(g.x, world.groundY, g.key).setOrigin(0, 0).setDisplaySize(d.w * s, d.h * s).setDepth(2);
    }

    // --- Decor: racks and accents, grounded by opaque bounds, behind stations ---
    const decor: Array<{ key: string; x: number; s: number }> = [
      { key: 'core-deco-rack-1', x: 210, s: 0.55 },
      { key: 'core-deco-rack-2', x: 1370, s: 0.55 },
      { key: 'core-deco-accent-1', x: 560, s: 0.4 },
      { key: 'core-deco-accent-2', x: 1060, s: 0.4 },
    ];
    for (const u of decor) {
      const d = srcSize(u.key);
      if (!d) continue;
      const dispW = d.w * u.s;
      const dispH = d.h * u.s;
      this.add
        .image(u.x, groundedY(u.key, dispH), u.key)
        .setOrigin(0.5, 1)
        .setDisplaySize(dispW, dispH)
        .setDepth(2);
    }

    // --- The single return portal: far left, grounded, in front of the floor ---
    const prefix = 'core-portal-return';
    const d0 = srcSize(`${prefix}-f0`);
    if (d0) {
      const dispW = 180;
      const dispH = d0.h * (dispW / d0.w);
      const yFor = (key: string): number => groundedY(key, dispH);
      const sprite = this.add
        .sprite(0, yFor(`${prefix}-f0`), `${prefix}-f0`)
        .setOrigin(0, 1) // art spans x 0..180; opening covers the arm zone 38..82 of the trigger at x=60
        .setDisplaySize(dispW, dispH)
        .setDepth(3);
      sprite.on('animationupdate', () => {
        const key = sprite.texture?.key ?? `${prefix}-f0`;
        sprite.setY(yFor(key));
      });
      const animKey = `${prefix}-anim`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: Array.from({ length: 8 }, (_, i) => ({ key: `${prefix}-f${i}` })),
          frameRate: 10, // 8 frames at 10 fps = 0.8 s per loop, same as the skills portals
          repeat: -1,
        });
      }
      if (!this.reducedMotion) sprite.play(animKey);
      // Reduced motion: the sprite stays on frame 0 — a static portal.
    }
  }

  private buildPlayer(): void {
    const world = this.world;

    this.player = this.physics.add.sprite(
      world.spawn.x,
      world.spawn.y,
      `${PLAYER_TEXTURE_PREFIX}-idleA`
    );
    this.player.setOrigin(0.5, 1);
    this.player.setDepth(10);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // Phaser 4: these are BODY methods. On the sprite they are undefined and
    // calling them throws "setCollideWorldBounds is not a function".
    body.setCollideWorldBounds(true);
    /*
     * The hitbox is the Phase 1 box (10x14) re-anchored to the taller sprite.
     *
     * Keeping the SAME box matters: a wider or taller body would change the
     * collision and camera results the Phase 1 suite asserts against. Only the
     * offset moves, so the feet still land exactly where they did before while
     * the sprite above them is now a recognisable character.
     */
    body.setSize(PLAYER.bodyWidth, PLAYER.bodyHeight);
    body.setOffset(
      (ROBOT_FRAME_WIDTH - PLAYER.bodyWidth) / 2,
      ROBOT_FRAME_HEIGHT - PLAYER.bodyHeight
    );
    body.setMaxVelocity(PLAYER.speed, 520);
    body.setDragX(PLAYER.drag);
    body.setBounce(0);

    this.physics.add.collider(this.player, this.platforms);

    /* Neon glow disc behind player (additive) + shadow at feet.
     * Created here so they exist for every chapter; update() positions them.
     */
    if (this.textures.exists('neon-glow')) {
      this.playerGlow = this.add
        .image(0, 0, 'neon-glow')
        .setOrigin(0.5, 0.5)
        .setDepth(9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(2.2)
        .setAlpha(0.5)
        .setVisible(false);
    }
    if (this.textures.exists('neon-shadow')) {
      this.playerShadow = this.add
        .image(0, 0, 'neon-shadow')
        .setOrigin(0.5, 0.5)
        .setDepth(2)
        .setAlpha(0.5)
        .setVisible(false);
    }

    /*
     * A chapter swap builds a brand new player sprite, which Phaser creates
     * visible. Without this, the player would be plainly standing at the
     * destination from the moment `create()` ran — before the `emerging` phase
     * that is supposed to show them climbing OUT of the destination's pipe. The
     * visible-then-climb sequence defeats the whole point of the emergence, so a
     * player built mid-journey starts hidden and is revealed by `settle`.
     */
    if (this.swappingChapter) {
      this.player.setVisible(false);
    }

    this.player.setData('interactive', false);
    this.setAnimationFrame('idleA');
  }

  /**
   * Place one station sprite per content record.
   *
   * Each station gets TWO textures — lit and unlit — and the scene swaps between
   * them. That is deliberate: a tint or an animated scale would either wash the
   * pixel palette toward cyan or smear the pixel grid. Two pre-drawn textures keep
   * every pixel exactly where it was authored, and make the highlight identical
   * for every visitor and every test run.
   */
  private buildStations(): void {
    this.stations = [];
    const world = this.world;

    for (const station of world.stations) {
      const keyBase = `station-${station.kind}-${station.id}`;
      // Stage K: on the skills chapter use the supplied per-skill PNG pair when
      // present; Layer 3: on the projects chapter use the extracted hologram
      // pair. The procedural canvas below stays as the missing-asset fallback
      // so a missing file can never soft-lock the chapter.
      const pngIdle =
        world.chapter === 'projects' && station.kind === 'project'
          ? `core-holo-${CORE_HOLO_SLUG[station.id] ?? station.id}`
          : `skills-station-${station.id}`;
      const pngLit = `${pngIdle}-lit`;
      const usePng =
        (world.chapter === 'skills' || world.chapter === 'projects') &&
        this.textures.exists(pngIdle) &&
        this.textures.exists(pngLit);
      const idleKey = usePng ? pngIdle : `${keyBase}-idle`;
      const litKey = usePng ? pngLit : `${keyBase}-lit`;

      if (!this.textures.exists(idleKey) || !this.textures.exists(litKey)) {
        const size =
          station.kind === 'skill'
            ? { width: 96, height: 104 }
            : { width: 176, height: 132 };
        for (const [key, proximity] of [
          [idleKey, false],
          [litKey, true],
        ] as const) {
          if (this.textures.exists(key)) continue;
          const ctx = canvasTexture(this, key, size.width, size.height);
          if (!ctx) continue;
          if (station.kind === 'skill') {
            drawSkillStation(ctx, size, { label: station.label, tag: station.tag }, proximity);
          } else {
            drawProjectStation(
              ctx,
              size,
              { title: station.label, stageCount: 0 },
              proximity
            );
          }
          (ctx as CanvasRenderingContext2D & { __tex?: Phaser.Textures.CanvasTexture }).__tex?.refresh();
        }
      }

      const sprite = this.add
        .image(station.x, station.y, idleKey)
        .setOrigin(0.5, 1)
        .setDepth(6);

      // PNG stations are authored on square sheet cells; fit them to the same
      // 96x104 display rect the procedural texture used, so the sprite-rect
      // hitbox (x±48, top 104px above station.y) is unchanged in size.
      if (usePng && station.kind === 'skill') {
        sprite.setDisplaySize(96, 104);
        // Stage K visual correction: sheet cells carry transparent padding
        // below the object, which made the stations float above the floor.
        // Ground by OPAQUE bounds (visible bottom at the floor line), plus a
        // small deliberate overlap into the platform so the base presses in.
        // The rect hitbox moves with the sprite and stays a plain rectangle —
        // independent of the alpha silhouette.
        sprite.setY(station.y + this.textureBottomPad(idleKey) * 104 + GROUND_OVERLAP_PX);
      }

      // Layer 3 holograms: display 220px wide with the aspect preserved from
      // the extracted pair. Idle and hover are cropped to the SAME union rect,
      // so both textures have identical dimensions and swapping them can never
      // move the sprite vertically. Grounded by opaque bounds + 3px overlap so
      // the mechanical base rests on (slightly presses into) the floor.
      if (usePng && station.kind === 'project') {
        const src = this.textures.get(idleKey).getSourceImage() as { width: number; height: number } | null;
        if (src && src.width > 0) {
          const dispW = 220;
          const dispH = src.height * (dispW / src.width);
          sprite.setDisplaySize(dispW, dispH);
          sprite.setY(station.y + this.textureBottomPad(idleKey) * dispH + GROUND_OVERLAP_PX);
        }
      }

      /*
       * POINTER INTERACTION.
       *
       * Requirement 2: clicking a station opens its panel. Before this, the
       * stations were purely decorative — `setInteractive` was never called and
       * the scene had no pointer handler at all, so clicking a skill station did
       * nothing. That is the "decorative object that looks clickable but has no
       * action" the requirements explicitly rule out.
       *
       * The hit area is a plain rectangle over the whole sprite rather than the
       * texture's alpha silhouette. Two reasons:
       *
       *   - Pixel-accurate hit testing on canvas-generated art is fiddly and
       *     brittle to re-tune every time the art changes.
       *   - The requirement is that "the interaction target must be large enough to
       *     click". A box over the sprite is exactly that: it includes the
       *     transparent margins, so a click anywhere in the visible station's
       *     bounding box lands.
       *
       * The cursor changes on hover so the object reads as live before the click.
       */
      sprite.setInteractive({ useHandCursor: true });

      /*
       * Clicking a station opens it WITHOUT moving the player there.
       *
       * Deliberate: the requirement says clicking must open the panel, not that
       * clicking teleports the player. So this sets focus and emits directly
       * rather than routing through proximity, which would require the player to
       * be standing next to it.
       *
       * Guarded on `!panelOpen` so a click cannot stack a second panel on top of
       * an open one, and on `!transport.isTravelling` so a station cannot be
       * opened mid-journey.
       */
      sprite.on('pointerdown', () => {
        if (this.panelOpen || this.transport.isTravelling) return;
        this.focused = station;
        this.panelOpen = true;
        emitInteraction({
          id: station.id,
          world: this.world.id,
          kind: 'activate',
          payload: { stationKind: station.kind, chapter: station.chapter, via: 'pointer' },
        });
      });

      this.stations.push({ station, idleKey, litKey, sprite, lit: false, pngGrounded: usePng });
    }

    /**
     * ONE chapter label, for the chapter being played.
     *
     * The previous version looped over every chapter and drew a label for each,
     * placing them at `chapter.start + 40` in one shared coordinate space. That was
     * the clearest instance of the eager-construction problem: a visitor on the
     * cliff was shown the name of a chapter two thousand pixels away, which exists
     * only because all three chapters shared one world.
     *
     * Chapters are separate worlds now, so the only chapter that can be labelled is
     * the one being played, and its label sits near its own spawn.
     * On cliff, the entry artwork already carries "DATA WORLD / ENTRY" signage,
     * so we suppress the procedural chapter label to avoid duplication.
     * On skills, the label sat on the return portal's lower section (the
     * portal spans x 100..280 and the label was drawn at x=40), so it is
     * suppressed there too — the portal keeps its own destination signage.
     * On projects, the far-left return portal (art spans x 0..180) is the
     * chapter's landmark, and the label at x=40 would sit on top of it, so it
     * is suppressed there as well.
     */
    if (world.chapter !== 'cliff' && world.chapter !== 'skills' && world.chapter !== 'projects') {
      const labelKey = chapterLabelTexture(this, world.chapter, this.chapterLabel);
      this.add
        .image(40, this.world.groundY - ROBOT_FRAME_HEIGHT - 46, labelKey)
        .setOrigin(0, 0.5)
        .setDepth(5);
    }
  }

  /** Build each configured pipe and its skin. */
  private buildPipes(): void {
    for (const pipe of this.world.pipes) {
      const built = createDataPipeSkin(this, pipe, this.reducedMotion);
      this.pipeSkins.set(pipe.id, built);
    }

    // On cliff chapter, hide the procedural pipe visuals (entry + exit)
    // since they are replaced by the surface artwork (entry structure + skills portal).
    // Physics triggers and hover/proximity logic remain active.
    if (this.world.chapter === 'cliff') {
      const entryPipe = this.pipeSkins.get('cliff-entry');
      const exitPipe = this.pipeSkins.get('cliff-to-skills');
      entryPipe?.mouth.setVisible(false);
      exitPipe?.mouth.setVisible(false);
    }
    // Skills (Stage K): the animated portal artwork replaces both pipe
    // containers — same guard pattern as cliff, which also removes the entry
    // sign board that used to clip off the left world edge. The pipe triggers
    // are independent of container visibility and stay armed.
    if (this.world.chapter === 'skills') {
      this.pipeSkins.get('skills-entry')?.mouth.setVisible(false);
      this.pipeSkins.get('skills-to-projects')?.mouth.setVisible(false);
    }
    // Projects (Layer 3): the animated vortex artwork replaces the single
    // return pipe's procedural container — same guard pattern as cliff/skills.
    // The transport trigger is independent of container visibility and stays
    // armed, so the player can still walk into the visible portal to return.
    if (this.world.chapter === 'projects') {
      this.pipeSkins.get('projects-entry')?.mouth.setVisible(false);
    }
  }

  /**
   * The Phase 1 interaction foundation: a gem the player reaches by walking.
   *
   * Retained verbatim, including its world x of 480, because the Phase 1 suite
   * asserts that walking right emits `foundation-probe`. It now rests on the
   * Skills chapter's approach rather than floating over the ground line, and it
   * still emits the same event with the same id.
   */
  private buildInteractionProbe(): void {
    // Stage K (approved safe cleanup from the design plan): the probe belongs to
    // the cliff chapter only — it was rendering as a leftover in every chapter.
    if (this.world.chapter !== 'cliff') return;
    const gem = this.add.sprite(480, this.world.groundY - 6, 'gem').setDepth(5);
    gem.setData('interactive', true);
    gem.setData('interactionId', 'foundation-probe');

    this.physics.add.existing(gem);
    const gemBody = gem.body as Phaser.Physics.Arcade.Body;
    gemBody.setAllowGravity(false);
    gemBody.setImmovable(true);

    this.physics.add.overlap(this.player, gem, () => {
      emitInteraction({
        id: 'foundation-probe',
        world: this.world.id,
        kind: 'probe',
      });
    });
  }

  /**
   * Wire the scene to the twelve-phase transport.
   *
   * Every phase's work is a host callback here, so the ordering guarantee lives in
   * `pipeTransport.ts` and this file only says what each moment DOES.
   */
  private buildTransport(): void {
    this.transport = new PipeTransport(
      this,
      {
        lockPlayer: (locked) => {
          this.playerLocked = locked;
          if (locked) {
            const body = this.player.body as Phaser.Physics.Arcade.Body;
            body.setVelocity(0, 0);
            body.setAcceleration(0, 0);
            // The scene integrates x itself, so the intent must be cleared here too
            // or the player would keep walking during the transition.
            this.intentVelocityX = 0;
          }
        },

        announceChapter: (chapter) => this.announceChapter(chapter),

        /*
         * ENTERING / EMERGING — the visible pipe climb.
         *
         * This is the replacement for the old teleport. The player is moved a short,
         * visible distance toward the pipe mouth and shrunk as they go, so they are
         * seen climbing in rather than blinking out. The vertical offset pushes them
         * down into the mouth so the pipe's front rim (drawn above the player at a
         * higher depth) covers them — the sprite is not merely scaled, it is
         * geometrically inside the tube.
         */
        placePlayerForClimb: (x, y, t, climbing) => {
          if (!this.player) return;
          const sinking = climbing === 'in';
          /*
           * The robot strips already animate the sink / climb-out relative to the
           * ground line (frames are bottom-anchored, pipe art removed), so the
           * sprite itself is NOT scaled or offset here — playing the strip frame
           * indexed by the phase progress is the whole animation. Depth 2 keeps
           * the robot behind the pipe skin (depth 4) so it is occluded by the
           * rim while inside the mouth; `settle` restores depth 10.
           */
          const frames = sinking ? TUBE_ENTER_FRAMES : TUBE_EXIT_FRAMES;
          const idx = Math.min(frames.length - 1, Math.floor(t * frames.length));
          this.player.setTexture(`${PLAYER_TEXTURE_PREFIX}-${frames[idx]}`);
          this.player.setScale(1);
          this.player.setPosition(x, y);
          this.player.setDepth(2);
          // Physics is already locked; keep the body pinned so nothing drifts.
          const body = this.player.body as Phaser.Physics.Arcade.Body;
          body.reset(x, y);
        },

        /*
         * OCCLUDED — the gate.
         *
         * The player must be FULLY invisible before the screen goes black. Hiding
         * the sprite outright is deliberate: a tint leaves a silhouette, and a
         * silhouette is enough to read as "the character is still standing here".
         */
        occludePlayer: (occluded) => {
          if (!this.player) return;
          this.player.setVisible(!occluded);
          if (!occluded) {
            // Restore the normal resting appearance.
            this.player.setScale(1);
            this.player.setDepth(10);
            this.setAnimationFrame(this.currentChapter === undefined ? 'idleA' : 'idleA');
          }
        },

        /*
         * BLACKOUT — a fully opaque rectangle at depth 901, above every world
         * object and below nothing that matters.
         *
         * It is sized to the viewport and `setScrollFactor(0)`, so it covers
         * everything regardless of where the camera is. Alpha 1 of an opaque
         * colour, not a fade: the destination is built in the very next phase and
         * must not be visible while it is being constructed.
         */
        setBlackout: (on) => {
          this.travelOverlay?.setVisible(on).setAlpha(1);
          if (this.travelBand) this.travelBand.setVisible(on);
          if (on && this.travelBand) this.travelBand.tilePositionX = 0;
        },

        /*
         * BUILD — construct the destination chapter, behind the black.
         *
         * This is the ONLY place a destination is created. The scene is stopped and
         * reconfigured for the target chapter, so its terrain, stations and pipes
         * are built fresh and the outgoing chapter's objects are destroyed. Nothing
         * about the destination exists before this line, which is why it cannot be
         * seen before it should be.
         */
        /*
         * BUILD — construct the destination chapter, behind the black.
         *
         * This is the ONLY place a destination is created. Because the screen is
         * fully opaque, nothing about it can be seen existing.
         *
         * STOP AND START HAPPEN TOGETHER, HERE. An earlier version called
         * `scene.stop()` in `build` and `scene.start()` in the following `position`
         * phase. That deadlocked: `stop()` halts this scene's update loop
         * immediately, and advancing from `build` to `position` happens inside
         * `update()` — so the phase that would have restarted the scene could
         * never be reached. The scene stayed stopped and the journey froze with
         * the screen blacked out and the player invisible.
         *
         * Phaser processes `start()` on its next step, so the pair is safe: the
         * outgoing chapter's display list is torn down, the scene is immediately
         * marked for restart, and `create()` runs the destination's world.
         */
        buildDestination: (destination) => {
          this.pendingDestination = destination;
          /*
           * Ask the destination's own `create()` to place the camera before it
           * renders anything, so the reveal never shows a frame at the wrong
           * position — the classic "camera pans across the level as you arrive".
           */
          this.cameraTarget = { x: this.landingPointFor(chapterWorld(this.config, destination)).x, y: 0 };
          /*
           * `swappingChapter` tells `shutdown()` that this teardown is part of a
           * journey rather than the visitor leaving, so it must not cancel the
           * transport that is driving it.
           */
          this.swappingChapter = true;
          this.scene.stop();
          this.setConfig({ world: this.config, chapter: destination, reducedMotion: this.reducedMotion });
          this.scene.start();
          return this.world;
        },

        /*
         * POSITION — the camera was placed by the destination's `create()`.
         *
         * Kept as a phase because the ordering guarantee is the point: the camera
         * is in place before `reveal` lifts the black. The heavy lifting happened
         * during `build`; this phase exists so the sequence is explicit and
         * assertable rather than implied.
         */
        positionDestinationCamera: (world) => {
          const cam = this.cameras.main;
          cam.setBounds(0, 0, world.width, world.height);
          // setBounds sets `useBounds = true`, which re-arms Phaser's
          // zoom-broken clamp (see setupCamera) and would overwrite the
          // scroll updateCamera computes every frame — disable it again.
          cam.useBounds = false;
          if (this.cameraTarget) {
            this.snapCameraTo(this.cameraTarget.x, world.groundY - 100);
            cam.stopFollow();
          }
          this.lastFrameAt = this.time.now;
        },

        landingPointFor: (world) => this.landingPointFor(world),

        /*
         * ARRIVAL — restore the scene.
         *
         * The pipe art returns, the player is visible and at their resting scale,
         * and the camera resumes following.
         */
        onArrive: (_from, _destination, world) => {
          // The destination now exists and the travel is over, so there is no
          // longer a chapter pending construction, and the next scene teardown is
          // a genuine one that should cancel the transport normally.
          this.pendingDestination = null;
          this.swappingChapter = false;
          this.player.setVisible(true);
          this.player.setScale(1);
          this.player.setDepth(10);
          this.travelOverlay?.setVisible(false);
          this.travelBand?.setVisible(false);
          /*
           * Snap the camera to the player rather than letting it lerp in from the
           * previous chapter's position.
           *
           * NO `startFollow` HERE — MEASURED, NOT ASSUMED.
           *
           * `updateCamera` is the scene's ONLY follow implementation: `setupCamera`
           * deliberately calls `stopFollow()` because Phaser's follow+clamp clamps
           * the follow CENTRE without the half-viewport inset, so under zoom the view
           * hangs off the world edge. `updateCamera` then drives scroll every frame
           * with frame-rate-corrected easing, the vertical bias and the look-ahead.
           *
           * Calling `startFollow(player, true, 1, 1)` here re-enabled Phaser's
           * follow on top of that, and Phaser's follower runs in the camera's
           * preRender AFTER `updateCamera`, so it overwrote the scene's framing
           * every frame. The snap below uses `snapCameraTo` (the same clamp
           * `updateCamera` applies) instead of `centerOn`, which subtracts the
           * half-height in screen px and is off under zoom.
           */
          this.snapCameraTo(this.player.x, this.player.y - 100);
          // Re-seed the smoothed target from the snapped scroll so updateCamera
          // eases from the arrival position instead of flying in from zero.
          this.camTargetX = this.cameras.main.scrollX;
          this.camTargetY = this.cameras.main.scrollY;

          /*
           * RESTORE EVERY PIPE IN THE CHAPTER — this used to hide all but one.
           *
           * THE BUG THIS FIXES, measured rather than inferred.
           *
           * The previous line here was:
           *     for (const [id, built] of this.pipeSkins) {
           *       built.mouth.setVisible(id === entryId);
           *     }
           * which made ONLY the destination chapter's entry pipe visible and left
           * every other pipe in the map hidden — including the exit pipe of the
           * chapter the player had just arrived in.
           *
           * The visible symptom was reported as "the skills -> projects pipe is
           * not visible but we can still enter project section", and it was
           * precisely that. Measured on arrival in Skills at 1917x933:
           *     skills-to-projects   container.visible === false
           *   while `pipeNearX` still armed it, so walking right teleported the
           *   player into Projects with nothing on screen to have walked into. The
           *   tube had to be INVISIBLE and still fully functional — which is the
           *   worst combination available, because the player cannot see where
           *   they are going and has no cue that the transition is real.
           *
           * WHY IT WAS WRITTEN THAT WAY. The intent was "hide the pipe the player
           * just travelled through, since they have left it". But that intent is
           * wrong on arrival, for two separate reasons:
           *
           *   1. The pipe just travelled through is in the PREVIOUS chapter, and
           *      that chapter's display list was destroyed by `scene.stop()`. Its
           *      skins are gone; there is nothing here to hide.
           *   2. The pipe worth hiding in the DESTINATION is its own entry pipe —
           *      because the player climbs out of it and then walks away from it.
           *      Hiding it is defensible. Hiding the EXIT pipe is not: it is the
           *      only way onward, and hiding it removes the entire reason to keep
           *      walking.
           *
           * So the correct rule is per-chapter, not per-arrival: show the exit
           * pipe whenever the chapter HAS one, and show the entry pipe only when
           * it is the pipe the player actually emerged from. Every other skin in
           * the map belongs to a chapter that is not on screen and is asserted
           * hidden, because a stopped scene must leave nothing renderable behind.
           */
          /*
           * SHOW EVERY PIPE THAT BELONGS TO THIS CHAPTER.
           *
           * This was `setVisible(id === world.entryPipe.id)`, which made ONLY the
           * entry pipe visible and hid the exit pipe. Measured on arrival in
           * Skills: the exit pipe (skills-to-projects, the ONLY way forward) was
           * `visible = false` while still armed, so walking right teleported the
           * player into Projects with nothing on screen to have walked into.
           *
           * The correct rule is per-CHAPTER, not per-arrival: a chapter's own
           * pipes are exactly the ones its geometry contains, so every skin in
           * `world.pipes` is shown and every other skin (belonging to a chapter
           * whose display list `scene.stop()` already destroyed) stays hidden.
           */
          const chapterPipeIds = new Set(world.pipes.map((p) => p.id));

          for (const [id, built] of this.pipeSkins) {
            /*
             * On cliff the procedural entry/exit pipe visuals are replaced by the
             * approved surface artwork (entry structure + skills portal), so they
             * must stay hidden here too — not just in buildPipes. This loop runs
             * on every arrival, so without this guard the artwork-hidden pipes
             * reappeared after each chapter return.
             */
            const hiddenBySurfaceArtwork =
              world.chapter === 'cliff' && (id === 'cliff-entry' || id === 'cliff-to-skills');
            const hiddenBySkillsArtwork =
              world.chapter === 'skills' && (id === 'skills-entry' || id === 'skills-to-projects');
            // Layer 3: the projects chapter's single pipe is likewise replaced
            // by the animated return-portal artwork, so it must stay hidden
            // here too — this loop runs on every arrival.
            const hiddenByProjectsArtwork =
              world.chapter === 'projects' && id === 'projects-entry';
            built.mouth.setVisible(
              chapterPipeIds.has(id) &&
                !hiddenBySurfaceArtwork &&
                !hiddenBySkillsArtwork &&
                !hiddenByProjectsArtwork,
            );
            /*
             * NOT `built.setActive(false)` here — measured, and it is a trap.
             *
             * `pipeSkins` is never cleared, so it accumulates every pipe from every
             * chapter the visitor has visited. An earlier version of this loop also
             * called `setActive(false)`, which does `mouthImage.setTexture(...)` on a
             * skin belonging to a scene that `scene.stop()` has already destroyed.
             * That threw `TypeError: Cannot read properties of undefined (reading
             * 'sys')` out of Phaser's `Image.setTexture`.
             *
             * The damage was severe and silent:
             *   - `onArrive` is the LAST thing `pipeTransport`'s `settle` phase calls
             *     before `lockPlayer(false)`, so the throw skipped the unlock and the
             *     player stayed frozen at spawn x=144 with the camera framed at
             *     view=[275..825] — off screen, unable to move, no console-free error
             *     visible in the UI.
             *   - the phase log still ended at `settle` with `swappingChapter false`,
             *     so every existing "travel completed" assertion passed while the game
             *     was permanently stuck.
             *
             * The lit/unlit swap already resets itself in the skin's own
             * `conduitEnd`, which is called on the only pipe that actually ran a
             * travel. A pipe that was never travelled through was never lit, so it
             * needs no reset. `mouth.setVisible` on a destroyed scene is safe: it is
             * the same call this loop already made for years without incident.
             */
          }
        },
      },
      null,
    );
  }

  /**
   * Build the full-viewport conduit overlay used during pipe travel.
   *
   * This is a screen-space element rather than world-space art, because the point
   * is to cover EVERYTHING: it must hide the player at the instant of the
   * teleport, so it cannot live in the world where the camera might not cover it.
   *
   * It scrolls its own `tilePositionX` every frame in `updatePipes`, giving the
   * "moving through a conduit" read that the previous single-pipe-sized band
   * could not — that band was only as wide as the pipe, so at 2x zoom it covered
   * a fraction of the screen and the world stayed plainly visible behind it.
   */
  private buildTravelOverlay(): void {
    const cam = this.cameras.main;
    const w = Math.ceil(cam.width);
    const h = Math.ceil(cam.height);

    const key = 'data-travel-conduit';
    if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, 256, 256);
      if (texture) {
        const ctx = texture.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = DATA_PALETTE.voidBlack;
        ctx.fillRect(0, 0, 256, 256);

    /*
         * Concentric conduit rings receding into the pipe, drawn as nested
         * rectangles. Square, not circular, to match every other pipe in the game:
         * the whole art language is squared-off industrial, and a circle here
         * would be the one smooth shape in a pixel world.
         */
        const rings = [232, 196, 162, 130, 100, 74, 52, 34];
        rings.forEach((size, i) => {
          const off = (256 - size) / 2;
          ctx.fillStyle = i % 2 === 0 ? DATA_PALETTE.structureMid : DATA_PALETTE.structureDark;
          ctx.fillRect(off, off, size, size);
          // Lit inner edge, so each ring reads as a separate collar in depth.
          ctx.fillStyle = DATA_PALETTE.metal;
          ctx.fillRect(off, off, size, 1);
          ctx.fillRect(off, off, 1, size);
          ctx.fillStyle = DATA_PALETTE.voidBlack;
          ctx.fillRect(off + size - 1, off, 1, size);
        });

        // Flow streaks running toward the vanishing point.
        for (let i = 0; i < 26; i += 1) {
          const s = (i * 37) % 256;
          const len = 12 + ((i * 13) % 40);
          ctx.fillStyle = i % 3 === 0 ? DATA_PALETTE.signal : DATA_PALETTE.signalDim;
          ctx.fillRect(s, 0, 1, len);
          ctx.fillRect(256 - s, 256 - len, 1, len);
        }
        texture.refresh();
      }
    }

    /*
     * `setScrollFactor(0)` pins it to the camera, so it stays full-screen no
     * matter where the camera is. Depth 900 is above every world object (the
     * player is 10, stations 6, pipes 4) and below nothing that matters.
     */
    this.travelBand = this.add
      .tileSprite(0, 0, w, h, key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(900)
      .setVisible(false);
    this.travelOverlay = this.add
      .rectangle(0, 0, w, h, colour('#04060a'), 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(901)
      .setVisible(false);
  }

  /**
   * Where the player stands in the DESTINATION chapter after travelling there.
   *
   * There is no landing maths any more. Each chapter is its own world with its
   * own spawn, and that spawn is already placed just clear of the entry pipe, so
   * the answer is simply "the destination's spawn". The old version searched the
   * shared coordinate space for the destination's `start` and added an offset --
   * which is what made arrival a 2000px coordinate jump.
   *
   * The destination world is NOT built here. The transport builds it during its
   * blackout phase and calls this with the already-built chapter, so nothing
   * exists on screen before the screen is opaque.
   */
  private landingPointFor(chapter: ChapterWorld): { x: number; y: number } {
    return { x: chapter.spawn.x, y: chapter.groundY };
  }

  /** Emit a chapter change to React. */
  private announceChapter(chapter: ChapterId): void {
    if (this.currentChapter === chapter) return;
    this.currentChapter = chapter;
    emitInteraction({
      id: chapter,
      world: this.world.id,
      kind: 'chapter',
      payload: { chapter },
    });
  }

  /**
   * Frame the world: 2x zoom, deadzone, frame-rate-corrected smoothing, look-ahead.
   *
   * WHY ZOOM MATTERS MORE THAN ANY OTHER SINGLE VALUE HERE
   *
   * At 1x the viewport showed 522 of the old 640 world px, so the entire facility
   * was visible at once and every structure read as small. Measured on screen: a
   * 20px conduit occupied 3.8% of viewport height and the 48px player 9.2% — the
   * art was correct and the visitor was simply standing too far away. At 2x the
   * camera shows ~261 world px, the player fills 18.4% and conduits read as pipes.
   *
   * `setZoom` (not CSS) is used deliberately. The engine runs `Scale.RESIZE` with
   * `pixelArt: true`, and Phaser owns the canvas element's width/height/style — CSS
   * scaling it would fight the ScaleManager. Camera zoom also converts pointer
   * input to world space automatically, which CSS would not.
   *
   * SMOOTHING IS FRAME-RATE CORRECTED, NOT `lerp(a, b, 0.12)`
   *
   * `cam.setLerp(0.12)` is a per-frame constant: it means the same thing at 27fps
   * and at 144fps only by accident, and the smoothness visibly changes between
   * machines. The exponential form below is `1 - exp(-rate * dt)`, which converges
   * at the same rate regardless of delta. Phaser's `startFollow` lerp is still set
   * to 1.0 (snap-free pass-through) and the scene drives the follow offset itself
   * in `updateCamera`, which runs after physics so the camera never lags a frame
   * behind the jump.
   */
  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setZoom(this.zoomForViewport(cam.height));
    // Integer zoom only; `setRoundPixels` keeps the 2x2 pixel blocks aligned.
    cam.setRoundPixels(true);
    /*
     * Phaser's camera matrix is `screen = zoom * (world - scroll) + originPx *
     * (1 - zoom)`. With the default origin (0.5, 0.5) the `originPx * (1 - zoom)`
     * term is non-zero at zoom != 1 (at zoom 2 on a 900px-tall canvas it shifts
     * the view down by height/2 = 450 screen px), so `scrollY` no longer means
     * "top of the visible world" — measured: scrollY=155 rendered the ground
     * (world y=560) at 40% of the viewport instead of 90%. Origin (0, 0) removes
     * the term, making `scroll` exactly the view's top-left in world units at any
     * zoom, which is what `updateCamera`'s clamps and the diagnostics probe
     * already assume. The camera never rotates, so the origin change is safe.
     */
    cam.setOrigin(0, 0);

    /*
     * Clamp the camera so it can never frame below `groundY + floorMargin`, which
     * would fill the viewport with the ground slab and hide the facility. Bounds
     * are the mechanism for this: they clamp `scroll` in world units, independent
     * of zoom, so one clamp works at any zoom level.
     */
    const world = this.world;
    /*
     * NO `setBounds`, NO `startFollow`, NO `setFollowOffset`.
     *
     * Phaser's own follow+clamp is correct only at zoom 1. Under zoom, the
     * measured result was `scrollX = -275` with the player standing at world x=120
     * — that is exactly `-visibleWidth/2`, i.e. the camera centre pinned to x=0
     * while the viewport hung off the left edge of the world. Phaser clamps the
     * follow CENTRE against the bounds rect without adding the half-viewport inset
     * that keeps the VIEW inside, so the left edge of the world shows as void.
     *
     * Rather than fight that, the scene computes and sets `scroll` directly in
     * `updateCamera`. The clamp is then explicit, correct at any zoom, and
     * assertable: `scroll` is guaranteed to stay within
     * `[0, worldWidth - visibleWidth]`.
     */
    cam.stopFollow();
    /*
     * Phaser's OWN bounds clamp is WRONG under zoom: `clampX` mixes world-unit
     * `displayWidth` (width / zoom) with screen-px `width`, so at zoom 2 it
     * clamps scroll into `[-viewW/2, worldW - 3*viewW/2]` instead of
     * `[0, worldW - viewW]`. Measured full-screen at 1280x800: scrollX forced to
     * -60 with the player at x=120 — void left of the world edge. `updateCamera`
     * clamps explicitly and correctly at any zoom, so the engine's clamp is
     * disabled here. `create()` calls `setBounds` earlier in the same boot (which
     * sets `useBounds = true`); this runs after it, before the first frame.
     */
    cam.useBounds = false;
    this.camTargetX = 0;
    this.camTargetY = 0;
    void world;
  }

  /**
   * Choose the camera zoom for a given viewport height.
   *
   * `CAMERA.zoom` is the target, but it is an UPPER BOUND rather than a constant,
   * because the authored environment occupies a fixed band of world height
   * (`CONTENT_BAND`, from the ceiling structure down to the floor) and a short
   * window cannot show it all.
   *
   * At the recording viewport (1918x980, canvas 1098x567) zoom 2 gives a 284px view
   * and the 280px band fits. At 1280x720 the canvas is only 416px tall, where
   * zoom 2 would show 208px — the top of the band would be cut off and the pipes
   * would leave the frame. Clamping zoom to `viewportHeight / CONTENT_BAND` keeps
   * the whole facility on screen on any display, while a large monitor still gets
   * the full 2x and the large character.
   *
   * Rounded to a multiple of 0.25 because `pixelArt: true` is set: a fractional
   * zoom resamples the bitmap and smears the pixel grid the art depends on.
   */
  private zoomForViewport(height: number): number {
    const maxByHeight = height / CONTENT_BAND;
    const zoom = Math.min(CAMERA.zoom, maxByHeight);
    return Math.max(1, Math.floor(zoom * 4) / 4);
  }

  /**
   * Snap the camera so world point (x, y) sits at the same framing `updateCamera`
   * would settle on (no look-ahead), and re-seed the smoothed target so the next
   * frames ease from here instead of flying in.
   *
   * NOT `cam.centerOn(x, y)`: `centerOnY` subtracts `height * 0.5` in SCREEN
   * pixels without dividing by zoom, so at zoom 2 it is off by `height/2 *
   * (1 - 1/zoom)` world units. With origin (0, 0) the scroll IS the view top-left,
   * so the snap is the same clamp `updateCamera` applies.
   */
  private snapCameraTo(x: number, y: number): void {
    const cam = this.cameras.main;
    const zoom = cam.zoom || 1;
    const world = this.world;
    const viewW = cam.width / zoom;
    const viewH = cam.height / zoom;
    const focusY = y - viewH * CAMERA.verticalBiasRatio;
    const scrollX = Phaser.Math.Clamp(x - viewW / 2, 0, Math.max(0, world.width - viewW));
    const scrollY = Phaser.Math.Clamp(focusY - viewH / 2, 0, Math.max(0, world.height - viewH));
    cam.setScroll(scrollX, scrollY);
    this.camTargetX = scrollX;
    this.camTargetY = scrollY;
  }

  /**
   * Drive the follow offset with frame-rate-independent smoothing and look-ahead.
   *
   * Runs every frame from `update` AFTER movement and physics, so the camera reads
   * the resolved position and never lags a jump by one frame.
   *
   * Look-ahead eases toward the direction the player is travelling rather than
   * snapping, and fades out below `lookAheadMinSpeed` so a stationary player sits
   * dead centre instead of permanently off to one side.
   */
  private updateCamera(dtSeconds: number): void {
    if (!this.player) return;

    /*
     * Reduced motion snaps. Smoothing IS the motion here, so under
     * `prefers-reduced-motion` the camera tracks the player exactly rather than
     * gliding after them — the same rule Phase 1 applied to `setLerp`.
     */
    if (this.reducedMotion) {
      this.camTargetX = this.player.x;
      this.camTargetY = this.player.y;
      this.lookAheadX = 0;
    }

    const cam = this.cameras.main;
    const zoom = cam.zoom || 1;

    /*
     * The area the camera can actually see, in world units. `worldView` is already
     * zoom-adjusted, but it is a Rectangle object Phaser mutates each frame, so it
     * is read once here rather than retained.
     */
    const viewW = cam.width / zoom;
    const viewH = cam.height / zoom;
    const world = this.world;

    const velocityX = this.intentVelocityX;
    const wanted = Math.abs(velocityX) < CAMERA.lookAheadMinSpeed
      ? 0
      : Math.sign(velocityX) * CAMERA.lookAhead;

    /*
     * `1 - exp(-rate * dt)` rather than `1 - k`. With `dt` in seconds this
     * converges at the same rate at 27fps and at 144fps; a fixed per-frame factor
     * would make the camera feel different on every machine.
     */
    const ease = 1 - Math.exp(-CAMERA.followRate * dtSeconds);
    this.lookAheadX += (wanted - this.lookAheadX) * ease;

    /*
     * Where the camera wants to be: centred on the player, led in the direction of
     * travel, and lifted so the player's feet sit below centre rather than on it.
     *
     * The lift is a FRACTION of the view height (see `CAMERA.verticalBiasRatio`
     * for the two off-screen bugs a fixed pixel value caused), so the framing holds
     * at any zoom and any window size instead of failing on short viewports.
     */
    const focusX = this.player.x + this.lookAheadX;
    const focusY = this.player.y - viewH * CAMERA.verticalBiasRatio;

    /*
     * THE CLAMP. A view of `viewW` inside `[0, worldWidth]` may only scroll over
     * `[0, worldWidth - viewW]`; anything less shows void past the world edge, and
     * Phase 1 asserts exactly that (`camScrollX >= 0` and `<= worldWidth`).
     *
     * Vertical: the view may scroll over the FULL world height. The lower bound
     * is `world.height - viewH`, so the camera can frame all the way to the
     * bottom of the world. Combined with `verticalBiasRatio` 0.40 this puts the
     * ground line at ~90% of the viewport with the sub-floor lip below it,
     * instead of the old `groundY + floorMargin` clamp that cut the frame off
     * just under the floor and pinned the ground to ~98% of the frame.
     */
    const maxScrollX = Math.max(0, world.width - viewW);
    const maxScrollY = Math.max(0, world.height - viewH);

    let wantedX = focusX - viewW / 2;
    let wantedY = focusY - viewH / 2;

    wantedX = Phaser.Math.Clamp(wantedX, 0, maxScrollX);
    wantedY = Phaser.Math.Clamp(wantedY, 0, maxScrollY);

    /*
     * Smooth toward the target, then clamp AGAIN. Clamping before smoothing is not
     * enough: the eased value can overshoot back outside the range when the player
     * runs into a wall at the world edge, so the final value is re-clamped.
     */
    this.camTargetX += (wantedX - this.camTargetX) * ease;
    this.camTargetY += (wantedY - this.camTargetY) * ease;
    cam.setScroll(
      Phaser.Math.Clamp(this.camTargetX, 0, maxScrollX),
      Phaser.Math.Clamp(this.camTargetY, 0, maxScrollY)
    );
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    /*
     * Start tracking held keys before anything can swap the chapter, so a key
     * held during `approach` is still known when `create()` runs again after
     * `build`. Removed in `shutdown()`.
     */
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.trackHeldDown);
      window.addEventListener('keyup', this.trackHeldUp);
      window.addEventListener('blur', this.clearHeldOnBlur);
    }

    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    /*
     * RE-ADOPT KEYS THE VISITOR IS STILL HOLDING.
     *
     * `keyboard shutdown` in Phaser DELETES every key the plugin created, and the
     * `build` phase reaches `create()` again by calling `scene.stop()` then
     * `scene.start()`. So on arrival the player has brand-new Key objects with
     * `isDown === false`.
     *
     * That is normally invisible, because a key the visitor pressed AFTER arrival
     * fires a fresh `keydown` and works fine. It breaks exactly one case: a key
     * held ACROSS the transition. A human walking right into a tube keeps holding
     * right, and the keyboard produces no new `keydown` — so `isDown` stays false
     * and the player lands unable to move.
     *
     * MEASURED: walking right from START into SKILLS, `keyD` was `true` at t=4.0s
     * and `false` from t=12.3s onward, with the player pinned at x=144 through
     * t=27.0s and `intentVelocityX` stuck at 0 while the physical key was still
     * held.
     *
     * So the state is restored here from the live DOM, which is the authority on
     * what the keyboard is actually doing — Phaser's registry has just been
     * rebuilt and knows nothing. `KeyboardManager.getModifier`/the manager's own
     * tracking cannot help: the manager is per-scene too.
     *
     * Guarded on the document actually having focus, so a backgrounded tab does
     * not leave the player walking on its own.
     */
    if (typeof document !== 'undefined' && document.hasFocus?.()) {
      const held = new Set<string>();
      // `KeyboardEvent.code` is layout-independent, unlike `key`.
      const TRACKED = new Set([
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Space',
        'ShiftLeft',
        'ShiftRight',
        'KeyA',
        'KeyD',
        'KeyW',
        'Enter',
        'Escape',
      ]);
      /*
       * The only source that knows what is held is `heldAtSwap`, which this scene
       * fills continuously from real keydown/keyup events. Phaser's own keys were
       * deleted by the plugin shutdown and the replacements are all `false` by
       * definition, so they cannot answer the question.
       */
      for (const code of this.heldAtSwap) if (TRACKED.has(code)) held.add(code);

      if (held.has('ArrowLeft')) this.cursors.left.isDown = true;
      if (held.has('ArrowRight')) this.cursors.right.isDown = true;
      if (held.has('ArrowUp')) this.cursors.up.isDown = true;
      if (held.has('ArrowDown')) this.cursors.down.isDown = true;
      if (held.has('Space')) this.cursors.space.isDown = true;
      if (held.has('ShiftLeft') || held.has('ShiftRight')) this.cursors.shift.isDown = true;
      if (held.has('KeyA')) this.keyA.isDown = true;
      if (held.has('KeyD')) this.keyD.isDown = true;
      if (held.has('KeyW')) this.keyW.isDown = true;
      if (held.has('Enter')) this.keyEnter.isDown = true;
      if (held.has('Escape')) this.keyEscape.isDown = true;
    }
    // Enter opens the focused station; Escape closes an open panel. Both are
    // Phase 2 additions and are bound here rather than in React so the canvas
    // reacts even when focus is inside the mirror.
    this.keyEnter = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyEscape = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    const jumpKeys = [this.cursors.up, this.cursors.space, this.keyW];
    for (const key of jumpKeys) {
      key.on('down', () => {
        // Buffer the press rather than acting on it immediately, so a jump
        // pressed just before landing still fires.
        this.jumpPressedAt = this.time.now;
      });
    }
  }

  /** Swap the player's texture to a named frame. */
  private setAnimationFrame(name: string): void {
    if (this.player?.texture.key === `${PLAYER_TEXTURE_PREFIX}-${name}`) return;
    if (this.textures.exists(`${PLAYER_TEXTURE_PREFIX}-${name}`)) {
      this.player.setTexture(`${PLAYER_TEXTURE_PREFIX}-${name}`);
    }
  }

  /**
   * Advance the character's animation from its movement state.
   *
   * Walk frames cycle only while actually moving; idle alternates a single-pixel
   * breathing pair. Under reduced motion the idle loop is skipped, so the
   * character stands still — the player is still fully controllable.
   */
  private updateAnimation(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // Horizontal motion is integrated manually (intentVelocityX); Arcade's
    // body.velocity.x is zeroed every frame, so it can never drive the walk cycle.
    const moving = Math.abs(this.intentVelocityX) > 8;
    const airborne = !body.onFloor();

    if (airborne) {
      this.setAnimationFrame(body.velocity.y < 0 ? 'jump' : 'fall');
      return;
    }

    if (!moving) {
      // Breathing: alternate idleA / idleB on a slow timer. Frozen under
      // reduced motion, where a still character is the expected result.
      if (this.reducedMotion) {
        this.setAnimationFrame('idleA');
        return;
      }
      const phase = Math.floor(this.time.now / 620) % 2;
      this.setAnimationFrame(phase === 0 ? 'idleA' : 'idleB');
      return;
    }

    // Walk cycle, paced by speed so a slower walk does not look like fast steps.
    const frame = Math.floor(this.time.now / 90) % WALK_FRAMES.length;
    this.setAnimationFrame(WALK_FRAMES[frame] ?? 'walkA');
  }

  /**
   * Find the station within interaction range and mirror it both ways.
   *
   * The nearest station wins when two overlap, so the highlight always matches
   * what Enter would open. Lit state is applied by swapping textures, and only
   * when it actually changed — otherwise a stationary player would re-set the
   * same texture every frame.
   */
  private updateStations(): void {
    if (this.panelOpen || this.transport.isTravelling) return;

    let nearest: WorldStation | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const view of this.stations) {
      const distance = Math.abs(view.station.x - this.player.x);
      const inRange = distance <= INTERACT_RANGE;
      view.sprite.setData('inRange', inRange);

      if (inRange && distance < nearestDistance) {
        nearest = view.station;
        nearestDistance = distance;
      }
    }

    // Apply lit state to every station whose state changed.
    for (const view of this.stations) {
      const shouldLight = nearest !== null && view.station.id === nearest.id;
      if (view.lit === shouldLight) continue;
      view.lit = shouldLight;
      view.sprite.setTexture(shouldLight ? view.litKey : view.idleKey);
      // Re-apply the ground offset for the swapped texture (lit cells can have
      // a slightly different transparent bottom pad than idle cells).
      if (view.pngGrounded) {
        const padKey = shouldLight ? view.litKey : view.idleKey;
        view.sprite.setY(view.station.y + this.textureBottomPad(padKey) * view.sprite.displayHeight + GROUND_OVERLAP_PX);
      }
    }

    if (nearest?.id === this.focused?.id) return;

    this.focused = nearest;
    if (nearest) {
      emitInteraction({
        id: nearest.id,
        world: this.world.id,
        kind: 'proximity',
        payload: {
          stationKind: nearest.kind,
          chapter: nearest.chapter,
          inRange: true,
        },
      });
    }
  }

  /**
   * Arm and fire the pipe the player is standing in.
   *
   * The trigger requires the player to be within range AND airborne or moving
   * toward it, which is what makes "walk up and step in" the natural action while
   * still firing when a visitor simply walks across the mouth. It fires once: the
   * armed pipe is cleared the moment the transport starts, so standing in the
   * mouth cannot queue a second journey.
   */
  private updatePipes(): void {
    if (this.panelOpen) return;

    // The transport owns progression; give it the skin for the pipe in transit.
    if (this.transport.isTravelling) {

      /*
       * Scroll the conduit band. This runs OUTSIDE the transport so it keeps
       * moving through the whole transition rather than only while the pipe's own
       * narrow band animates, and it is the same no-allocation path the scene uses
       * elsewhere: one property write per frame, no array, no closure.
       *
       * 14px/frame is deliberately frame-rate independent in EFFECT rather than in
       * code — the band is decorative, so it is scaled by delta below to keep the
       * same perceived speed on a 27fps software rasteriser and a 144fps display.
       */
      if (this.travelBand?.visible) {
        this.travelBand.tilePositionX += this.travelBandSpeed * this.lastDeltaMs;
      }

      this.transport.update();
      return;
    }

    // Idle: the overlay must be fully gone, or the world stays covered.
    this.travelOverlay?.setVisible(false);
    this.travelBand?.setVisible(false);

    const near = pipeNearX(this.world, this.player.x);

    // Leaving the trigger zone re-arms nothing but clears the armed pipe, so a
    // player who steps away and comes back can travel again.
    if (near === undefined) {
      this.armedPipe = null;
      return;
    }

    // Only arm when the player is actually at the mouth, not merely walking past
    // it from a distance: require the player to be within the mouth's width.
    if (Math.abs(this.player.x - near.x) > PIPE_HALF_WIDTH) {
      return;
    }

    if (this.armedPipe !== near) {
      this.armedPipe = near;
      // Fire on the next frame so a player who merely brushes the edge does not
      // travel instantly; the arm step gives a one-frame confirm.
      this.time.delayedCall(0, () => {
        if (this.transport.isTravelling) return;
        /*
         * Resolve the destination from the PIPE, not from `near.destination`.
         *
         * An entry pipe's `destination` is its OWN chapter — it records where the
         * player arrived from. Using it directly would make travelling out of that
         * pipe rebuild the chapter the player is already standing in, so reverse
         * travel would be a no-op. `chapterViaPipe` handles both cases: an exit
         * pipe leads onward, and an entry pipe leads back to the previous chapter.
         */
        const destination = chapterViaPipe(this.config, this.world.chapter, near.id);
        if (!destination) return;
        // The player's current position, so `entering` interpolates from where
        // they actually stand rather than snapping to the mouth.
        this.transport.start(near, destination, this.player.x, this.player.y);
      });
    }
  }

  /** Handle Enter / Escape. */
  private updateInteractionKeys(): void {
    // Escape always closes, even mid-transition-free state, so a visitor is
    // never trapped in a panel.
    if (this.keyEscape?.isDown) {
      if (this.panelOpen) {
        this.panelOpen = false;
        emitInteraction({ id: 'panel', world: this.world.id, kind: 'close' });
      }
      return;
    }

    if (!this.focused || this.panelOpen || this.transport.isTravelling) return;

    if (this.keyEnter?.isDown) {
      this.panelOpen = true;
      emitInteraction({
        id: this.focused.id,
        world: this.world.id,
        kind: 'activate',
        payload: { stationKind: this.focused.kind, chapter: this.focused.chapter },
      });
    }
  }

  update(): void {
    const player = this.player;
    if (!player?.body) return;
    const body = player.body as Phaser.Physics.Arcade.Body;
    const now = this.time.now;

    // Pipes and panels first: a transport in progress must suppress movement and
    // station focus for the duration, so nothing fights it for the player.
    this.updatePipes();
    if (this.playerLocked) {
      /*
       * Keep the frame clock ticking even while locked. Returning without it would
       * make the first frame after the transport apply the WHOLE travel duration
       * as one delta — the player would be flung across the chapter on arrival.
       * The transport owns the sprite during a ride (placePlayerForClimb plays the
       * tube strip), so updateAnimation must NOT run here — it would overwrite the
       * climb frame with idle on the same tick.
       */
      this.lastFrameAt = now;
      return;
    }

    this.updateInteractionKeys();

    const left = this.cursors?.left?.isDown || this.keyA?.isDown;
    const right = this.cursors?.right?.isDown || this.keyD?.isDown;
    // A panel is open: the world is paused for input, so the visitor can read.
    const inputActive = !this.panelOpen;

    // Grounded state, used for coyote time and for the jump itself.
    const grounded = body.onFloor();
    if (grounded) this.lastGroundedAt = now;

    /* --- Horizontal movement ------------------------------------------------
     *
     * Acceleration and drag are applied to the body as before, but the resulting
     * VELOCITY is clamped to the configured speed and the position is advanced
     * from the real elapsed time.
     *
     * Why not just let Arcade integrate it, as Phase 1 did? Because Arcade's
     * integration is per fixed step, and a machine that drops frames falls behind
     * wall-clock time. Measured here: a 90px/s walk covered 471px in 8s instead of
     * 720px, because the page was rendering at 27fps under a software rasteriser.
     * A jump then peaked lower, the walk took longer, and the pipe trigger arrived
     * late — the game silently became a different game on a slow machine.
     *
     * Advancing x by `velocity * dt` keeps the px/s figures honest at any frame
     * rate. Vertical motion is LEFT to Arcade: gravity is already expressed in
     * px/s^2, the jump arc is defined by it, and the Phase 1 suite asserts the
     * exact apex, so changing that would change gameplay rather than fix a bug.
     * The horizontal speed clamp below keeps `velocity.x` in px/s, which is the
     * unit the jump is tuned against.
     */
    const dtSeconds = Math.min(0.1, (now - this.lastFrameAt) / 1000);
    this.lastDeltaMs = dtSeconds * 1000;

    /*
     * Horizontal intent, accumulated from real elapsed time.
     *
     * Acceleration and drag are in px/s^2 and speed in px/s, so the ramp is
     * `a * dt`. Using the real dt is what makes the walk exactly 90px/s on a
     * machine rendering at 27fps as well as at 60 — Arcade would instead
     * integrate per fixed step and fall behind wall-clock time, which measured
     * 64px/s here and silently changed every distance-based behaviour.
     */
    const rate = (grounded ? 1 : PLAYER.airControl) * dtSeconds;
    if (inputActive && left && !right) {
      this.intentVelocityX -= PLAYER.acceleration * rate;
      player.setFlipX(true);
    } else if (inputActive && right && !left) {
      this.intentVelocityX += PLAYER.acceleration * rate;
      player.setFlipX(false);
    } else {
      // No input: drag brings the player to a stop rather than zeroing velocity,
      // which would look like hitting a wall.
      const drop = PLAYER.drag * rate;
      this.intentVelocityX =
        Math.abs(this.intentVelocityX) <= drop ? 0 : this.intentVelocityX - Math.sign(this.intentVelocityX) * drop;
    }

    // Clamp to the configured walk speed in both directions.
    this.intentVelocityX = Math.max(
      -PLAYER.speed,
      Math.min(PLAYER.speed, this.intentVelocityX)
    );

    /*
     * Arcade must not integrate horizontally, or the position is advanced twice —
     * measured at 145px/s for a 90px/s walk when both contributed.
     *
     * `setVelocityX(0)` zeroes only the horizontal component, leaving gravity and
     * the jump arc to Arcade, which is what the Phase 1 apex assertions depend on.
     */
    body.setVelocityX(0);

    /*
     * Advance horizontally by the REAL elapsed time, and let Arcade do no
     * horizontal integration at all.
     *
     * Arcade's own x-integration is switched off (`body.setAllowGravity(false)`
     * is NOT used for this — see `setHorizontalIntegration`), and the body's
     * horizontal velocity is zeroed every frame after it is read. Velocity is kept
     * only as the DIRECTION and MAGNITUDE of intent, so the probe still reports a
     * meaningful `velocityX` and the acceleration curve is still visible.
     *
     * Doing it this way rather than adding a correction on top is what makes the
     * figure exact. An earlier version advanced x in addition to Arcade's own
     * integration and measured 145px/s for a 90px/s walk — two integrations, two
     * contributions.
     */
    if (!this.playerLocked) {
      player.x += this.intentVelocityX * dtSeconds;
    }
    this.lastFrameAt = now;

    // --- Jump: coyote time + input buffer ---
    const canCoyote = now - this.lastGroundedAt <= PLAYER.coyoteMs;
    const buffered = now - this.jumpPressedAt <= PLAYER.jumpBufferMs;
    if (inputActive && buffered && canCoyote) {
      body.setVelocityY(-PLAYER.jumpVelocity);
      this.jumpPressedAt = -Infinity;
      this.lastGroundedAt = -Infinity;
    }

    // --- Keep the player inside the world even if bounds collide fails ---
    const w = this.world;
    if (player.x < PLAYER.size / 2) player.x = PLAYER.size / 2;
    if (player.x > w.width - PLAYER.size / 2) player.x = w.width - PLAYER.size / 2;
    if (player.y > w.height) player.y = w.height;

    this.updateAnimation();
    this.updateStations();

    /* Neon glow + shadow track the player every frame (created in buildPlayer). */
    if (this.playerGlow) {
      this.playerGlow.setPosition(player.x, player.y - ROBOT_FRAME_HEIGHT / 2);
      this.playerGlow.setVisible(true);
    }
    if (this.playerShadow) {
      this.playerShadow.setPosition(player.x, this.world.groundY + 6);
      this.playerShadow.setVisible(true);
    }

    /*
     * Camera last: it must read the position physics has just resolved, or the
     * view trails the jump by one frame. `dtSeconds` is the same elapsed time the
     * movement integration used, so look-ahead eases at a real rate.
     */
    this.updateCamera(dtSeconds);
  }

  /**
   * Called by the React mirror when it opens or closes a panel.
   *
   * The panel is opened by pressing Enter over the canvas, but a visitor may also
   * activate a station from the DOM mirror with the keyboard. That path has to
   * tell the scene, or the canvas would keep accepting movement input while the
   * panel is covering the world.
   */
  setPanelOpen(open: boolean): void {
    this.panelOpen = open;
    if (open) {
      const body = this.player.body as Phaser.Physics.Arcade.Body | undefined;
      body?.setVelocity(0, 0);
      body?.setAccelerationX(0);
    }
  }

  /**
 * Re-tile the parallax layers when the viewport changes size.
 *
 * The layers are built as strips a whole number of viewport widths wide, because
 * that is what keeps them cheap. A resize that changes the viewport width would
 * otherwise leave a strip that no longer covers the screen, showing background
 * colour at one edge.
 *
 * Rebuilding is cheap relative to the alternative: the strip is a canvas copy of
 * an already-generated texture, not new art. The old layer is destroyed first so
 * repeated resizes cannot accumulate objects — the same discipline Phaser applies
 * to its own display list.
 */
private handleResize(gameSize: Phaser.Structs.Size): void {
    const world = this.world;
    if (gameSize.width <= 0) return;

    const reTile = (
      layer: Phaser.GameObjects.TileSprite | null,
      sourceKey: string,
      sourceHeight: number,
      scrollFactor: number,
      depth: number,
      alpha?: number,
    ) => {
      const stripWidth =
        Math.ceil(world.width / gameSize.width) * gameSize.width;
      layer?.destroy();
      const next = this.buildParallaxLayer(sourceKey, sourceHeight, scrollFactor, depth, stripWidth);
      if (next && alpha !== undefined) next.setAlpha(alpha);
      return next;
    };

    /* Layer heights are `groundY` (560), NOT `world.height` (900). */
    this.farLayer = reTile(
      this.farLayer,
      `neon-far-${world.id}-${world.width}x${world.groundY}`,
      world.groundY,
      this.reducedMotion ? 1 : 0.12,
      -30,
    );
    this.midSkyLayer = reTile(
      this.midSkyLayer,
      `neon-midsky-${world.id}-${world.width}x${world.groundY}`,
      world.groundY,
      this.reducedMotion ? 1 : 0.25,
      -28,
    );
    this.midLayer = reTile(
      this.midLayer,
      `neon-mid-${world.id}-${world.width}x${world.groundY}-v0`,
      world.groundY,
      this.reducedMotion ? 1 : 0.45,
      -20,
    );
    this.fgLayer = reTile(
      this.fgLayer,
      `neon-fg-${world.id}-${world.width}x${world.groundY}`,
      world.groundY,
      this.reducedMotion ? 1 : 0.7,
      -10,
    );

    /* Sky image — screen-fixed, resize display size.
     * Guarded on `.active`: a resize event can fire while the scene is being
     * torn down for a chapter swap, after Phaser has destroyed the display list
     * but before shutdown() removes this listener. Calling setTexture on that
     * dead image throws `Cannot read properties of undefined (reading 'sys')`
     * out of Phaser's Image.setTexture — the same trap documented at onArrive.
     */
    const cam = this.cameras.main;
    const skyKey = `neon-sky-${world.id}-${cam.width}x${cam.height}`;
    if (this.skyImage && this.skyImage.active && this.textures.exists(skyKey)) {
      this.skyImage.setTexture(skyKey);
      this.skyImage.setDisplaySize(cam.width, cam.height);
    }

    /* Re-derive zoom on resize. */
    cam.setZoom(this.zoomForViewport(cam.height));

    /* Travel overlay is screen-space, resize it too. */
    const vw = Math.ceil(cam.width);
    const vh = Math.ceil(cam.height);
    this.travelBand?.setSize(vw, vh);
    this.travelOverlay?.setSize(vw, vh);
  }

  /**
   * Explicit input teardown. Phaser removes scene game objects on shutdown, but
   * keyboard keys come from the shared keyboard plugin, so their listeners would
   * otherwise outlive the scene and fire against a destroyed player.
   */
  shutdown(): void {
    /*
     * Drop the diagnostic handle so a stale scene cannot be inspected after the
     * world has been torn down — a test reading a shut-down scene would see
     * objects that no longer exist and report them as missing art.
     */
    if ((window as unknown as { __worldScene?: unknown }).__worldScene === this) {
      delete (window as unknown as { __worldScene?: unknown }).__worldScene;
    }

    /*
     * Abort any travel — UNLESS this teardown is a chapter swap the transport
     * itself initiated, in which case the journey must survive and the scene is
     * about to be started again by the `position` phase.
     */
    if (!this.swappingChapter) {
      this.transport?.cancel();
    }

    // The scale event is a scene-owned subscription on the SHARED ScaleManager,
    // which outlives the scene, so it must be removed by hand. Phaser tears down
    // display objects automatically but not listeners like this one.
    this.scale.off('resize', this.handleResize, this);

    /*
     * NO `removeAllListeners()` ON KEYS AT ALL.
     *
     * This used to strip listeners from every movement key on shutdown. That
     * looked correct — shutdown should release handlers — but it is actively
     * harmful here, for a reason that only shows up during a chapter swap:
     *
     * In Phaser 4 a `Key` updates `isDown` inside its OWN `on('down')` handler.
     * `removeAllListeners()` therefore does not detach only gameplay callbacks, it
     * detaches the Key's state tracking, and the key can never register another
     * press.
     *
     * During the `build` phase the transport calls `scene.stop()` and
     * `scene.start()` to swap chapters, so this runs while the visitor is still
     * playing. The physical key they are holding does not generate a new
     * `keydown` — a human holding `d` across a transition keeps holding it — so
     * the freshly started scene's key never fires and `isDown` stays false.
     *
     * MEASURED, not inferred: walking right from START into SKILLS, `keyD` was
     * `true` at t=3.9s, went `false` at t=7.6s during phase `entering`, and the
     * player was pinned at x=144 from t=11.7s to t=26.8s with `intentVelocityX`
     * stuck at 0 while the physical key was still held. The player arrived
     * unable to walk.
     *
     * Nothing leaks by omitting this. Phaser's `KeyboardPlugin` removes its own
     * window listeners when the scene shuts down and re-registers them on the
     * next `create()`, so the Keys are already scoped to the scene lifecycle. The
     * explicit teardown was redundant when it was harmless and destructive once
     * chapter swapping made `shutdown()` run mid-gameplay.
     *
     * Enter and Escape had already been removed from this list for the same
     * reason — that earlier fix treated a symptom of the same root cause.
     */

    // Remove the diagnostics hook. Leaving it behind would let a stale scene
    // answer probes after the world is gone — the same leak class as a leftover
    // canvas, and the next mount would silently overwrite it anyway.
    if (typeof window !== 'undefined') {
      delete (window as unknown as { __worldProbe?: unknown }).__worldProbe;
      // The held-key tracker is a window listener, so it MUST be released here or
      // it leaks one pair of handlers per chapter swap.
      window.removeEventListener('keydown', this.trackHeldDown);
      window.removeEventListener('keyup', this.trackHeldUp);
      window.removeEventListener('blur', this.clearHeldOnBlur);
    }

    this.stations = [];
    this.pipeSkins.clear();
    this.focused = null;
    this.armedPipe = null;
    this.panelOpen = false;
    this.playerLocked = false;
    this.jumpPressedAt = -Infinity;
    this.lastGroundedAt = -Infinity;
    this.intentVelocityX = 0;
  }
}
