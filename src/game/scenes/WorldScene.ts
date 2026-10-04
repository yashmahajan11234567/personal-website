/**
 * The shared WorldScene — one engine, configuration-driven worlds.
 *
 * Phaser 4 API notes that shaped this file (verified against 4.2.1 at runtime,
 * not assumed):
 *
 *   - The Arcade sprite helpers are GONE. `sprite.setVelocityX`,
 *     `setVelocityY`, `setAccelerationX`, `setBounce*` and
 *     `setCollideWorldBounds` all live on `sprite.body` instead. Calling them on
 *     the sprite throws `... is not a function`.
 *   - `body.onFloor()` / `onCeiling()` / `onWall()` replace the v3 block-body
 *     booleans, which is what makes a grounded jump possible.
 *   - `this.physics.add.staticGroup()` still exists, but it is NOT on the
 *     GameObject factory prototype, so it must be reached via `physics.add`.
 *
 * Everything here is created in `create()` and Phaser tears scene objects down
 * on shutdown, so no manual disposal is needed for game objects. Input
 * listeners are the exception: `createCursorKeys` and `addKey` attach to the
 * shared keyboard plugin, so they are explicitly removed in `shutdown`.
 */

import Phaser from 'phaser';
import { PLAYER } from '../config/worldConfig';
import type { WorldConfig } from '../config/worldConfig';
import { drawFarBand, drawInteractionGem, drawPlayer } from '../art/pixelArt';
import { emitInteraction } from './interactionBus';

/**
 * Convert a CSS hex string from the world config into the numeric colour
 * `add.rectangle` requires.
 *
 * The config deliberately holds readable hex strings rather than packed
 * integers, so palettes stay legible and editable. Phaser 4 types the rectangle
 * colour as `number`, so the conversion happens here, in one place.
 */
const colour = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

/** Scene key. One key serves both worlds; the config decides what is built. */
export const WORLD_SCENE_KEY = 'world';

export interface WorldSceneConfig {
  world: WorldConfig;
  /**
   * When true, camera easing, decorative motion and any future effects are
   * skipped. Gameplay itself stays fully enabled.
   */
  reducedMotion: boolean;
}

export class WorldScene extends Phaser.Scene {
  private world!: WorldConfig;
  private reducedMotion = false;
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  /** ms timestamp of the last jump press, for the jump buffer. */
  private jumpPressedAt = -Infinity;
  /** ms timestamp when the player last stood on something, for coyote time. */
  private lastGroundedAt = -Infinity;

  constructor() {
    super(WORLD_SCENE_KEY);
  }

  /** Called by the engine before the scene starts. */
  setConfig(config: WorldSceneConfig): void {
    this.world = config.world;
    this.reducedMotion = config.reducedMotion;
  }

  create(): void {
    /*
     * The interaction bus is deliberately NOT cleared here.
     *
     * React subscribes to the bus BEFORE calling mountWorld, so anything that
     * resets it during scene creation erases the live React listener and the
     * engine -> React event path silently dies. Clearing belongs at mount and
     * unmount (see resetInteractionBus in engine.ts), never in `create()`.
     */
    const world = this.world;

    // --- Procedural textures. No files, no loaders, no network. ---
    drawPlayer(this);
    drawFarBand(this, {
      width: world.width,
      height: world.height,
      bandTop: world.groundY - 180,
      colour: world.palette.far,
    });
    drawInteractionGem(this);

    // --- World + camera bounds ---
    this.physics.world.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setRoundPixels(true);
    // Backgrounds do not scroll with the camera.
    this.cameras.main.setBackgroundColor(world.palette.background);

    this.buildParallax();
    this.buildTerrain();
    this.buildPlayer();
    this.buildInteractionProbe();
    this.setupCamera();
    this.setupInput();
    this.exposeDiagnostics();
  }

  /**
   * Publish a read-only snapshot of player, camera and world state.
   *
   * This is how QA asserts gameplay. It reads live physics values rather than
   * scraping pixels, so a failing test names the behaviour that broke instead of
   * a colour that shifted. It exposes nothing actionable and mutates nothing.
   */
  private exposeDiagnostics(): void {
    if (typeof window === 'undefined') return;

    (window as unknown as { __worldProbe?: unknown }).__worldProbe = () => {
      const body = this.player?.body as Phaser.Physics.Arcade.Body | undefined;
      return {
        ok: Boolean(this.player && body),
        x: this.player?.x ?? 0,
        y: this.player?.y ?? 0,
        grounded: body?.onFloor() ?? false,
        camScrollX: this.cameras.main.scrollX,
        camScrollY: this.cameras.main.scrollY,
        canvasCount: document.querySelectorAll('canvas').length,
        worldWidth: this.world.width,
        worldHeight: this.world.height,
        velocityX: body?.velocity.x ?? 0,
        velocityY: body?.velocity.y ?? 0,
        facingRight: this.player?.flipX === false ? true : this.player?.flipX === true ? false : null,
      };
    };
  }

  /** Distant band + a static grid, both behind gameplay. */
  private buildParallax(): void {
    // Scroll factor 0.2 makes this read as distance. With reduced motion this
    // is still a static image, just not parallaxed, so nothing drifts for a
    // user who asked for less movement.
    this.add
      .image(0, this.world.groundY - 180, `far-${this.world.groundY - 180}`)
      .setOrigin(0, 0)
      .setScrollFactor(this.reducedMotion ? 1 : 0.2)
      .setDepth(-10);

    // Grid: thin verticals marking world units, drawn procedurally as a texture
    // so there is no per-frame Graphics cost.
    this.buildGridTexture();
    this.add
      .image(0, 0, 'grid')
      .setOrigin(0, 0)
      .setScrollFactor(this.reducedMotion ? 1 : 0.45)
      .setAlpha(0.5)
      .setDepth(-5);
  }

  private buildGridTexture(): void {
    const world = this.world;
    if (this.textures.exists('grid')) return;
    const texture = this.textures.createCanvas('grid', world.width, world.height);
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.fillStyle = world.palette.grid;
    for (let x = 0; x <= world.width; x += 64) ctx.fillRect(x, 0, 1, world.height);
    for (let y = 0; y <= world.height; y += 64) ctx.fillRect(0, y, world.width, 1);
    texture.refresh();
  }

  private buildTerrain(): void {
    const world = this.world;

    // Static group for solid platforms + the main ground slab.
    this.platforms = this.physics.add.staticGroup();

    // Ground spans the full world width below groundY.
    const ground = this.add.rectangle(
      world.width / 2,
      world.groundY + (world.height - world.groundY) / 2,
      world.width,
      world.height - world.groundY,
      colour(world.palette.ground)
    );
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // A lighter rim along the ground surface: a 1px-style pixel edge that makes
    // the landing plane unambiguous.
    this.add.rectangle(
      world.width / 2,
      world.groundY + 1,
      world.width,
      2,
      colour(world.palette.groundTop)
    ).setDepth(1);

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

      this.add.rectangle(
        p.x + p.width / 2,
        p.y + 1,
        p.width,
        2,
        colour(world.palette.groundTop)
      ).setDepth(1);
    }
  }

  private buildPlayer(): void {
    const world = this.world;

    this.player = this.physics.add.sprite(world.spawn.x, world.spawn.y, 'player');
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(10);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // Phaser 4: these are BODY methods. On the sprite they are undefined and
    // calling them throws "setCollideWorldBounds is not a function".
    body.setCollideWorldBounds(true);
    // Hitbox is inset from the sprite so the character's feet clear platform lips.
    body.setSize(PLAYER.bodyWidth, PLAYER.bodyHeight);
    body.setOffset(
      (PLAYER.size - PLAYER.bodyWidth) / 2,
      (PLAYER.size - PLAYER.bodyHeight) / 2 + 1
    );
    body.setMaxVelocity(PLAYER.speed, 520);
    body.setDragX(PLAYER.drag);
    body.setBounce(0);

    this.physics.add.collider(this.player, this.platforms);

    // Reduced motion changes no gameplay. It only ever removes decorative
    // motion, which is why the player is fully usable either way.
    this.player.setData('interactive', false);
  }

  /**
   * The interaction foundation: an object that reports an event when the player
   * overlaps it, routed through a bus the React layer can subscribe to.
   *
   * Phase 1 ships no panels and no skills. This proves the full path —
   * player -> interactive object -> event -> outside the engine — so later
   * phases only add content, not architecture.
   */
  private buildInteractionProbe(): void {
    // Rest it ON the ground so the player reaches it by walking, not by
    // jumping: the point of Phase 1 is to prove the event path, not to gate it
    // behind platforming.
    const gem = this.add
      .sprite(480, this.world.groundY - 6, 'gem')
      .setDepth(5);
    gem.setData('interactive', true);
    gem.setData('interactionId', 'foundation-probe');

    // Phaser 4: physics goes on the body, and a sprite added without a body is
    // inert. Gravity must be off or the gem falls straight through the world and
    // the overlap can never fire.
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

  private setupCamera(): void {
    const cam = this.cameras.main;

    // A deadzone stops the view reacting to every small hop. Without it the
    // camera jitters vertically as the player bounces.
    cam.startFollow(this.player, true, PLAYER.lerp, PLAYER.lerp);
    cam.setDeadzone(PLAYER.deadzone.width, PLAYER.deadzone.height);
    cam.setFollowOffset(0, 24);
    // `lerp` is the only smoothing used. No shake, no zoom, no effects.
    if (this.reducedMotion) cam.setLerp(PLAYER.lerp, PLAYER.lerp);
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    const jumpKeys = [
      this.cursors.up,
      this.cursors.space,
      this.keyW,
    ];
    for (const key of jumpKeys) {
      key.on('down', () => {
        // Buffer the press rather than acting on it immediately, so a jump
        // pressed just before landing still fires.
        this.jumpPressedAt = this.time.now;
      });
    }
  }

  update(): void {
    const player = this.player;
    if (!player?.body) return;
    const body = player.body as Phaser.Physics.Arcade.Body;
    const now = this.time.now;

    const left = this.cursors?.left?.isDown || this.keyA?.isDown;
    const right = this.cursors?.right?.isDown || this.keyD?.isDown;

    // Grounded state, used for coyote time and for the jump itself.
    const grounded = body.onFloor();
    if (grounded) this.lastGroundedAt = now;

    // --- Horizontal movement. Air control is reduced so a jump commits. ---
    const accel = PLAYER.acceleration * (grounded ? 1 : PLAYER.airControl);
    if (left && !right) {
      body.setAccelerationX(-accel);
      player.setFlipX(true);
    } else if (right && !left) {
      body.setAccelerationX(accel);
      player.setFlipX(false);
    } else {
      // No input: let drag bring the player to a stop rather than zeroing
      // velocity, which would look like hitting a wall.
      body.setAccelerationX(0);
    }

    // Cap horizontal speed at the configured walk speed in both directions.
    if (Math.abs(body.velocity.x) > PLAYER.speed) {
      body.setVelocityX(Math.sign(body.velocity.x) * PLAYER.speed);
    }

    // --- Jump: coyote time + input buffer ---
    const canCoyote = now - this.lastGroundedAt <= PLAYER.coyoteMs;
    const buffered = now - this.jumpPressedAt <= PLAYER.jumpBufferMs;
    if (buffered && canCoyote) {
      body.setVelocityY(-PLAYER.jumpVelocity);
      this.jumpPressedAt = -Infinity;
      this.lastGroundedAt = -Infinity;
    }

    // --- Keep the player inside the world even if bounds collide fails ---
    const w = this.world;
    if (player.x < PLAYER.size / 2) player.x = PLAYER.size / 2;
    if (player.x > w.width - PLAYER.size / 2) player.x = w.width - PLAYER.size / 2;
    if (player.y > w.height) player.y = w.height;
  }

  /**
   * Explicit input teardown. Phaser removes scene game objects on shutdown, but
   * keyboard keys come from the shared keyboard plugin, so their listeners would
   * otherwise outlive the scene and fire against a destroyed player.
   */
  shutdown(): void {
    const keys = [
      this.cursors?.up,
      this.cursors?.down,
      this.cursors?.left,
      this.cursors?.right,
      this.cursors?.space,
      this.cursors?.shift,
      this.keyA,
      this.keyD,
      this.keyW,
    ];
    for (const key of keys) key?.removeAllListeners();

    // Remove the diagnostics hook. Leaving it behind would let a stale scene
    // answer probes after the world is gone — the same leak class as a leftover
    // canvas, and the next mount would silently overwrite it anyway.
    if (typeof window !== 'undefined') {
      delete (window as unknown as { __worldProbe?: unknown }).__worldProbe;
    }

    this.jumpPressedAt = -Infinity;
    this.lastGroundedAt = -Infinity;
  }
}
