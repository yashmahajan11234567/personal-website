/**
 * Data Nexus — Player Controller
 * WASD + Arrow keys, normalized diagonals, action-map architecture
 * Based on input-systems and phaser-arcade-physics skills
 */
import Phaser from 'phaser';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
  pause: boolean;
}

export interface ActionMap {
  move_up: string[];
  move_down: string[];
  move_left: string[];
  move_right: string[];
  interact: string[];
  pause: string[];
}

export const DEFAULT_ACTION_MAP: ActionMap = {
  move_up: ['W', 'ArrowUp'],
  move_down: ['S', 'ArrowDown'],
  move_left: ['A', 'ArrowLeft'],
  move_right: ['D', 'ArrowRight'],
  interact: ['E', 'Space'],
  pause: ['Escape'],
};

export class PlayerController {
  private scene: Phaser.Scene;
  private player: Phaser.GameObjects.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyMap: Record<string, Phaser.Input.Keyboard.Key>;
  private actionMap: ActionMap;
  private inputBuffer: Map<string, number> = new Map();
  private bufferTime = 120; // ms

  constructor(scene: Phaser.Scene, player: Phaser.GameObjects.Sprite, actionMap?: Partial<ActionMap>) {
    this.scene = scene;
    this.player = player;
    this.actionMap = { ...DEFAULT_ACTION_MAP, ...actionMap };

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keyMap = {};

    const kb = scene.input.keyboard!;
    this.keyMap.W = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyMap.A = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyMap.S = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyMap.D = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyMap.E = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyMap.Space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyMap.Escape = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    scene.game.canvas.addEventListener('keydown', this.onCanvasKeyDown);
  }

  private onCanvasKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      this.inputBuffer.set('interact', Date.now() + this.bufferTime);
    }
  };

  update(): InputState {
    const now = Date.now();
    const bufferedInteract = this.inputBuffer.get('interact');
    const interactPressed = !!(bufferedInteract && now < bufferedInteract);

    const up = !!this.cursors.up?.isDown || !!this.keyMap.W?.isDown;
    const down = !!this.cursors.down?.isDown || !!this.keyMap.S?.isDown;
    const left = !!this.cursors.left?.isDown || !!this.keyMap.A?.isDown;
    const right = !!this.cursors.right?.isDown || !!this.keyMap.D?.isDown;
    const interact = !!this.keyMap.E?.isDown || !!this.keyMap.Space?.isDown || interactPressed;
    const pause = !!this.keyMap.Escape?.isDown || !!this.cursors.space?.isDown;

    if (interactPressed) this.inputBuffer.delete('interact');

    this.applyMovement(up, down, left, right);

    return { up, down, left, right, interact, pause };
  }

  private applyMovement(up: boolean, down: boolean, left: boolean, right: boolean): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    const SPEED = 220;
    body.setVelocity(0);

    if (up) body.setVelocityY(-SPEED);
    if (down) body.setVelocityY(SPEED);
    if (left) body.setVelocityX(-SPEED);
    if (right) body.setVelocityX(SPEED);

    if (body.velocity.length() > 0) {
      body.velocity.normalize().scale(SPEED);
    }
  }

  getActionState(action: keyof ActionMap): boolean {
    const keys = this.actionMap[action];
    return keys.some(k => {
      const key = this.keyMap[k] || (this.cursors as any)[k.toLowerCase()];
      return !!key?.isDown;
    });
  }

  destroy(): void {
    this.scene.game.canvas.removeEventListener('keydown', this.onCanvasKeyDown);
  }
}