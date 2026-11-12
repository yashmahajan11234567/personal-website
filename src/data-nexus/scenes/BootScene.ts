/**
 * Data Nexus — Boot Scene
 *
 * Loads the Starting Hub artwork layers:
 *   - the architectural plate (walls / floors, objects removed)
 *   - every segmented object sprite
 * then hands off to the Starting Hub scene.
 *
 * Artwork is authored by the reference-derived pipeline
 * (scripts/nexus/segment_reference.py -> build_plate.py -> emit_scene_data.py).
 *
 * The avatar texture is still generated procedurally as an explicitly-labelled
 * placeholder: no style-matched Data Nexus character sheet exists yet (see
 * DATA_NEXUS_PLAN/ART_STYLE_PROOF/ART_DIRECTION_REPORT.md section 5).
 */
import Phaser from 'phaser';
import { NEXUS_OBJECTS, PLATE_KEY } from '../data/objects.gen';
import { AVATAR_KEY } from '../data/avatar';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'boot', active: true });
  }

  preload(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Loading Data Nexus…', {
        fontSize: '20px',
        color: '#00d4ff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.load.setPath('/assets/nexus');

    // Architectural plate (walls + floors, props removed)
    this.load.image(PLATE_KEY, 'plate.png');

    // Object layer — one independent sprite per segmented region
    for (const obj of NEXUS_OBJECTS) {
      this.load.image(obj.key, `objects/${obj.key}.png`);
    }

    // Avatar, extracted from the reference (scripts/nexus/extract_avatar.py).
    // Fallback texture is generated in create() only if this fails to load.
    this.load.image(AVATAR_KEY, 'avatar/avatar.png');

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // eslint-disable-next-line no-console
      console.warn('[data-nexus] asset failed to load:', file.key);
    });
  }

  create(): void {
    // Only fall back to a generated stand-in if the extracted avatar is missing.
    if (!this.textures.exists(AVATAR_KEY)) {
      // eslint-disable-next-line no-console
      console.warn('[data-nexus] extracted avatar missing — using fallback placeholder');
      this.createAvatarPlaceholder();
    }

    this.registry.set('gameVersion', '2.2.0');
    this.registry.set('currentRoom', 'starting-hub');
    this.registry.set('avatarSource', 'reference-extracted');
    this.scene.start('starting-hub');
  }

  /** Fallback character texture, used ONLY when avatar.png failed to load. */
  private createAvatarPlaceholder(): void {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0x101018, 1);
    g.fillEllipse(32, 52, 34, 50);
    g.fillStyle(0x1a1a1a, 1);
    g.fillEllipse(32, 24, 50, 40);
    g.fillStyle(0x0d0d0d, 1);
    g.fillRect(13, 21, 38, 9);
    g.fillStyle(0x2b2b38, 1);
    g.fillRect(20, 44, 24, 22);
    g.fillStyle(0xc48e6e, 1);
    g.fillCircle(32, 46, 4);
    g.generateTexture('avatar', 64, 80);
    g.destroy();
  }
}
