/**
 * Data Nexus — Starting Hub Scene
 *
 * Renders the reference-matched Starting Hub from independent artwork layers:
 *   1. the architectural plate (walls + floors, props removed)
 *   2. 70 object sprites, each placed at its measured reference position with
 *      its own render depth and its own collision body
 *
 * Gameplay systems (player controller, camera, game-feel, scene transitions)
 * are unchanged from the previous milestone — only the visual layer was
 * replaced, and the primitive-drawing code is gone.
 */
import Phaser from 'phaser';
import { REFERENCE_WIDTH, REFERENCE_HEIGHT, NEXUS_OBJECTS, PLATE_KEY } from '../data/objects.gen';
import type { NexusObject } from '../data/objects.gen';
import {
  AVATAR_KEY,
  AVATAR_TEXTURE_W,
  AVATAR_TEXTURE_H,
  AVATAR_SPAWN_X,
  AVATAR_SPAWN_Y,
  AVATAR_FOOTPRINT_W,
  AVATAR_FOOTPRINT_H,
} from '../data/avatar';
import { PlayerController } from '../systems/PlayerController';
import { GameFeelSystem } from '../systems/GameFeelSystem';
import { setupCamera } from '../config/camera';

const PLAYER_DEPTH = 40;
const PLAYER_SPEED = 260;

export class StartingHubScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerController!: PlayerController;
  private gameFeel!: GameFeelSystem;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private doorways!: Phaser.Physics.Arcade.StaticGroup;
  private prompt!: Phaser.GameObjects.Text;
  private isTransitioning = false;
  private entryDoor = 'south';

  constructor() {
    super({ key: 'starting-hub' });
  }

  init(data: { entryDoor?: string }): void {
    this.entryDoor = data.entryDoor ?? 'south';
    this.isTransitioning = false;
    this.registry.set('currentRoom', 'starting-hub');
  }

  create(): void {
    this.buildArtLayers();
    this.buildPlayer();
    this.buildCollision();

    this.cameras.main = setupCamera(this, this.player, REFERENCE_WIDTH, REFERENCE_HEIGHT);

    this.playerController = new PlayerController(this, this.player);
    this.gameFeel = new GameFeelSystem(this, this.cameras.main);

    this.buildPrompt();

    // click-to-test helper + probe hook
    (window as unknown as Record<string, unknown>).__nexusProbe = () => ({
      x: this.player.x,
      y: this.player.y,
      solids: this.solids.getLength(),
      objects: NEXUS_OBJECTS.length,
      zoom: this.cameras.main.zoom,
      scrollX: this.cameras.main.scrollX,
      scrollY: this.cameras.main.scrollY,
    });

    this.scale.on('resize', this.onResize, this);
  }

  // ---------------------------------------------------------------- artwork

  private buildArtLayers(): void {
    // 1. architectural plate, stretched to the reference frame
    this.add
      .image(0, 0, PLATE_KEY)
      .setOrigin(0, 0)
      .setDisplaySize(REFERENCE_WIDTH, REFERENCE_HEIGHT)
      .setDepth(0);

    // 2. object layer — one independent sprite per segmented region
    for (const obj of NEXUS_OBJECTS) {
      if (!this.textures.exists(obj.key)) continue;
      this.add.image(obj.x, obj.y, obj.key).setDepth(obj.depth);
    }
  }

  // ---------------------------------------------------------------- player

  private buildPlayer(): void {
    // Spawn on the reference avatar's own position unless entering from the north door.
    const spawn = this.entryDoor === 'north'
      ? { x: REFERENCE_WIDTH / 2, y: 300 }
      : { x: AVATAR_SPAWN_X, y: AVATAR_SPAWN_Y };

    this.player = this.physics.add
      .sprite(spawn.x, spawn.y, AVATAR_KEY)
      // bottom-centre origin: the sprite's position IS the character's feet
      .setOrigin(0.5, 1)
      .setDepth(PLAYER_DEPTH);

    // Collision is the FEET FOOTPRINT, not the whole 172px-tall artwork —
    // otherwise the body would occlude floor above the character.
    this.player
      .setSize(AVATAR_FOOTPRINT_W, AVATAR_FOOTPRINT_H)
      .setOffset(
        (AVATAR_TEXTURE_W - AVATAR_FOOTPRINT_W) / 2,
        AVATAR_TEXTURE_H - AVATAR_FOOTPRINT_H,
      );

    this.player.setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setMaxVelocity(PLAYER_SPEED);
  }

  // ---------------------------------------------------------------- collision

  private buildCollision(): void {
    this.solids = this.physics.add.staticGroup();
    this.doorways = this.physics.add.staticGroup();

    for (const obj of NEXUS_OBJECTS) {
      if (obj.collision === 'none') continue;
      this.addSolidBody(obj);
    }

    this.physics.world.setBounds(0, 0, REFERENCE_WIDTH, REFERENCE_HEIGHT);
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.doorways, this.onDoorway.bind(this));
  }

  private addSolidBody(obj: NexusObject): void {
    // Collision comes from the sprite's measured FOOTPRINT (obj.body), authored
    // separately from the artwork. A body never covers the empty floor above an
    // object, and never collapses to a sliver — see scripts/nexus/emit_scene_data.py.
    const b = obj.body;
    if (!b) return;

    const w = Math.max(8, b.w);
    const h = Math.max(8, b.h);

    if (obj.collision === 'circle') {
      const r = Math.max(6, Math.min(w, h) / 2);
      this.solids.add(this.add.circle(b.x, b.y, r));
    } else {
      this.solids.add(this.add.rectangle(b.x, b.y, w, h));
    }
  }

  private onDoorway(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.gameFeel.hitStop(60);
    this.showPrompt('Skills Tunnel — not built yet');
    this.time.delayedCall(700, () => {
      this.isTransitioning = false;
    });
  }

  // ---------------------------------------------------------------- prompt

  private buildPrompt(): void {
    this.prompt = this.add
      .text(0, 0, '', {
        fontSize: '16px',
        color: '#ffd600',
        fontFamily: 'monospace',
        backgroundColor: '#0b1d3a',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private showPrompt(text: string): void {
    this.prompt.setText(text);
    this.prompt
      .setPosition(this.scale.width / 2, this.scale.height - 60)
      .setVisible(true);
    this.time.delayedCall(1400, () => this.prompt.setVisible(false));
  }

  // ---------------------------------------------------------------- loop

  update(_time: number, delta: number): void {
    this.playerController.update();
    this.gameFeel.update(delta);
  }

  private onResize(): void {
    // camera bounds are fixed to the reference frame; nothing to recompute,
    // but keep the resize listener so the scene survives viewport changes.
    this.cameras.main.setBounds(0, 0, REFERENCE_WIDTH, REFERENCE_HEIGHT);
  }

  shutdown(): void {
    this.scale.off('resize', this.onResize, this);
    this.playerController?.destroy();
    this.gameFeel?.reset();
  }
}
