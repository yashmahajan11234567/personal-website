/**
 * Cloud World (iso) engine lifecycle — adapted from src/game/engine.ts.
 * Owns the single Phaser.Game instance; React talks to it only through bus.ts.
 */
import Phaser from 'phaser';
import { IsoScene } from './IsoScene.ts';
import { bus } from './bus.ts';

let game: Phaser.Game | null = null;
let panelOpen = false;

export function setPanelOpen(open: boolean): void {
  panelOpen = open;
}

export function mountIsoWorld(container: HTMLElement): () => void {
  if (game) {
    game.destroy(false);
    game = null;
  }
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: container,
    backgroundColor: '#0b1020',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { pixelArt: false, antialias: true },
    scene: [IsoScene],
    banner: false,
  };
  game = new Phaser.Game(config);
  const bindScene = (): void => {
    const scene = game!.scene.getScene('iso') as IsoScene | null;
    if (scene) scene.setPanelOpenGetter(() => panelOpen);
    else setTimeout(bindScene, 0);
  };
  bindScene();
  return () => {
    if (game) {
      game.destroy(false);
      game = null;
    }
    bus.emit({ kind: 'close' });
  };
}
