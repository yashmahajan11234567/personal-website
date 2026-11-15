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
  CEILING_FROM,
  CONTENT_BAND,
  chapterViaPipe,
  chapterWorld,
  pipeNearX,
} from '../config/worldConfig';
import type { ChapterId, ChapterWorld, WorldConfig, WorldPipe, WorldStation } from '../config/worldConfig';
import { drawFarBand, drawInteractionGem, drawPlayer } from '../art/pixelArt';
import {
  DATA_PALETTE,
  SUB_FLOOR_DEPTH,
  canvasTexture,
  drawCeiling,
  drawFarSkyline,
  drawMidground,
  drawSubFloor,
} from '../art/facilityArt';
import { drawSkillStation, drawProjectStation } from '../art/worldObjects';
import { registerPlayerTextures, PLAYER_FRAME_HEIGHT } from '../art/playerSprite';
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
const PLAYER_TEXTURE_PREFIX = 'player-hoodie';

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
}

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
  private midLayer: Phaser.GameObjects.TileSprite | null = null;
  private hazeLayer: Phaser.GameObjects.TileSprite | null = null;

  /** The 260px of ceiling structure the taller world added. See `buildEnvironment`. */
  private ceilingLayer: Phaser.GameObjects.TileSprite | null = null;
  /** The station currently within interaction range, if any. */
  private focused: WorldStation | null = null;
  /** True while a panel is open in React; blocks world input. */
  private panelOpen = false;

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
    this.reducedMotion = config.reducedMotion;
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
    // Phase 1's placeholder textures are still registered so any code path that
    // referenced them keeps working; the character now uses the 32x48 frames.
    drawPlayer(this);
    registerPlayerTextures(this, PLAYER_TEXTURE_PREFIX);
    drawInteractionGem(this);

    this.buildEnvironment();

    // --- World + camera bounds ---
    this.physics.world.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor(world.palette.background);

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
      this.cameras.main.centerOn(this.cameraTarget.x, world.groundY - 100);
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

      drawFarSkyline(this, {
        worldWidth: world.width,
        worldHeight: world.height,
        groundY: world.groundY,
      });
      drawMidground(this, {
        worldWidth: world.width,
        worldHeight: world.height,
        groundY: world.groundY,
      });
      // Phase 1's band, kept as a faint haze behind the midground so the two
      // implementations cannot disagree about where the ground line is.
      drawFarBand(this, {
        width: world.width,
        height: world.height,
        bandTop: world.groundY - 180,
        colour: world.palette.far,
      });

      /*
       * THE CEILING LAYER — what makes the 2x camera reveal rather than crop.
       *
       * The world grew from 640 to 900 tall specifically so that zooming in would
       * show structure instead of black. `drawCeiling` fills everything above the
       * old 640 ceiling with beams, cable trays, risers and plant lights. Without
       * it the upper half of a zoomed frame is void, which is the single thing
       * the visual direction forbids.
       *
       * It scrolls at 0.30: slower than the midground's 0.45 so it sits clearly
       * behind, and faster than the far layer's 0.15 so it still parallaxes.
       */
      drawCeiling(this, {
        worldWidth: world.width,
        worldHeight: world.height,
        groundY: world.groundY,
        ceilingFrom: CEILING_FROM,
      });

      /*
       * LAYER HEIGHT IS `groundY`, NOT `world.height` — and this is the fix for the
       * measured 27 -> 21 FPS regression.
       *
       * The world is 900 tall, but nothing is ever drawn or seen below the floor
       * line at y=560: the camera's vertical clamp never frames it. Sizing each
       * layer to `world.height` therefore allocated 340px of every 900px strip
       * that is either transparent or hidden behind the floor slab — 38% wasted
       * fill and wasted texture memory, paid every frame.
       *
       * The ceiling layer is the important case for correctness, not just speed:
       * its art lives in the band y=280..540, which is entirely ABOVE `groundY`,
       * so sizing it to `groundY` still contains all of it. Nothing visible is
       * lost by this change — the camera literally cannot reach the rows removed.
       */
      const layerHeight = world.groundY;
      this.farLayer = this.buildParallaxLayer(
        `facility-far-${world.width}-${world.groundY}`,
        layerHeight,
        this.reducedMotion ? 1 : 0.15,
        -30
      );
      this.midLayer = this.buildParallaxLayer(
        `facility-mid-${world.width}-${world.groundY}`,
        layerHeight,
        this.reducedMotion ? 1 : 0.45,
        -20
      );
      this.ceilingLayer = this.buildParallaxLayer(
        `facility-ceiling-${world.width}-${CEILING_FROM}-${world.groundY}`,
        layerHeight,
        this.reducedMotion ? 1 : 0.3,
        -25
      );
      this.hazeLayer = this.buildParallaxLayer(
        `far-${world.groundY - 180}`,
        180,
        this.reducedMotion ? 1 : 0.2,
        -15
      );
      this.hazeLayer?.setAlpha(0.55);

      /*
       * Depth separation, enforced rather than hoped for.
       *
       * With the world now 900 tall and the camera zoomed to 2x, all three layers
       * can be on screen at once and the frame flattens into grey mush unless
       * their VALUES are pushed apart. Measured intent, brightest to darkest:
       *   far      ~#0c111a  near-black silhouettes, distant lit windows
       *   ceiling  ~#0c111a  dim structure above, lit only by its own plant lights
       *   mid      ~#1a2230 with #6e7f96 rims — the only layer with bright metal
       *   near     the floor and everything interactive, fully lit
       *
       * The ceiling is dimmed a further 15% on top of its already-dark palette so
       * it never competes with the midground runs it hangs behind.
       */
      this.ceilingLayer?.setAlpha(0.85);

      /*
       * The grid is drawn procedurally and is mostly transparent, but it was a
       * FULL-WORLD Image in Phase 1. It is dropped from the render entirely and
       * its role — marking world units and giving the midground scale — is now
       * carried by the conduit runs and gantry lattice that are already part of the
       * midground art. A world-unit grid was also the most "debug overlay"-looking
       * element in the frame, so this is an improvement as well as a saving.
       */
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
     */
    const subFloorDepth = Math.min(SUB_FLOOR_DEPTH, world.height - world.groundY);

    drawSubFloor(this, subFloorDepth);

    /*
     * `add.image` + `physics.add.existing(..., true)`, NOT `physics.add.staticImage`.
     *
     * `staticImage` was tried first and it broke collision: the player fell straight
     * through the floor and came to rest at y=900, the bottom of the world, which
     * put the sprite 660px below the bottom of the frame — invisible. The texture is
     * a single 64px tileable bay, so the sprite must be scaled to 3840px wide, and
     * a scaled `staticImage` body does not line up with the scaled sprite.
     *
     * The explicit `existing` form sizes the body in unscaled world units, so the
     * collision surface is exactly the drawn slab regardless of display scale. This
     * is the same pattern the Phase 1 rectangles below use, which is why they work.
     */
    const ground = this.add.image(
      world.width / 2,
      world.groundY + subFloorDepth / 2,
      `data-subfloor-${subFloorDepth}`
    );
    ground.setDisplaySize(world.width, subFloorDepth);
    this.physics.add.existing(ground, true);
    (ground.body as Phaser.Physics.Arcade.Body).setSize(world.width, subFloorDepth);
    (ground.body as Phaser.Physics.Arcade.Body).setOffset(0, 0);
    this.platforms.add(ground);

    // A lighter rim along the ground surface: a pixel edge that makes the landing
    // plane unambiguous at a glance.
    this.add
      .rectangle(world.width / 2, world.groundY + 1, world.width, 2, colour(world.palette.groundTop))
      .setDepth(1);

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

      this.add.rectangle(p.x + p.width / 2, p.y + 1, p.width, 2, colour(world.palette.groundTop)).setDepth(1);
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
      (PLAYER_FRAME_HEIGHT - PLAYER.bodyWidth) / 2,
      PLAYER_FRAME_HEIGHT - PLAYER.bodyHeight
    );
    body.setMaxVelocity(PLAYER.speed, 520);
    body.setDragX(PLAYER.drag);
    body.setBounce(0);

    this.physics.add.collider(this.player, this.platforms);

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
      const idleKey = `${keyBase}-idle`;
      const litKey = `${keyBase}-lit`;

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

      this.stations.push({ station, idleKey, litKey, sprite, lit: false });
    }

    /*
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
     */
    const labelKey = chapterLabelTexture(this, world.chapter, this.chapterLabel);
    this.add
      .image(40, this.world.groundY - PLAYER_FRAME_HEIGHT - 46, labelKey)
      .setOrigin(0, 0.5)
      .setDepth(5);
  }

  /** Build each configured pipe and its skin. */
  private buildPipes(): void {
    for (const pipe of this.world.pipes) {
      const built = createDataPipeSkin(this, pipe, this.reducedMotion);
      this.pipeSkins.set(pipe.id, built);
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
          // Shrink to 45% at full depth, and slide down into the mouth.
          const scale = sinking ? 1 - t * 0.55 : 0.45 + t * 0.55;
          // While entering, drop below the ground line so the pipe lip covers them.
          const offset = sinking ? t * PLAYER_FRAME_HEIGHT * 0.42 : -(1 - t) * PLAYER_FRAME_HEIGHT * 0.42;

          this.player.setTexture(
            `${PLAYER_TEXTURE_PREFIX}-${sinking ? 'tubeEnter' : 'tubeExit'}`,
          );
          this.player.setScale(scale);
          this.player.setPosition(x, y + offset);
          this.player.setDepth(sinking ? 2 : 10);
          // Physics is already locked; keep the body pinned so nothing drifts.
          const body = this.player.body as Phaser.Physics.Arcade.Body;
          body.reset(x, y + offset);
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
          if (this.cameraTarget) {
            cam.centerOn(this.cameraTarget.x, world.groundY - 100);
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
          // Snap the camera to the player rather than letting it lerp in from the
          // previous chapter's position.
          this.cameras.main.centerOn(this.player.x, this.player.y - 100);
          this.cameras.main.startFollow(this.player, true, 1, 1);

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
          const entryId = world.entryPipe.id;

          for (const [id, built] of this.pipeSkins) {
            built.mouth.setVisible(id === entryId);
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
     * Vertical: the view may look UP into the new ceiling structure freely, but
     * must not scroll DOWN past the floor line, or the frame fills with the ground
     * slab. `floorMargin` allows a little of the sub-floor as a base.
     */
    const maxScrollX = Math.max(0, world.width - viewW);
    const maxScrollY = Math.max(0, world.groundY + CAMERA.floorMargin - viewH);

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
    const moving = Math.abs(body.velocity.x) > 8;
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
    const frame = Math.floor(this.time.now / 110) % 4;
    this.setAnimationFrame(['walkA', 'walkB', 'walkC', 'walkD'][frame] ?? 'walkA');
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
       */
      this.lastFrameAt = now;
      this.updateAnimation();
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

    /*
     * Layer heights are `groundY` (560), NOT `world.height` (900).
     *
     * This block previously passed `world.height` here while `buildEnvironment`
     * passed `world.groundY`. Because `handleResize` fires immediately after
     * `create`, the resize path was the one that actually applied — so the strips
     * ended up 900 tall, restoring the exact waste the `buildEnvironment` fix had
     * just removed. The live scene confirmed it: three TileSprites of h=900 where
     * 560 was intended, and 340 rows of each were opaque sub-floor fill sitting
     * over the transparent ceiling layer.
     *
     * The two call sites now agree, and the comment states why, because a
     * disagreement between them is silent: nothing errors, the world just gets
     * slow and flat again.
     */
    this.farLayer = reTile(
      this.farLayer,
      `facility-far-${world.width}-${world.groundY}`,
      world.groundY,
      this.reducedMotion ? 1 : 0.15,
      -30
    );
    this.midLayer = reTile(
      this.midLayer,
      `facility-mid-${world.width}-${world.groundY}`,
      world.groundY,
      this.reducedMotion ? 1 : 0.45,
      -20
    );
    this.ceilingLayer = reTile(
      this.ceilingLayer,
      `facility-ceiling-${world.width}-${CEILING_FROM}-${world.groundY}`,
      world.groundY,
      this.reducedMotion ? 1 : 0.3,
      -25,
      0.85
    );
    this.hazeLayer = reTile(
      this.hazeLayer,
      `far-${world.groundY - 180}`,
      180,
      this.reducedMotion ? 1 : 0.2,
      -15,
      0.55
    );

    const cam = this.cameras.main;

    /*
     * Re-derive the zoom on resize. A window shortened by dragging (or a phone
     * rotating) reduces the view height; without this the zoom would stay at the
     * value chosen for the old, taller window and crop the content band.
     */
    cam.setZoom(this.zoomForViewport(cam.height));

    /*
     * The travel overlay is screen-space, so on resize it must be resized too or it
     * would stop covering the viewport and the teleport at the midpoint of a pipe
     * travel would become visible.
     */
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
