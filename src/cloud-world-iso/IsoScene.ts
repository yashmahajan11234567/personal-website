/**
 * IsoScene — the River Expedition world scene.
 * Layers: ground texture > water fx > placements (depth-sorted) > player/boat > highlights.
 * Modes: 'foot' | 'boat'. All gameplay in world metres; see iso.ts.
 */
import Phaser from 'phaser';
import {
  worldToScreen, screenToWorld, depthKey, normalizeIntent, directionIndex,
  WalkGrid, CELL_LAND,
} from './iso.ts';
import { ORIGIN_X, ORIGIN_Y, type WorldMapData, type Hotspot, type DockZone } from './worldMap.ts';
import { bus } from './bus.ts';

const ASSET = 'assets/iso';
const WALK_SPEED = 3.4;
const RUN_SPEED = 5.6;
const BOAT_SPEED = 6.5;

interface QAHook {
  fps: number; calls: number; mode: string; x: number; y: number; bx: number; by: number; cam: { x: number; y: number };
  errors: string[]; hotspots: any[]; docks: any[];
  lastWorld: { x: number; y: number } | null;
}

export class IsoScene extends Phaser.Scene {
  private map!: WorldMapData;
  private grid!: WalkGrid;
  private player!: Phaser.GameObjects.Sprite;
  private boat!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Image;
  private boatShadow!: Phaser.GameObjects.Image;
  private dynLayer!: Phaser.GameObjects.Container;
  private tooltipText!: Phaser.GameObjects.Text;
  private mode: 'foot' | 'boat' = 'foot';
  private px = 0; private py = 0; private bx = 0; private by = 0;
  private heading = 6; // DIR8 index
  private boatHeading = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private panelOpen = false;
  private nearHotspot: Hotspot | null = null;
  private waterfx!: Phaser.GameObjects.Image;
  private followTarget: { x: number; y: number } = { x: 0, y: 0 };
  private qa: QAHook = { fps: 0, calls: 0, mode: 'foot', x: 0, y: 0, bx: 0, by: 0, cam: { x: 0, y: 0 }, errors: [], hotspots: [], docks: [], lastWorld: null };
  private panelOpenGetter: () => boolean = () => false;
  private hotspotSprites = new Map<string, Phaser.GameObjects.Image>();

  constructor() {
    super('iso');
  }

  setPanelOpenGetter(g: () => boolean): void {
    this.panelOpenGetter = g;
  }

  qaHook(): QAHook {
    return this.qa;
  }

  preload(): void {
    this.load.json('map', `${ASSET}/map.json`);
    for (const a of ['shared', 'welcome', 'skills', 'projects']) {
      this.load.atlas(a, `${ASSET}/${a}.png`, `${ASSET}/${a}.json`);
    }
    this.load.atlas('character', `${ASSET}/character.png`, `${ASSET}/character.json`);
    this.load.atlas('boat', `${ASSET}/boat.png`, `${ASSET}/boat.json`);
    this.load.image('ground', `${ASSET}/ground.png`);
    this.load.image('waterfx', `${ASSET}/waterfx.png`);
  }

  create(): void {
    this.map = this.cache.json.get('map') as WorldMapData;
    this.grid = new WalkGrid(this.map.w, this.map.h, CELL_LAND);
    this.map.cells.forEach((c, i) => { this.grid.cells[i] = c; });

    // ground + animated foam
    this.add.image(0, 0, 'ground').setOrigin(0, 0).setDepth(-1000);
    this.waterfx = this.add.image(0, 0, 'waterfx').setOrigin(0, 0).setDepth(-999).setAlpha(0.5);

    this.buildAnims();

    // placements (buildings, props, signs, decor) — static, depth by x+y
    for (const p of this.map.placements) {
      const s = worldToScreen(p.x, p.y, 0, ORIGIN_X, ORIGIN_Y);
      const img = this.add.image(s.x, s.y, p.atlas, p.frame).setOrigin(0.5, 1);
      if (p.scale && p.scale !== 1) img.setScale(p.scale);
      img.setDepth(depthKey(p.x, p.y) * 10);
      if (p.hotspotId) this.hotspotSprites.set(p.hotspotId, img);
    }

    // shadows + actors
    this.playerShadow = this.add.image(0, 0, 'shared', 'shadow').setDepth(1);
    this.boatShadow = this.add.image(0, 0, 'shared', 'shadow_big').setDepth(1).setAlpha(0.8);
    this.dynLayer = this.add.container(0, 0);
    this.player = this.add.sprite(0, 0, 'character', 'idle_0_dir0').setOrigin(0.5, 1);
    this.boat = this.add.sprite(0, 0, 'boat', 'h0_f0').setOrigin(0.5, 0.55).setVisible(false);
    this.dynLayer.add([this.boatShadow, this.boat, this.playerShadow, this.player]);

    // tooltip for hotspots
    this.tooltipText = this.add.text(0, 0, '', {
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#fff',
      backgroundColor: 'rgba(10,16,32,0.85)', padding: { x: 8, y: 4 },
    }).setDepth(100001).setVisible(false);

    // actors at spawn
    this.px = this.map.spawn.x; this.py = this.map.spawn.y;
    this.bx = this.map.boatSpawn.x; this.by = this.map.boatSpawn.y;
    this.placeActors();

    // input
    this.cursors = this.input.keyboard!.createCursorKeys();
    for (const k of ['W', 'A', 'S', 'D', 'SHIFT']) this.keys[k] = this.input.keyboard!.addKey(k);
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'e' || event.key === 'E') this.onInteract();
      // QA teleport: digits 1-5 jump the player to hotspots by list order
      const n = Number(event.key);
      if (this.mode === 'foot' && Number.isInteger(n) && n >= 1 && n <= 5) {
        const h = this.map.hotspots[n - 1];
        if (h) { this.px = h.x; this.py = h.y; this.placeActors(); }
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));

    // camera
    const cam = this.cameras.main;
    cam.setBounds(-2000, -1200, 10000, 5000);
    this.resizeZoom();
    this.events.on('resize', () => this.resizeZoom());
    cam.startFollow(this.followTarget as never, true, 0.08, 0.08);
    cam.centerOn(worldToScreen(this.px, this.py, 0, ORIGIN_X, ORIGIN_Y).x, worldToScreen(this.px, this.py, 0, ORIGIN_X, ORIGIN_Y).y);

    this.qa.errors = [];
    this.qa.hotspots = this.map.hotspots;
    this.qa.docks = this.map.docks;
    (window as unknown as Record<string, unknown>).__iso = this.qaHook();
    (window as unknown as Record<string, unknown>).__isoErrors = this.qa.errors;
  }

  private resizeZoom(): void {
    const w = this.scale.width;
    const zoom = Phaser.Math.Clamp(w / 1150, 0.42, 1);
    this.cameras.main.setZoom(zoom);
  }

  private buildAnims(): void {
    const dirs = 8;
    const mk = (key: string, state: string, count: number, dir: number, rate: number) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: Array.from({ length: count }, (_, i) => ({ key: 'character', frame: `${state}_${i}_dir${dir}` })),
        frameRate: rate, repeat: -1,
      });
    };
    for (let d = 0; d < dirs; d++) {
      mk(`idle_dir${d}`, 'idle', 2, d, 3);
      mk(`walk_dir${d}`, 'walk', 6, d, 10);
      mk(`board_dir${d}`, 'board', 3, d, 8);
      mk(`steer_dir${d}`, 'steer', 2, d, 4);
      mk(`interact_dir${d}`, 'interact', 2, d, 6);
    }
    for (let h = 0; h < 4; h++) {
      if (!this.anims.exists(`boat_h${h}`)) {
        this.anims.create({
          key: `boat_h${h}`,
          frames: [0, 1, 2, 3].map((i) => ({ key: 'boat', frame: `h${h}_f${i}` })),
          frameRate: 4, repeat: -1,
        });
      }
    }
  }

  private placeActors(): void {
    const ps = worldToScreen(this.px, this.py, 0, ORIGIN_X, ORIGIN_Y);
    this.player.setPosition(ps.x, ps.y);
    this.playerShadow.setPosition(ps.x, ps.y + 2);
    const bs = worldToScreen(this.bx, this.by, 0, ORIGIN_X, ORIGIN_Y);
    this.boat.setPosition(bs.x, bs.y);
    this.boatShadow.setPosition(bs.x, bs.y + 18);
    this.player.setDepth(depthKey(this.px, this.py) * 10 + 5);
    this.boat.setDepth(depthKey(this.bx, this.by) * 10 + 4);
    this.followTarget.x = this.mode === 'boat' ? bs.x : ps.x;
    this.followTarget.y = this.mode === 'boat' ? bs.y : ps.y;
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    const w = screenToWorld(p.worldX, p.worldY, ORIGIN_X, ORIGIN_Y);
    let best: Hotspot | null = null;
    let bestD = 1e9;
    for (const h of this.map.hotspots) {
      const d = Math.hypot(h.x - w.x, h.y - w.y);
      if (d < h.r && d < bestD) { best = h; bestD = d; }
    }
    this.nearHotspot = best;
    this.qa.lastWorld = { x: w.x, y: w.y };
    if (best) {
      const s = worldToScreen(best.x, best.y, 2.5, ORIGIN_X, ORIGIN_Y);
      this.tooltipText.setText(best.label).setPosition(s.x, s.y - 70).setVisible(true);
      const spr = this.hotspotSprites.get(best.id);
      if (spr) spr.setTint(0xccffee);
      bus.emit({ kind: 'hover', id: best.id, label: best.label });
    } else {
      this.tooltipText.setVisible(false);
      for (const spr of this.hotspotSprites.values()) spr.clearTint();
      bus.emit({ kind: 'hover', id: null, label: null });
    }
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.panelOpenGetter()) return;
    const w = screenToWorld(p.worldX, p.worldY, ORIGIN_X, ORIGIN_Y);
    let best: Hotspot | null = null;
    let bestD = 1e9;
    for (const h of this.map.hotspots) {
      const d = Math.hypot(h.x - w.x, h.y - w.y);
      if (d < h.r && d < bestD) { best = h; bestD = d; }
    }
    this.nearHotspot = best;
    if (best) {
      bus.emit({ kind: 'activate', id: best.id, contentId: best.contentId, skills: best.skills, label: best.label });
      return;
    }
    if (this.mode === 'foot') {
      if (this.grid.walkableAt(w.x, w.y)) { this.px = w.x; this.py = w.y; } // tap-to-move (simple)
    }
  }

  private onInteract(): void {
    if (this.panelOpenGetter()) return;
    if (this.mode === 'foot') {
      const dBoat = Math.hypot(this.bx - this.px, this.by - this.py);
      if (dBoat < 4.5) { this.boardBoat(); return; }
      if (this.nearHotspot) bus.emit({ kind: 'activate', id: this.nearHotspot.id, contentId: this.nearHotspot.contentId, skills: this.nearHotspot.skills, label: this.nearHotspot.label });
    } else {
      const dock = this.currentDock();
      if (dock) this.disembark(dock);
    }
  }

  private currentDock(): DockZone | null {
    for (const d of this.map.docks) {
      if (this.bx >= d.x - d.w / 2 - 1 && this.bx <= d.x + d.w / 2 + 1 && this.by >= d.y - d.h / 2 - 1 && this.by <= d.y + d.h / 2 + 1) return d;
    }
    return null;
  }

  private boardBoat(): void {
    this.mode = 'boat';
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    this.boat.setVisible(true);
    bus.emit({ kind: 'prompt', text: null, key: null });
    this.placeActors();
  }

  private disembark(dock: DockZone): void {
    this.mode = 'foot';
    this.px = dock.pierX; this.py = dock.pierY;
    this.player.setVisible(true);
    this.playerShadow.setVisible(true);
    this.boat.setVisible(true);
    this.placeActors();
  }

  update(_time: number, delta: number): void {
    this.panelOpen = this.panelOpenGetter();
    const dt = delta / 1000;
    // water shimmer
    this.waterfx.setAlpha(0.35 + 0.25 * Math.sin(_time / 400));

    if (!this.panelOpen) this.handleMovement(dt);
    this.placeActors();

    // context prompt
    let prompt: string | null = null;
    if (!this.panelOpen) {
      if (this.mode === 'foot') {
        if (Math.hypot(this.bx - this.px, this.by - this.py) < 4.5) prompt = 'E — Board Boat';
        else if (this.nearHotspot) prompt = `E — ${this.nearHotspot.label}`;
      } else if (this.currentDock()) prompt = 'E — Disembark';
    }
    bus.emit({ kind: 'prompt', text: prompt, key: prompt ? 'E' : null });

    // qa
    this.qa.fps = Math.round(this.game.loop.actualFps);
    this.qa.calls = (this.renderer as unknown as { info: { render: { sprite: number } } }).info?.render?.sprite ?? 0;
    this.qa.mode = this.mode;
    this.qa.x = Math.round(this.mode === 'foot' ? this.px : this.bx);
    this.qa.y = Math.round(this.mode === 'foot' ? this.py : this.by);
    this.qa.bx = Math.round(this.bx); this.qa.by = Math.round(this.by);
    this.qa.hotspots = this.map.hotspots;
    this.qa.docks = this.map.docks;
    this.qa.cam = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
  }

  private handleMovement(dt: number): void {
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;
    const n = normalizeIntent(dx, dy);
    if (this.mode === 'foot') {
      if (dx === 0 && dy === 0) {
        this.player.anims.play(`idle_dir${this.heading}`, true);
        return;
      }
      const run = this.cursors.shift.isDown || this.keys.SHIFT.isDown;
      const sp = run ? RUN_SPEED : WALK_SPEED;
      const mv = this.grid.moveCircle(this.px, this.py, n.dx * sp * dt, n.dy * sp * dt, 0.35, false);
      this.px = mv.x; this.py = mv.y;
      this.heading = directionIndex(n.dx, n.dy);
      this.player.anims.play(`walk_dir${this.heading}`, true);
    } else {
      if (dx === 0 && dy === 0) {
        this.boat.anims.play(`boat_h${this.boatHeading}`, true);
        return;
      }
      const sp = BOAT_SPEED;
      const mv = this.grid.moveCircle(this.bx, this.by, n.dx * sp * dt, n.dy * sp * dt, 1.1, true);
      this.bx = mv.x; this.by = mv.y;
      this.heading = directionIndex(n.dx, n.dy);
      // map 8-dir heading to 4 boat frames
      this.boatHeading = [6, 5, 2, 3, 0, 7, 0, 1].indexOf(this.heading) >= 0 ? [6, 5, 2, 3, 0, 7, 0, 1].indexOf(this.heading) : 0;
      this.boatHeading = this.heading === 6 || this.heading === 7 ? 0 : this.heading === 5 || this.heading === 4 ? 1 : this.heading === 2 || this.heading === 3 ? 2 : 3;
      this.boat.anims.play(`boat_h${this.boatHeading}`, true);
    }
  }
}
