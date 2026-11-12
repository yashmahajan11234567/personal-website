/**
 * Data Nexus — Room Scene.
 *
 * A SINGLE Phaser Scene class that renders ANY room from ROOMS data.
 * - Starting Hub (plate=true) draws the reference plate + NEXUS_OBJECTS layer
 * - Other rooms render procedurally from the locked palette + reused sprites
 *
 * Handles: collision, doors (transitions), interactables (panels), camera,
 * game-feel, input, panel events, and the probe hook for QA.
 */
import Phaser from 'phaser';
import { ROOM_BY_KEY, type RoomDef, type RoomInteractable, WALL_THICK, type RoomObjectSpec } from '../data/rooms';
import { REFERENCE_WIDTH, REFERENCE_HEIGHT, NEXUS_OBJECTS, PLATE_KEY, type NexusObject } from '../data/objects.gen';
import {
  AVATAR_KEY,
  AVATAR_TEXTURE_W,
  AVATAR_TEXTURE_H,
  AVATAR_FOOTPRINT_W,
  AVATAR_FOOTPRINT_H,
} from '../data/avatar';
import { PlayerController, DEFAULT_ACTION_MAP } from '../systems/PlayerController';
import { GameFeelSystem } from '../systems/GameFeelSystem';
import { setupCamera } from '../config/camera';
import { resolvePanel } from '../data/panels';

const PLAYER_DEPTH = 40;
const PLAYER_SPEED = 220;

interface RoomSceneData {
  entryDoor?: string;
}

export class RoomScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerController!: PlayerController;
  private gameFeel!: GameFeelSystem;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private doorways!: Phaser.Physics.Arcade.StaticGroup;
  private interactBodies!: Phaser.Physics.Arcade.StaticGroup;
  private prompt!: Phaser.GameObjects.Text;
  private currentRoom!: RoomDef;
  private entryDoor = 'south';
  private isTransitioning = false;
  private panelOpen = false;
  private interactables: RoomInteractable[] = [];

  constructor() {
    super({ key: 'room' });
  }

  init(data: RoomSceneData): void {
    this.entryDoor = data.entryDoor ?? 'south';
    this.isTransitioning = false;
    this.panelOpen = false;
  }

  preload(): void {
    // All assets are preloaded by BootScene; nothing here.
  }

  create(): void {
    this.currentRoom = ROOM_BY_KEY[this.registry.get('currentRoom') ?? 'starting-hub'];
    this.registry.set('currentRoom', this.currentRoom.key);

    this.buildArtLayers();
    this.buildPlayer();
    this.buildCollision();
    this.buildInteractables();

    this.cameras.main = setupCamera(this, this.player, this.currentRoom.width, this.currentRoom.height);

    this.playerController = new PlayerController(this, this.player, DEFAULT_ACTION_MAP);
    this.gameFeel = new GameFeelSystem(this, this.cameras.main);

    this.buildPrompt();

    // QA probe
    (window as unknown as Record<string, unknown>).__nexusProbe = () => ({
      room: this.currentRoom.key,
      x: this.player.x,
      y: this.player.y,
      solids: this.solids.getLength(),
      doors: this.doorways.getLength(),
      interactables: this.interactables.length,
      zoom: this.cameras.main.zoom,
      scrollX: this.cameras.main.scrollX,
      scrollY: this.cameras.main.scrollY,
    });

    this.scale.on('resize', this.onResize, this);
  }

  // ------------------------------------------------------------------ artwork

  private buildArtLayers(): void {
    if (this.currentRoom.plate) {
      // Starting Hub: reference plate + segmented object layer
      this.add
        .image(0, 0, PLATE_KEY)
        .setOrigin(0, 0)
        .setDisplaySize(REFERENCE_WIDTH, REFERENCE_HEIGHT)
        .setDepth(0);

      for (const obj of NEXUS_OBJECTS) {
        if (!this.textures.exists(obj.key)) continue;
        this.add.image(obj.x, obj.y, obj.key).setDepth(obj.depth);
      }
    } else {
      // Procedural room: palette background + object sprites
      this.add
        .rectangle(
          this.currentRoom.width / 2,
          this.currentRoom.height / 2,
          this.currentRoom.width,
          this.currentRoom.height,
          this.currentRoom.floor === 'metal' ? 0x1a3a5c : 0xc48e6e,
        )
        .setDepth(0);

      // Red structural borders
      const W = this.currentRoom.width;
      const H = this.currentRoom.height;
      const borderColor = 0xe03e3e;
      this.add.rectangle(W / 2, WALL_THICK / 2, W, WALL_THICK, borderColor).setDepth(1);
      this.add.rectangle(W / 2, H - WALL_THICK / 2, W, WALL_THICK, borderColor).setDepth(1);
      this.add.rectangle(WALL_THICK / 2, H / 2, WALL_THICK, H, borderColor).setDepth(1);
      this.add.rectangle(W - WALL_THICK / 2, H / 2, WALL_THICK, H, borderColor).setDepth(1);

      // Objects
      for (const obj of this.currentRoom.objects ?? []) {
        if (!this.textures.exists(obj.key)) continue;
        const spr = this.add.image(obj.x, obj.y, obj.key).setDepth(obj.depth ?? 20);
        if (obj.scale) spr.setScale(obj.scale);
      }
    }
  }

  // ------------------------------------------------------------------ player

  private buildPlayer(): void {
    const spawn = this.currentRoom.entrySpawns?.[this.entryDoor] ?? this.currentRoom.spawn;

    this.player = this.physics.add
      .sprite(spawn.x, spawn.y, AVATAR_KEY)
      .setOrigin(0.5, 1)
      .setDepth(PLAYER_DEPTH);

    this.player
      .setSize(AVATAR_FOOTPRINT_W, AVATAR_FOOTPRINT_H)
      .setOffset(
        (AVATAR_TEXTURE_W - AVATAR_FOOTPRINT_W) / 2,
        AVATAR_TEXTURE_H - AVATAR_FOOTPRINT_H,
      );

    this.player.setCollideWorldBounds(true);
    (this.player.body as Phaser.Physics.Arcade.Body).setMaxVelocity(PLAYER_SPEED);
  }

  // ------------------------------------------------------------------ collision

  private buildCollision(): void {
    this.solids = this.physics.add.staticGroup();
    this.doorways = this.physics.add.staticGroup();

    if (this.currentRoom.plate) {
      // Starting Hub: collision from NEXUS_OBJECTS body footprints
      for (const obj of NEXUS_OBJECTS) {
        if (obj.collision === 'none' || !obj.body) continue;
        this.addSolidFromNexus(obj);
      }
    } else {
      // Procedural rooms: walls + object bodies
      this.addWallSolids();
      for (const obj of this.currentRoom.objects ?? []) {
        if (!obj.body || obj.body === 'none') continue;
        this.addSolidFromSpec(obj);
      }
    }

    // Doorway overlap triggers (openings in walls)
    for (const door of this.currentRoom.doors) {
      const { x, y, w, h } = this.doorBounds(door);
      const d = this.add.rectangle(x, y, w, h);
      d.setData('door', door);
      this.doorways.add(d);
    }

    this.physics.world.setBounds(0, 0, this.currentRoom.width, this.currentRoom.height);
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.doorways, this.onDoorway.bind(this));
  }

  private addWallSolids(): void {
    const W = this.currentRoom.width;
    const H = this.currentRoom.height;
    const T = WALL_THICK;

    // Four wall rects with doorway cutouts subtracted at door time
    const doorsBySide = this.groupDoorsBySide();

    // North wall
    for (const door of doorsBySide.north ?? []) {
      const { x, w } = this.doorBounds(door);
      const left = x - w / 2;
      const right = x + w / 2;
      // Left segment
      if (left > T) this.solids.add(this.add.rectangle(left / 2, T / 2, left - T, T));
      // Right segment
      if (right < W - T) this.solids.add(this.add.rectangle((W + right) / 2, T / 2, W - T - right, T));
    }
    if (!doorsBySide.north) this.solids.add(this.add.rectangle(W / 2, T / 2, W, T));

    // South wall
    for (const door of doorsBySide.south ?? []) {
      const { x, w } = this.doorBounds(door);
      const left = x - w / 2;
      const right = x + w / 2;
      if (left > T) this.solids.add(this.add.rectangle(left / 2, H - T / 2, left - T, T));
      if (right < W - T) this.solids.add(this.add.rectangle((W + right) / 2, H - T / 2, W - T - right, T));
    }
    if (!doorsBySide.south) this.solids.add(this.add.rectangle(W / 2, H - T / 2, W, T));

    // West wall
    for (const door of doorsBySide.west ?? []) {
      const { y, h } = this.doorBounds(door);
      const top = y - h / 2;
      const bot = y + h / 2;
      if (top > T) this.solids.add(this.add.rectangle(T / 2, top / 2, T, top - T));
      if (bot < H - T) this.solids.add(this.add.rectangle(T / 2, (H + bot) / 2, T, H - T - bot));
    }
    if (!doorsBySide.west) this.solids.add(this.add.rectangle(T / 2, H / 2, T, H));

    // East wall
    for (const door of doorsBySide.east ?? []) {
      const { y, h } = this.doorBounds(door);
      const top = y - h / 2;
      const bot = y + h / 2;
      if (top > T) this.solids.add(this.add.rectangle(W - T / 2, top / 2, T, top - T));
      if (bot < H - T) this.solids.add(this.add.rectangle(W - T / 2, (H + bot) / 2, T, H - T - bot));
    }
    if (!doorsBySide.east) this.solids.add(this.add.rectangle(W - T / 2, H / 2, T, H));
  }

  private groupDoorsBySide(): Record<string, typeof this.currentRoom.doors> {
    const out: Record<string, typeof this.currentRoom.doors> = {};
    for (const d of this.currentRoom.doors) {
      (out[d.side] ??= []).push(d);
    }
    return out;
  }

  private doorBounds(door: typeof this.currentRoom.doors[0]): { x: number; y: number; w: number; h: number } {
    const W = this.currentRoom.width;
    const H = this.currentRoom.height;
    const T = WALL_THICK;
    switch (door.side) {
      case 'north':
        return { x: door.offset, y: T / 2, w: door.size, h: T };
      case 'south':
        return { x: door.offset, y: H - T / 2, w: door.size, h: T };
      case 'west':
        return { x: T / 2, y: door.offset, w: T, h: door.size };
      case 'east':
        return { x: W - T / 2, y: door.offset, w: T, h: door.size };
    }
  }

  private addSolidFromNexus(obj: NexusObject): void {
    const b = obj.body!;
    if (obj.collision === 'circle') {
      const r = Math.max(6, Math.min(b.w, b.h) / 2);
      this.solids.add(this.add.circle(b.x, b.y, r));
    } else {
      this.solids.add(this.add.rectangle(b.x, b.y, Math.max(8, b.w), Math.max(8, b.h)));
    }
  }

  private addSolidFromSpec(obj: RoomObjectSpec): void {
    const b = obj.body;
    if (!b || b === 'none') return;
    if (b === 'circle') {
      this.solids.add(this.add.circle(obj.x, obj.y, Math.min(obj.w ?? 40, obj.h ?? 40) / 2));
    } else {
      const w = Math.max(8, b.w);
      const h = Math.max(8, b.h);
      const dy = b.dy ?? 0;
      this.solids.add(this.add.rectangle(obj.x, obj.y + dy, w, h));
    }
  }

  // ------------------------------------------------------------------ interactables

  private buildInteractables(): void {
    this.interactables = this.currentRoom.interactables ?? [];
    this.interactBodies = this.physics.add.staticGroup();

    for (const ia of this.interactables) {
      const b = this.add.rectangle(ia.x, ia.y, ia.w, ia.h);
      b.setData('interactable', ia);
      this.interactBodies.add(b);
    }

    this.physics.add.overlap(this.player, this.interactBodies, this.onInteractOverlap.bind(this));
  }

  private onInteractOverlap(_player: any, obj: any): void {
    if (this.panelOpen) return;
    const ia = obj.getData('interactable') as RoomInteractable;
    if (!ia) return;
    this.showPrompt(`[E] ${ia.label}`);
  }

  private onDoorway(_player: any, obj: any): void {
    if (this.isTransitioning || this.panelOpen) return;
    const door = obj.getData('door');
    if (!door) return;
    this.transitionTo(door);
  }

  private transitionTo(door: typeof this.currentRoom.doors[0]): void {
    this.isTransitioning = true;
    this.gameFeel.hitStop(60);
    this.showPrompt(`Entering ${door.label}…`);

    this.time.delayedCall(500, () => {
      this.scene.start('room', { entryDoor: door.entry });
      this.registry.set('currentRoom', door.target);
    });
  }

  // ------------------------------------------------------------------ prompt

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

  // ------------------------------------------------------------------ input / panel

  update(_time: number, delta: number): void {
    const input = this.playerController.update();
    this.gameFeel.update(delta);

    if (input.interact && !this.panelOpen && !this.isTransitioning) {
      this.tryOpenPanel();
    }
  }

  private tryOpenPanel(): void {
    // Find nearest interactable within range
    let best: RoomInteractable | null = null;
    let bestDist = Infinity;
    const range = 80;

    for (const ia of this.interactables) {
      const dx = this.player.x - ia.x;
      const dy = this.player.y - ia.y;
      const dist = Math.hypot(dx, dy);
      if (dist < range && dist < bestDist) {
        bestDist = dist;
        best = ia;
      }
    }

    if (best) {
      this.openPanel(best);
      return;
    }
  }

  private openPanel(ia: RoomInteractable): void {
    this.panelOpen = true;
    this.player.setVelocity(0);
    this.events.emit('open-panel', resolvePanel(ia.panel));

    const onClose = () => {
      this.panelOpen = false;
      this.events.off('close-panel', onClose);
    };
    this.events.once('close-panel', onClose);
  }

  // ------------------------------------------------------------------ resize / shutdown

  private onResize(): void {
    this.cameras.main.setBounds(0, 0, this.currentRoom.width, this.currentRoom.height);
  }

  shutdown(): void {
    this.scale.off('resize', this.onResize, this);
    this.playerController?.destroy();
    this.gameFeel?.reset();
  }
}