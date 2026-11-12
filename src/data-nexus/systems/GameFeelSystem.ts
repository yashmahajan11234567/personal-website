/**
 * Data Nexus — Game Feel System
 * Screen shake (trauma model), hit-stop, eased tweens, number pop
 * Based on game-feel skill
 */
import Phaser from 'phaser';

export interface TraumaConfig {
  maxTrauma: number;
  decayRate: number; // per second
}

export const DEFAULT_TRAUMA_CONFIG: TraumaConfig = {
  maxTrauma: 1,
  decayRate: 3,
};

export class GameFeelSystem {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private trauma = 0;
  private hitStopTimer = 0;
  private config: TraumaConfig;

  constructor(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera, config?: Partial<TraumaConfig>) {
    this.scene = scene;
    this.camera = camera;
    this.config = { ...DEFAULT_TRAUMA_CONFIG, ...config };
  }

  update(delta: number): void {
    const dt = delta / 1000;

    // Decay trauma
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.config.decayRate * dt);
      this.applyShake();
    }

    // Hit stop
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= delta;
      if (this.hitStopTimer <= 0) {
        this.scene.physics.world.resume();
      }
    }
  }

  addTrauma(amount: number): void {
    this.trauma = Math.min(this.config.maxTrauma, this.trauma + amount);
    this.applyShake();
  }

  private applyShake(): void {
    const shake = this.trauma * this.trauma;
    const maxOffset = 15;
    const offsetX = (Math.random() - 0.5) * 2 * maxOffset * shake;
    const offsetY = (Math.random() - 0.5) * 2 * maxOffset * shake;

    this.camera.shakeEffect?.start(100, 0.01);
    // Alternative: manually set scroll offset
    this.camera.scrollX += offsetX;
    this.camera.scrollY += offsetY;
  }

  hitStop(duration: number): void {
    this.hitStopTimer = duration;
    this.scene.physics.world.pause();
  }

  easeTween(
    target: any,
    props: Record<string, number>,
    duration: number = 300,
    ease: string = 'Cubic.easeOut'
  ): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      ...props,
      duration,
      ease,
    });
  }

  numberPop(
    x: number,
    y: number,
    value: number | string,
    color: string = '#ffd600',
    fontSize: string = '24px'
  ): Phaser.GameObjects.Text {
    const text = this.scene.add.text(x, y, String(value), {
      fontSize,
      color,
      fontFamily: 'monospace',
      stroke: '#0b1d3a',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });

    return text;
  }

  screenFlash(color: number = 0xffffff, duration: number = 100): void {
    const flash = this.scene.add.rectangle(
      this.camera.centerX,
      this.camera.centerY,
      this.camera.width * 2,
      this.camera.height * 2,
      color
    );
    flash.setScrollFactor(0);
    flash.setDepth(1000);
    flash.setAlpha(0.5);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  reset(): void {
    this.trauma = 0;
    this.hitStopTimer = 0;
    this.camera.scrollX = this.camera.scrollX;
    this.camera.scrollY = this.camera.scrollY;
  }

  setReducedMotion(enabled: boolean): void {
    if (enabled) {
      this.config.decayRate = 999;
    }
  }
}